/**
 * Audit JSONB size cap helper.
 *
 * vendor_application_events.before_value / after_value are jsonb columns with
 * no server-side size cap. Skeptic C #8: an attacker (or a careless caller)
 * can stuff a multi-MB blob into these fields and inflate the audit table.
 *
 * capJsonbSize() walks the object and:
 *   - truncates string values longer than MAX_STRING_LEN to that length + ellipsis
 *   - drops keys whose serialized value exceeds MAX_KEY_BYTES
 *   - drops keys that are not plain JSON-serializable (functions, BigInt, etc.)
 *   - preserves null / boolean / number / array structure so the diff still
 *     reads as a diff
 *
 * This is best-effort. It NEVER throws. A failure inside the walker returns
 * the input unchanged so audit writes do not silently drop.
 */

const MAX_STRING_LEN = 500
const MAX_KEY_BYTES = 1024
const MAX_DEPTH = 6

function byteLen(s: string): number {
  // Cheap proxy for JSON byte length. UTF-8 is at most 4 bytes per code unit
  // but for ASCII (the common case in our audit payloads) this is exact.
  return s.length
}

function capValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return null
  if (value === null || value === undefined) return null

  const t = typeof value
  if (t === 'string') {
    const s = value as string
    if (s.length > MAX_STRING_LEN) return s.slice(0, MAX_STRING_LEN) + '...[truncated]'
    return s
  }
  if (t === 'number') {
    if (!Number.isFinite(value as number)) return null
    return value
  }
  if (t === 'boolean') return value

  if (Array.isArray(value)) {
    return (value as unknown[]).map((v) => capValue(v, depth + 1))
  }

  if (t === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const capped = capValue(v, depth + 1)
      // Drop keys whose serialized form exceeds the per-key cap.
      try {
        const serialized = JSON.stringify(capped)
        if (serialized && byteLen(serialized) > MAX_KEY_BYTES) {
          out[k] = '[dropped: exceeds 1KB]'
          continue
        }
      } catch {
        // not serializable, skip
        continue
      }
      out[k] = capped
    }
    return out
  }

  // functions, symbols, bigints — drop
  return null
}

/**
 * Cap a jsonb-bound object so the audit insert stays bounded.
 * Returns a NEW object; never mutates the input. Best-effort; returns the
 * input unchanged if anything goes sideways.
 */
export function capJsonbSize<T extends Record<string, unknown> | null | undefined>(
  input: T,
): T extends null | undefined ? null : Record<string, unknown> {
  if (input == null) return null as never
  try {
    return capValue(input, 0) as never
  } catch {
    return input as never
  }
}
