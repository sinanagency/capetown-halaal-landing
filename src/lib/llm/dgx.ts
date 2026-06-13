// OpenAI-compatible client for the Zanii inference platform.
// Active-passive HA across two boxes:
//   PRIMARY  = Qwen3-VL-235B on DGX Node 01 (inference.zanii.agency)
//   FAILOVER = smaller model on T4 (inference-failover.zanii.agency)
// On primary error (connect refused / timeout / 5xx), the call retries against
// failover. Auth errors (4xx) do NOT trigger failover — that's a real bug.
// If both DGX endpoints fail, the caller (festival-brain.ts and friends) falls
// through to Anthropic Haiku. Three tiers, service stays up.
//
// Same endpoint serves CTH festival bot, Jensen concierge, Sasa, and any
// future agent — the system prompt is the caller's responsibility, dgx.ts
// just routes the OpenAI request.
//
// Env (primary):
//   DGX_ENDPOINT             https://inference.zanii.agency/v1
//   DGX_API_KEY              per-consumer bearer
//   DGX_MODEL_NAME           e.g. qwen3-vl-235b
//
// Env (failover, optional):
//   DGX_FAILOVER_ENDPOINT    https://inference-failover.zanii.agency/v1
//   DGX_FAILOVER_API_KEY     per-consumer bearer
//   DGX_FAILOVER_MODEL_NAME  e.g. qwen2.5-7b-instruct
//
// Env (shared):
//   DGX_TIMEOUT_MS           request timeout (defaults to 25000)

export class DgxNotConfigured extends Error {
  constructor() { super('DGX not configured (no DGX_ENDPOINT or DGX_FAILOVER_ENDPOINT)') }
}

export class DgxRequestError extends Error {
  status: number | undefined
  endpoint: string | undefined
  constructor(message: string, status?: number, endpoint?: string) {
    super(message); this.status = status; this.endpoint = endpoint
  }
}

export interface DgxMessage { role: 'system' | 'user' | 'assistant'; content: string }

export interface DgxOptions {
  maxTokens?: number
  temperature?: number
  stop?: string[]
}

interface DgxTier { name: 'primary' | 'failover'; endpoint: string; apiKey: string; model: string }

function tiers(): DgxTier[] {
  const out: DgxTier[] = []
  if (process.env.DGX_ENDPOINT && process.env.DGX_API_KEY && process.env.DGX_MODEL_NAME) {
    out.push({
      name: 'primary',
      endpoint: process.env.DGX_ENDPOINT.replace(/\/$/, ''),
      apiKey: process.env.DGX_API_KEY,
      model: process.env.DGX_MODEL_NAME,
    })
  }
  if (process.env.DGX_FAILOVER_ENDPOINT && process.env.DGX_FAILOVER_API_KEY && process.env.DGX_FAILOVER_MODEL_NAME) {
    out.push({
      name: 'failover',
      endpoint: process.env.DGX_FAILOVER_ENDPOINT.replace(/\/$/, ''),
      apiKey: process.env.DGX_FAILOVER_API_KEY,
      model: process.env.DGX_FAILOVER_MODEL_NAME,
    })
  }
  return out
}

export function dgxConfigured(): boolean {
  return tiers().length > 0
}

async function askOne(tier: DgxTier, messages: DgxMessage[], opts: DgxOptions, timeoutMs: number): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${tier.endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tier.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: tier.model,
        messages,
        max_tokens: opts.maxTokens ?? 300,
        temperature: opts.temperature ?? 0.4,
        stop: opts.stop,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new DgxRequestError(`${tier.name} ${res.status}: ${body.slice(0, 200)}`, res.status, tier.name)
    }
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const text = data.choices?.[0]?.message?.content
    if (typeof text !== 'string') throw new DgxRequestError(`${tier.name} returned no text`, undefined, tier.name)
    return text
  } catch (e) {
    if ((e as { name?: string }).name === 'AbortError') {
      throw new DgxRequestError(`${tier.name} timeout after ${timeoutMs}ms`, undefined, tier.name)
    }
    if (e instanceof DgxRequestError) throw e
    throw new DgxRequestError(`${tier.name} network error: ${(e as Error).message}`, undefined, tier.name)
  } finally {
    clearTimeout(timer)
  }
}

// A 4xx that is not 408 (timeout) or 429 (rate-limited) is treated as a real
// config bug, not a substrate outage — don't cascade to failover.
function shouldFailover(err: unknown): boolean {
  if (!(err instanceof DgxRequestError)) return true // network / timeout
  const s = err.status
  if (s === undefined) return true // timeout / parse / network
  if (s === 408 || s === 429) return true
  if (s >= 500 && s < 600) return true
  return false
}

export async function askDgx(messages: DgxMessage[], opts: DgxOptions = {}): Promise<string> {
  const list = tiers()
  if (list.length === 0) throw new DgxNotConfigured()
  const timeoutMs = Number(process.env.DGX_TIMEOUT_MS) || 25_000
  let lastErr: unknown
  for (const tier of list) {
    try {
      return await askOne(tier, messages, opts, timeoutMs)
    } catch (e) {
      lastErr = e
      if (!shouldFailover(e)) throw e
      console.warn(`[dgx] ${tier.name} failed (${(e as Error).message}), trying next tier`)
    }
  }
  throw lastErr
}
