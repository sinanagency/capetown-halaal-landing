// CTH voice / audio-note rejection test.
//
// The webhook receives Meta Cloud API payloads with `type: 'audio'` for both
// push-to-talk voice notes and uploaded audio files. CTH does NOT transcribe.
// We require:
//
//   1. parseInbound exposes the raw `type` field unchanged (so 'audio' flows
//      through to handleInbound for branching).
//   2. The webhook route file contains an explicit audio early-return that:
//      a) sits AFTER STOP/START + dedup + touchInbound (compliance + window),
//      b) sits BEFORE the admin/handover/festival-brain routing,
//      c) calls sendText with a polite "type your message" rejection,
//      d) logs the outbound to wa_messages.
//   3. The rejection branch must NOT touch askFestivalBrain, detectHumanIntent,
//      or escalateToHuman.
//
// Skeptic-pass: revert the audio branch in route.ts and re-run; this script
// must fail red. With the branch in place, it must pass green.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const routePath = path.resolve(here, '../src/app/api/whatsapp/webhook/route.ts')
const whatsappLibPath = path.resolve(here, '../src/lib/whatsapp.ts')
const route = readFileSync(routePath, 'utf8')
const whatsappLib = readFileSync(whatsappLibPath, 'utf8')

let pass = 0
let fail = 0
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`PASS ${name}`) }
  else { fail++; console.log(`FAIL ${name}`); if (detail) console.log(`     ${detail}`) }
}

// ---- 1) parseInbound passes the raw `type` field through ----
// We assert the shape of the InboundMessage interface and that the parser
// copies `msg.type` verbatim. If this changes, the audio branch breaks.
check('InboundMessage.type field exists in whatsapp.ts',
  /type:\s*string/.test(whatsappLib) && /interface InboundMessage/.test(whatsappLib))
check('parseInbound copies msg.type verbatim (no remapping)',
  /type:\s*msg\.type/.test(whatsappLib))

// ---- 2) Webhook route contains the audio rejection branch ----
const audioBranchPresent = /msg\.type\s*===\s*['"]audio['"]/.test(route)
check('route.ts has explicit audio-type branch', audioBranchPresent)

const rejectionCopyPresent = /[Vv]oice notes aren'?t supported/.test(route) &&
                              /[Pp]lease type your message/.test(route)
check('audio branch sends polite rejection copy', rejectionCopyPresent)

// 2b) The branch must call sendText (not bypass the consent gate).
// Extract the audio block by scanning braces from the `if (msg.type === 'audio')`
// anchor — regex alone can't balance nested object literals.
function extractAudioBlock(src) {
  const anchorRe = /if\s*\(\s*msg\.type\s*===\s*['"]audio['"]\s*\)\s*\{/
  const m = src.match(anchorRe)
  if (!m) return ''
  let i = m.index + m[0].length
  let depth = 1
  while (i < src.length && depth > 0) {
    const ch = src[i]
    if (ch === '{') depth++
    else if (ch === '}') depth--
    i++
  }
  return src.slice(m.index, i)
}
const audioBlock = extractAudioBlock(route)
check('audio block calls sendText (consent gate honored)',
  /sendText\(/.test(audioBlock),
  `block: ${audioBlock.slice(0, 200)}`)
check('audio block calls logMessage (audit trail preserved)',
  /logMessage\(/.test(audioBlock),
  `block: ${audioBlock.slice(0, 200)}`)
check('audio block logs direction:"out"',
  /direction:\s*['"]out['"]/.test(audioBlock),
  `block: ${audioBlock.slice(0, 200)}`)

// 2c) Ordering invariants.
const idxTouchInbound = route.indexOf('touchInbound(e164, msg.name)')
const idxAudioBranch = route.search(/if\s*\(\s*msg\.type\s*===\s*['"]audio['"]\s*\)/)
const idxAdminPath = route.indexOf('const admin = findAdmin(e164)')
const idxBrain = route.indexOf('askFestivalBrain(')
const idxStop = route.indexOf('isStopKeyword(msg.text)')

check('STOP keyword check runs BEFORE audio branch (compliance precedence)',
  idxStop > -1 && idxStop < idxAudioBranch,
  `stop@${idxStop} audio@${idxAudioBranch}`)
check('audio branch runs AFTER touchInbound (consent + 24h window first)',
  idxTouchInbound > -1 && idxAudioBranch > idxTouchInbound,
  `touchInbound@${idxTouchInbound} audio@${idxAudioBranch}`)
check('audio branch runs BEFORE admin handler',
  idxAdminPath > -1 && idxAudioBranch < idxAdminPath,
  `audio@${idxAudioBranch} admin@${idxAdminPath}`)
check('audio branch runs BEFORE festival brain',
  idxBrain > -1 && idxAudioBranch < idxBrain,
  `audio@${idxAudioBranch} brain@${idxBrain}`)

// 3) The audio branch body must NOT call brain or handover paths.
check('audio block does not call askFestivalBrain',
  audioBlock && !audioBlock.includes('askFestivalBrain'),
  `block: ${audioBlock.slice(0, 200)}`)
check('audio block does not call detectHumanIntent',
  audioBlock && !audioBlock.includes('detectHumanIntent'),
  `block: ${audioBlock.slice(0, 200)}`)
check('audio block does not call escalateToHuman',
  audioBlock && !audioBlock.includes('escalateToHuman'),
  `block: ${audioBlock.slice(0, 200)}`)
check('audio block contains a bare return (early-exits)',
  audioBlock && /\n\s+return\b/.test(audioBlock),
  `block tail: ${audioBlock.slice(-120)}`)
check('audio block closes with its own brace',
  audioBlock && audioBlock.trim().endsWith('}'),
  `block tail: ${audioBlock.slice(-80)}`)

console.log(`\n=== ${pass}/${pass + fail} passed ===`)
process.exit(fail === 0 ? 0 : 1)
