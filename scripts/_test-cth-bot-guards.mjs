// CTH bot-guards integration test.
//
// Verifies that the shared lib, wired with CTH_BOT_GUARDS_CONFIG, catches:
//   - "Sasa" brand leak (other bot's name)
//   - Em-dash (no-em-dashes law)
//   - "Netlify" mention (deploy-target law)
// And passes through legitimate CTH replies unchanged.

import { sanitizeReply } from '../src/lib/bot-guards/index.js'
import { CTH_BOT_GUARDS_CONFIG } from '../src/lib/bot/guards-config.js'

const cases = [
  { name: 'sasa-brand leak caught',         body: 'Sasa already logged that for you.',     mustCatch: true,  expectKind: 'forbidden_brand' },
  { name: 'nisria-brand leak caught',       body: 'Reach out to Nisria for the next step.', mustCatch: true,  expectKind: 'forbidden_brand' },
  { name: 'em-dash caught',                  body: 'Welcome — your stall is confirmed.',     mustCatch: true,  expectKind: 'banned_pattern' },
  { name: 'netlify mention caught',          body: 'We deploy on Netlify.',                  mustCatch: true,  expectKind: 'banned_pattern' },
  { name: 'urgency manipulation caught',     body: 'Only 5 left! Act now!',                  mustCatch: true,  expectKind: 'banned_pattern' },
  { name: 'legitimate vendor reply passes',  body: 'Your stall code is A-12. Festival opens Dec 11.', mustCatch: false },
  { name: 'legitimate ticket reply passes',  body: 'You have 3 tickets in order #4521. Check your email.', mustCatch: false },
  { name: 'legitimate handover reply passes', body: 'Connecting you to a human. Please wait a moment.', mustCatch: false },
]

let pass = 0
let fail = 0
for (const c of cases) {
  const out = sanitizeReply(c.body, CTH_BOT_GUARDS_CONFIG)
  const caught = !!out.caught
  const ok = caught === c.mustCatch && (c.mustCatch ? out.caught?.kind === c.expectKind : true)
  if (ok) { pass++; console.log(`✅ ${c.name}`) }
  else {
    fail++
    console.log(`❌ ${c.name}`)
    console.log(`   body: ${JSON.stringify(c.body)}`)
    console.log(`   expected: caught=${c.mustCatch}${c.expectKind ? ' kind=' + c.expectKind : ''}`)
    console.log(`   got:      caught=${caught}${out.caught ? ' kind=' + out.caught.kind + ' pattern=' + out.caught.pattern : ''}`)
    console.log(`   body out: ${JSON.stringify(out.body)}`)
  }
}
console.log(`\n=== ${pass}/${pass + fail} passed ===`)
process.exit(fail === 0 ? 0 : 1)
