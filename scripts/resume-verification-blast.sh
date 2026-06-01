#!/bin/zsh
# Auto-resume the "verification has started" vendor blast after Resend's daily
# quota resets (00:00 UTC = 04:00 Dubai). Runs daily until the campaign is
# complete, then self-retires by unloading + removing its own launchd job.
#
# Resend ONLY (no SMTP). Idempotent: re-runs send only the unsent remainder.

NODE=/Users/milaaj/.nvm/versions/node/v20.20.1/bin/node
DIR=/Users/milaaj/Code/capetown-halaal-landing
DONE="$DIR/scripts/.verification-blast.DONE"
PLIST=/Users/milaaj/Library/LaunchAgents/agency.cth.verification-resume.plist
RUNLOG="$DIR/scripts/resume-cron.log"

cd "$DIR" || exit 1
echo "=== resume run $(date '+%Y-%m-%d %H:%M:%S %Z') ===" >> "$RUNLOG"
NO_PREVIEW=1 "$NODE" scripts/send-verification-started.mjs >> "$RUNLOG" 2>&1

# Campaign finished (all sent + CTH report delivered) -> retire this cron.
if [ -f "$DONE" ]; then
  echo "DONE flag present — retiring launchd job." >> "$RUNLOG"
  /bin/launchctl unload "$PLIST" 2>/dev/null
  /bin/rm -f "$PLIST"
fi
