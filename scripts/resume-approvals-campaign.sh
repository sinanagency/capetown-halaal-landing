#!/bin/zsh
# Resume the CTH "Approvals are in progress" campaign after Resend's free-tier
# daily 100 cap resets at 00:00 UTC (04:00 Dubai). Sends 95/day so the rejection
# trickle keeps 5 sends of headroom. Resend ONLY. Idempotent via a local sent
# ledger. Self-retires (unloads + rms its own launchd plist) when the cohort
# minus the ledger is empty.
#
# Re-entrancy: each run reads the ledger as excludeEmails so partial-success
# days do not re-mail anyone, and re-running by hand is safe.

set -u

NODE=/Users/milaaj/.nvm/versions/node/v20.20.1/bin/node
DIR=/Users/milaaj/Code/capetown-halaal-landing
SPEC_BASE=/Users/milaaj/.claude/jobs/09f3a005/cth-approvals-in-progress.json
SPEC_LIVE="$DIR/scripts/.approvals-campaign.live.json"
LEDGER="$DIR/scripts/.approvals-campaign.sent-ledger.txt"
DONE="$DIR/scripts/.approvals-campaign.DONE"
PLIST=/Users/milaaj/Library/LaunchAgents/agency.cth.approvals-resume.plist
RUNLOG="$DIR/scripts/approvals-resume.log"
DAILY_LIMIT=95

cd "$DIR" || exit 1
mkdir -p "$(dirname "$RUNLOG")"
touch "$LEDGER"
echo "=== resume run $(date '+%Y-%m-%d %H:%M:%S %Z') ===" >> "$RUNLOG"

if [ -f "$DONE" ]; then
  echo "DONE flag present, retiring." >> "$RUNLOG"
  /bin/launchctl unload "$PLIST" 2>/dev/null
  /bin/rm -f "$PLIST"
  exit 0
fi

SUP_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
SUP_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ')

# 1) Build the live spec by injecting the ledger as excludeEmails.
python3 - <<PY >> "$RUNLOG" 2>&1
import json
spec = json.load(open("$SPEC_BASE"))
ledger = [l.strip().lower() for l in open("$LEDGER") if l.strip()]
spec["excludeEmails"] = sorted(set(ledger))
json.dump(spec, open("$SPEC_LIVE", "w"), indent=2)
print(f"live spec excludes {len(spec['excludeEmails'])} already-sent vendors")
PY

# 2) Compute today's slice client-side so we can append it to the ledger.
SLICE_FILE="$DIR/scripts/.approvals-campaign.slice.txt"
python3 - <<PY >> "$RUNLOG" 2>&1
import json, urllib.request, urllib.parse
ledger = {l.strip().lower() for l in open("$LEDGER") if l.strip()}
params = urllib.parse.urlencode({
  "select": "email,contact_name,status",
  "status": "in.(pending,info_requested)",
  "order": "email.asc",
})
req = urllib.request.Request(
  f"$SUP_URL/rest/v1/vendor_applications?{params}",
  headers={"apikey": "$SUP_KEY", "Authorization": "Bearer $SUP_KEY"},
)
rows = json.load(urllib.request.urlopen(req))
seen, candidates = set(), []
import re
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
for r in rows:
  e = (r.get("email") or "").strip().lower()
  if not EMAIL_RE.match(e) or e in seen or e in ledger:
    continue
  seen.add(e)
  candidates.append(e)
slice_ = candidates[:$DAILY_LIMIT]
open("$SLICE_FILE", "w").write("\n".join(slice_))
print(f"cohort live={len(rows)} eligible={len(candidates)} today_slice={len(slice_)}")
PY

SLICE_COUNT=$(wc -l < "$SLICE_FILE" | tr -d ' ')
if [ "$SLICE_COUNT" = "0" ]; then
  echo "cohort minus ledger is empty, writing DONE." >> "$RUNLOG"
  touch "$DONE"
  /bin/launchctl unload "$PLIST" 2>/dev/null
  /bin/rm -f "$PLIST"
  exit 0
fi

# 3) Fire the send.
"$NODE" "$DIR/scripts/send-campaign.mjs" "$SPEC_LIVE" --to=vendors_pending --limit=$DAILY_LIMIT >> "$RUNLOG" 2>&1

# 4) Parse "Sent N" from the run output and append that many entries from the
#    pre-computed slice (alphabetical) to the ledger. Conservative: if we cannot
#    parse the count, log + skip ledger update so we never silently lose visibility.
SENT=$(tail -200 "$RUNLOG" | grep -oE 'Sent [0-9]+' | tail -1 | awk '{print $2}')
if [ -n "${SENT:-}" ] && [ "$SENT" -gt 0 ] 2>/dev/null; then
  head -n "$SENT" "$SLICE_FILE" >> "$LEDGER"
  echo "appended $SENT entries to ledger ($(wc -l < "$LEDGER" | tr -d ' ') total)." >> "$RUNLOG"
else
  echo "could not parse Sent count or sent=0, ledger untouched. Investigate." >> "$RUNLOG"
fi
