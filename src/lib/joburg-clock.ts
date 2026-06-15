// Single trusted "now" source for the festival bot, pinned to Africa/Johannesburg.
// All system prompts get the canonical datetime block prepended via joburgClockBlock(),
// so the bot never has to derive "today" / "this weekend" from its training cutoff.
// Same shape Sasa (Asia/Dubai) and Jensen (Asia/Dubai) now use.
import { ClockInjector } from "./_vendor/agent-clock/index.js";

const _clock = new ClockInjector({ timezone: "Africa/Johannesburg" });

export function joburgClockBlock(): string {
  return _clock.block();
}
