#!/bin/zsh
# Resume the CTH "Approvals are in progress" campaign after Resend's free-tier
# daily 100 cap resets at 00:00 UTC (04:00 Dubai). Sends 95/day so the rejection
# trickle keeps 5 sends of headroom. Resend ONLY.
#
# DEDUP IS DURABLE AND SERVER-SIDE. The send route stamps a marker
# ("Sent 'approvals in progress' notice") onto vendor_applications.admin_notes
# on every confirmed send, and skips anyone already carrying it. There is NO
# local ledger anymore (the old ledger file was corruptible by unrelated git
# commits — see 2026-06-17 incident). Re-running by hand is always safe.
#
# Self-retires (unloads + rms its own launchd plist) once a dry run reports 0
# remaining un-marked vendors.

set -u

NODE=/Users/milaaj/.nvm/versions/node/v20.20.1/bin/node
DIR=/Users/milaaj/Code/capetown-halaal-landing
SPEC="$DIR/scripts/cth-approvals-in-progress.json"
DONE="$DIR/scripts/.approvals-campaign.DONE"
PLIST=/Users/milaaj/Library/LaunchAgents/agency.cth.approvals-resume.plist
RUNLOG="$DIR/scripts/approvals-resume.log"
DAILY_LIMIT=95

cd "$DIR" || exit 1
echo "=== resume run $(date '+%Y-%m-%d %H:%M:%S %Z') ===" >> "$RUNLOG"

if [ -f "$DONE" ]; then
  echo "DONE flag present, retiring." >> "$RUNLOG"
  /bin/launchctl unload "$PLIST" 2>/dev/null
  /bin/rm -f "$PLIST"
  exit 0
fi

# 1) Dry run to see how many un-marked vendors remain (server applies the marker filter).
REMAIN=$("$NODE" "$DIR/scripts/send-campaign.mjs" "$SPEC" --to=vendors_pending --dry 2>>"$RUNLOG" \
  | grep -oE 'Would send to [0-9]+' | grep -oE '[0-9]+' | head -1)
echo "dry run reports remaining=${REMAIN:-unknown}" >> "$RUNLOG"

if [ "${REMAIN:-1}" = "0" ]; then
  echo "0 remaining, writing DONE and retiring." >> "$RUNLOG"
  touch "$DONE"
  /bin/launchctl unload "$PLIST" 2>/dev/null
  /bin/rm -f "$PLIST"
  exit 0
fi

# 2) Fire today's slice. The route stamps the marker on each confirmed send,
#    so tomorrow's run automatically skips everyone reached today.
"$NODE" "$DIR/scripts/send-campaign.mjs" "$SPEC" --to=vendors_pending --limit=$DAILY_LIMIT >> "$RUNLOG" 2>&1
echo "send complete $(date '+%H:%M:%S %Z')" >> "$RUNLOG"
