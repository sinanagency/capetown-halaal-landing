# DGX Swap — Morning Runbook (2026-06-11)

State as of 2026-06-11 ~03:00 Dubai. Continue from here in the morning.

## What landed tonight (long session, much shipped to prod)

### Deployed to prod (verified live on cthalaal.co.za)
- **Audit C2 kill switch** — `ANTHROPIC_DISABLED=true` env var in Vercel prod. `/api/chat` returns static fallback ("AI briefly offline, email support, dates 11-13 Dec, venue Youngsfield"), zero Anthropic spend possible. Remove the env var once DGX is fully live and eval-clean.
- **Audit C5 fail-closed signature** — `src/lib/whatsapp.ts` rejects unsigned webhooks in production when `WHATSAPP_APP_SECRET` is missing (was fail-OPEN).
- **Audit #16 WC pagination + date filter** — `src/lib/woocommerce.ts`:
  - `getOrders` now paginates (loops `page=` until batch < per_page; hard cap 5000).
  - All `getOrders` calls now carry `after=2026-01-01T00:00:00` (Doctrine Law 6).
  - `getOrdersCount` rewritten to count via `/orders` with cycle filter, since `/reports/orders/totals` ignores date range.
- **Audit H1 mark-paid amount clamp** — `src/app/api/admin/payments/mark-paid/route.ts`:
  - Amount must be 0-100000.
  - `method='waived'` requires non-empty `reason` field; logged with admin id.
- **Audit L1 crypto.randomBytes** — `src/lib/exhibitor-auth.ts` temp password generator uses `crypto.randomBytes` instead of `Math.random` (CSPRNG).
- **Audit M2 dep cleanup** — removed unused `bcryptjs`, `@types/bcryptjs`, `next-auth`, `@netlify/plugin-nextjs`.

### Inference platform (in-flight, no prod swap until eval clears)
- `src/lib/llm/dgx.ts` — multi-tenant OpenAI-compatible client with active-passive failover (primary → failover → throw to Haiku via festival-brain.ts).
- `src/lib/festival-brain.ts` — DGX-first soft-fallback chain, kill switch respected before any Anthropic call.
- `eval/dgx-swap-smoke.mjs` — standalone eval against any vLLM endpoint. 9/9 PASS confirmed against Node 03 Llama-3.3-70B earlier; 72B eval auto-runs once Node 01 finishes loading (check `~/Code/capetown-halaal-landing/` bg job output in `/tmp/claude-*` for results).

### Node 01 ground truth (sleeping no more)
- Driver 575.57.08, CUDA 12.9 max — vLLM 0.22.1 (CUDA 13) was incompatible. **Reinstalled vLLM 0.6.4.post1 + torch 2.5.1 cu124** in `~/venv-infer/`. `torch.cuda.is_available()=True`, 7 GPUs visible.
- **GPU 4 hardware-dead** — patched `vllm/platforms/cuda.py` to swallow the per-device NVML_Unknown so vLLM serves on 7 GPUs. Flag to GPU guy for proper fix.
- **vLLM 0.6.4 cannot load Qwen3-VL-235B** (Qwen3VLMoeForConditionalGeneration not in registry). **Pivoted to Qwen2.5-72B-Instruct** (Qwen2ForCausalLM, supported, 145GB BF16). Downloaded in 18 min. Both models stay on disk; Qwen3-VL-235B lights up once driver gets upgraded to 580+ for vLLM 0.10+.
- vLLM launch script at `~/start-vllm-72b.sh`. **NOT YET SERVING** — see "Substrate compat fight" below.

### Substrate compat fight — Node 01 NOT YET SERVING (morning task)

Three issues fixed in sequence tonight, then a fourth stopped me. Per KT #204 (stopping rule on cascading compat fights), parking with three forward paths instead of pinning fifth, sixth, seventh deps.

1. CUDA 13 vs driver 575 → fixed via cu124 reinstall (torch 2.5.1, vllm 0.6.4.post1)
2. Dead GPU 4 NVML crash → patched `vllm/platforms/cuda.py` (per-device try/except)
3. transformers 5.x removed `all_special_tokens_extended` → pinned `transformers==4.46.3`
4. **pyzmq 27 ZMQ ENOTSUP at engine startup** → STOPPED HERE

Current pin state on Node 01 (saved at `~/venv-pin-snapshot.txt`):
- vllm 0.6.4.post1
- torch 2.5.1+cu124
- transformers 4.46.3
- pyzmq 27.1.0 (the suspect)
- uvloop 0.22.1
- tokenizers 0.20.3

**Three options for the morning, ranked:**

**Option 1 (fastest, ~1 min):** pin pyzmq to a vLLM 0.6.4-era version.
```bash
ssh dgx1
source ~/venv-infer/bin/activate
pip install "pyzmq<27.0"   # vLLM 0.6.4 era used pyzmq 25-26
nohup ~/start-vllm-72b.sh > ~/vllm-serve-72b.log 2>&1 &
# tail -f ~/vllm-serve-72b.log | grep -m1 "Application startup complete"
```

**Option 2 (~5 min):** upgrade vLLM to 0.6.6.post1 or 0.7.x. May resolve all of (3) and (4) at once.
```bash
pip install --upgrade "vllm>=0.6.6,<0.8.0"
nohup ~/start-vllm-72b.sh > ~/vllm-serve-72b.log 2>&1 &
```

**Option 3 (cleanest long-term):** wait for GPU guy driver update to 580+. Then reinstall vLLM 0.10+ which natively supports `Qwen3VLMoeForConditionalGeneration` and load the already-downloaded `Qwen3-VL-235B-A22B-Instruct-FP8`. This is the architecture we designed for.

Tonight's 9/9 smoke eval against Node 03's existing Llama-3.3-70B already validated the dgx.ts code path. The 72B vs 235B vs Llama choice is a model-quality question, not a code question. Whichever serves first becomes the primary.

- **Transformers pin gotcha:** vLLM 0.6.4 expects `tokenizer.all_special_tokens_extended` which was removed in transformers 5.x. Pinned `transformers==4.46.3`. If you ever `pip install -U` anything touching transformers, repin or vLLM crashes on tokenizer init.
- **Transformers pin gotcha (cost a retry):** vLLM 0.6.4 expects `tokenizer.all_special_tokens_extended` which was removed in transformers 5.x. Pinned `transformers==4.46.3` in the venv. If you ever `pip install -U` anything that touches transformers, repin or vLLM crashes on tokenizer init.

### Prep files on Desktop (you upload in the morning)
- `~/Desktop/cth-wp-mu-cth-whatsapp-deliver.php` — WP MU-plugin for issue #9 (WP→Next WhatsApp ticket delivery webhook). Drop in `/wp-content/mu-plugins/`, set `CRON_SECRET_CTH` in `wp-config.php`.
- `~/Desktop/cth-wa-messages-dedup.sql` — audit C3 fix (UNIQUE index on `wa_messages.provider_message_id`). Paste into Supabase SQL Editor.

### Knowledge tree
- #198 cost-vs-crash framing
- #199 parallel audit fanout
- #200 local-first flips threat model
- #201 stale-memory substrate verification
- #202 HA across asymmetric hardware (Node 01 235B + T4 7B failover)
- #203 kill-switch during transition window

### Cap reminder still standing
Set Anthropic monthly cap to $50 at https://console.anthropic.com/settings/limits — kill switch closes /api/chat surface, cap is the second belt for any future regression.

## Two blockers to clear before prod swap

### Blocker A — Node 01 CUDA/driver mismatch

Node 01 driver `575.57.08` supports CUDA 12.9. vLLM 0.22.1 install pulled torch 2.11 / CUDA 13. Result: `torch.cuda.is_available() == False`. vLLM crashes on import.

Fix options (pick one):

1. **Driver update (cleanest):** flag GPU guy for driver update to 580+ (supports CUDA 13). Lets the current install work as-is. Doesn't cross the no-system-update rule because GPU guy owns drivers.
2. **Downgrade install for CUDA 12.4 (faster, no GPU-guy dep):**
   ```bash
   ssh dgx1
   source ~/venv-infer/bin/activate
   pip uninstall -y vllm torch torchvision torchaudio
   pip install torch==2.5.1 torchvision==0.20.1 torchaudio==2.5.1 \
     --index-url https://download.pytorch.org/whl/cu124
   pip install vllm==0.6.4.post1
   python3 -c "import torch; print(torch.cuda.is_available(), torch.cuda.device_count())"
   ```
   Expect: `True 7` (GPU 4 dead is fine, vLLM masks via CUDA_VISIBLE_DEVICES).

### Blocker B — Cloudflare Tunnel for `inference.zanii.agency`

`zanii.agency` zone lives on `Louischifura@gmail.com`'s Cloudflare account (`ad418f3131d4fba86584e27f73d07471`). The CF token in keychain (`claude-cloudflare`) is Zone-scoped — can edit DNS but cannot create `cfd_tunnels` on Louis's account.

Fix options:

1. **Ask Louis to either create the tunnel + share the connector token, or issue you an Account-scoped token with `Cloudflare Tunnel:Edit`.** Cleanest.
2. **Quick Tunnel** (no auth needed, but temporary):
   ```bash
   ssh dgx1
   # Install cloudflared binary (no apt needed)
   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
     -o ~/cloudflared && chmod +x ~/cloudflared
   # Generates a random https://<rand>.trycloudflare.com URL
   ~/cloudflared tunnel --url http://localhost:8000
   ```
   Random URL. Use only for staging eval, not prod.

## Once both blockers clear — prod swap sequence

1. **Launch vLLM** on Node 01:
   ```bash
   ssh dgx1
   ~/start-vllm.sh > ~/vllm-serve.log 2>&1 &
   # wait until log shows "Application startup complete." (~5-10 min for 235B load)
   tail -f ~/vllm-serve.log | grep -m1 "Application startup complete"
   ```
2. **Sanity check from Node 01:**
   ```bash
   curl -s http://127.0.0.1:8000/v1/models \
     -H "Authorization: Bearer sk-sinan-d8e91a750e16ce7d2c0211643a3fba4b5fe47a406ed88784"
   ```
3. **Cloudflare Tunnel up** (per Blocker B above), routing `inference.zanii.agency` → `http://127.0.0.1:8000`.
4. **Re-run smoke eval against the 235B:**
   ```bash
   cd ~/Code/capetown-halaal-landing
   DGX_ENDPOINT=https://inference.zanii.agency/v1 \
   DGX_API_KEY=sk-sinan-d8e91a750e16ce7d2c0211643a3fba4b5fe47a406ed88784 \
   DGX_MODEL_NAME=qwen3-vl-235b \
   node eval/dgx-swap-smoke.mjs
   ```
   Must pass 9/9 to clear the "feels like a downgrade" gate.
5. **Add Vercel env vars:**
   ```bash
   cd ~/Code/capetown-halaal-landing
   printf "https://inference.zanii.agency/v1" | vercel env add DGX_ENDPOINT production
   printf "sk-sinan-d8e91a750e16ce7d2c0211643a3fba4b5fe47a406ed88784" | vercel env add DGX_API_KEY production
   printf "qwen3-vl-235b" | vercel env add DGX_MODEL_NAME production
   ```
   (Heads up: trailing `\n` issue per `feedback_vercel_env_vars` — use `printf` not `echo`.)
6. **Deploy:** `vercel --prod`
7. **Verify C2 closed (audit critical):** hit `/api/chat` on prod with an unauth POST and confirm via Anthropic console that the spend doesn't move. Or set a tiny temp cap to make this safe to test.

## NEW: Multi-tenant + T4 failover

Tonight `dgx.ts` was extended to support active-passive HA across Node 01 + T4. Three tiers:
1. **Primary** — Qwen3-VL-235B on Node 01 (inference.zanii.agency)
2. **Failover** — smaller model on T4 (inference-failover.zanii.agency)
3. **Tertiary** — Anthropic Haiku 4.5 (the existing fallback in festival-brain.ts)

The module is consumer-agnostic: CTH festival bot, Jensen concierge, Sasa, future agents all import `askDgx` and pass their own system prompts. The dgx.ts code doesn't know who's calling.

### Failover triggers
- Connection refused, timeout, 5xx, 408 (timeout-shaped), 429 (rate-limited) → next tier
- 4xx auth or config errors → throw immediately (don't cascade real bugs to both boxes)

### T4 setup (you-action because SSH key was lost on last reboot)

1. Open https://infer.sinan-ai.smartlocal.cloud (JupyterLab, no VPN)
2. JupyterLab terminal:
   ```bash
   # regenerate the ephemeral SSH key + tunnel
   ssh-keygen -t ed25519 -N "" -f /tmp/t4_key
   cat /tmp/t4_key.pub >> ~/.ssh/authorized_keys
   ~/cloudflared tunnel --url tcp://localhost:22 2>&1 | tee ~/tunnel.log &
   sleep 4 && grep -o 'https://.*trycloudflare.com' ~/tunnel.log | head -1
   ```
3. Download `/tmp/t4_key` to your Mac (drag-from-JupyterLab → `~/.ssh/t4_key`) and chmod 600.
4. SSH from Mac:
   ```bash
   /tmp/cloudflared access tcp --hostname <TUNNEL_URL_FROM_STEP_2> &
   ssh -i ~/.ssh/t4_key user@localhost -p <port>
   ```
   (Or use the ProxyCommand pattern from `reference_t4_inference_server`.)
5. Once on T4, install vLLM + download the failover model:
   ```bash
   python3 -m venv ~/venv-infer
   ~/venv-infer/bin/pip install -U pip
   ~/venv-infer/bin/pip install "huggingface_hub[cli,hf_transfer]" vllm==0.6.4.post1 \
     torch==2.5.1 --index-url https://download.pytorch.org/whl/cu124
   ~/venv-infer/bin/hf download Qwen/Qwen2.5-7B-Instruct \
     --local-dir ~/models/Qwen2.5-7B-Instruct
   ```
6. Launch vLLM serve on T4 (2× T4 = TP=2, ~14GB FP16 fits easily):
   ```bash
   source ~/venv-infer/bin/activate
   nohup vllm serve ~/models/Qwen2.5-7B-Instruct \
     --served-model-name qwen2.5-7b-instruct \
     --tensor-parallel-size 2 \
     --max-model-len 16384 \
     --max-num-seqs 32 \
     --gpu-memory-utilization 0.9 \
     --api-key sk-sinan-d8e91a750e16ce7d2c0211643a3fba4b5fe47a406ed88784 \
     --host 0.0.0.0 --port 8000 > ~/vllm-serve.log 2>&1 &
   ```
7. Expose via Cloudflare Tunnel as `inference-failover.zanii.agency` (same Louis-account ask as primary).

### Model choice on T4 (one decision)

I defaulted to **Qwen2.5-7B-Instruct** as the failover model (general chat, strong for size, fits 1× T4). Override candidates:
- `Qwen2.5-VL-7B-Instruct` if you want multimodal to survive failover
- `Llama-3.2-3B-Instruct` if you want headroom for many concurrent at lower quality

### Vercel env vars (after both boxes serve)

```bash
printf "https://inference.zanii.agency/v1" | vercel env add DGX_ENDPOINT production
printf "sk-sinan-..." | vercel env add DGX_API_KEY production
printf "qwen3-vl-235b" | vercel env add DGX_MODEL_NAME production
printf "https://inference-failover.zanii.agency/v1" | vercel env add DGX_FAILOVER_ENDPOINT production
printf "sk-sinan-..." | vercel env add DGX_FAILOVER_API_KEY production
printf "qwen2.5-7b-instruct" | vercel env add DGX_FAILOVER_MODEL_NAME production
```

### Cross-product rollout

Same env-var pattern + `import { askDgx } from '@/lib/llm/dgx'` works in any project. After CTH:
- Jensen concierge (la Rencontre) — call `askDgx` with Jensen's persona system prompt
- Sasa (Nisria) — same pattern, Sasa's system prompt
- Canada Made CRM agentic compose — same pattern

The inference platform becomes agency-wide load-shared infrastructure.

## Anthropic spend cap reminder

Until both DGX boxes serve, `/api/chat` still routes to Anthropic Haiku for any outage. **Confirm the monthly cap is set:**
- https://console.anthropic.com/settings/limits → Monthly spend limit → $50 or your number.

## File index

- `src/lib/llm/dgx.ts` (new)
- `src/lib/festival-brain.ts` (DGX-first soft-fallback)
- `eval/dgx-swap-smoke.mjs` (standalone eval, 9 cases)
- `AUDIT-25K-SCALE-2026-06-10.md` (full festival audit)
- `~/start-vllm.sh` on Node 01 (vLLM launch script)
- `~/reinstall-for-cu124.sh` on Node 01 (CUDA 12.4 reinstall script — died, debug or just run the commands manually per Blocker A option 2)

## Known costs of running this overnight (none)

DGX download + dgx.ts build + Node 03 eval used zero metered APIs. Anthropic balance untouched. WhatsApp balance untouched. HuggingFace pull is free.
