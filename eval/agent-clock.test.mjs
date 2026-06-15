// Unit test for the vendored agent-clock + joburg-clock wiring.
// Run: node --import tsx --test eval/agent-clock.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ClockInjector } from '../src/lib/_vendor/agent-clock/index.js'
import { joburgClockBlock } from '../src/lib/joburg-clock.js'
import { getSystemPrompt, BASE_PROMPT } from '../src/lib/festival-brain/system-prompt.js'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function currentYearInZone(timezone) {
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric' }).format(new Date())
}

test('ClockInjector pinned to Africa/Johannesburg renders trusted block', () => {
  const clock = new ClockInjector({ timezone: 'Africa/Johannesburg' })
  const block = clock.block()

  assert.ok(block.includes('Current trusted datetime:'), 'header line missing')
  assert.ok(block.includes('Africa/Johannesburg'), 'timezone missing')
  assert.ok(block.includes('UTC Offset:'), 'UTC offset line missing')

  const year = currentYearInZone('Africa/Johannesburg')
  assert.ok(block.includes(year), `current year ${year} missing`)

  const hasWeekday = WEEKDAYS.some((w) => block.includes(w))
  assert.ok(hasWeekday, 'no weekday word in block')
})

test('joburgClockBlock() returns the same shape as a fresh injector', () => {
  const out = joburgClockBlock()
  assert.ok(out.startsWith('Current trusted datetime:'), 'block does not start with trusted header')
  assert.ok(out.includes('Africa/Johannesburg'), 'timezone tag missing')
  assert.ok(out.includes('UTC Offset:'), 'UTC offset missing')
  const hasWeekday = WEEKDAYS.some((w) => out.includes(w))
  assert.ok(hasWeekday, 'no weekday word')
})

test('getSystemPrompt() puts the clock block at the head, BASE_PROMPT after', () => {
  const sys = getSystemPrompt()
  assert.ok(sys.startsWith('Current trusted datetime:'), 'prompt does not start with clock block')
  assert.ok(sys.includes('Africa/Johannesburg'), 'tz missing from composed prompt')
  // BASE_PROMPT body fingerprint
  assert.ok(sys.includes('You are Zanii AI'), 'BASE_PROMPT identity line missing')
  assert.ok(sys.includes('Young at Heart Festival'), 'festival identity missing')
  assert.ok(sys.includes('11, 12, 13 December 2026'), 'festival dates missing')
  // Clock comes before BASE_PROMPT body
  const clockIdx = sys.indexOf('Current trusted datetime:')
  const baseIdx = sys.indexOf('You are Zanii AI')
  assert.ok(clockIdx >= 0 && baseIdx > clockIdx, 'clock block must precede BASE_PROMPT')
  // BASE_PROMPT export still works as a standalone string
  assert.ok(BASE_PROMPT.startsWith('You are Zanii AI'), 'BASE_PROMPT export broken')
})

// Visible verbatim print so the operator can eyeball the rendered block.
test('print joburgClockBlock() verbatim for the audit log', () => {
  const out = joburgClockBlock()
  process.stdout.write('\n--- joburgClockBlock() verbatim ---\n')
  process.stdout.write(out + '\n')
  process.stdout.write('--- end ---\n')
  assert.ok(out.length > 0)
})
