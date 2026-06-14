// =============================================================================
// Template variable interpolation with graceful empty-value handling.
//
// Problem: outbound templates contain `{{first_name}}`, `{{stall_tier}}` etc.
// When the value is null / empty / whitespace, naive replace leaves "Hi ,"
// or " 's order" in the rendered text. This helper substitutes values and
// then collapses the surrounding punctuation + whitespace so absent names
// disappear cleanly.
//
// Required behaviour (per CTH admin spec):
//   "Hi {{first_name}}," + no name           -> "Hi,"
//   "...for {{first_name}}'s order..."       -> "...for order..." (possessive dropped)
//   "Hi {{first_name}}, welcome"             -> "Hi, welcome"     (no leading space)
//   "Order {{order_id}} for {{name}}"        -> "Order 42 for"    (trailing-empty)
//   "{{a}} and {{b}} and {{c}}"              -> "and"             (collapsed)
//   "All vars present"                       -> straight passthrough.
//
// Design: we do NOT try to be clever about every English construction. We
// substitute, then run a small set of well-known cleanups: empty possessives,
// orphan commas, double spaces, leading/trailing whitespace per line. This
// keeps the surface area auditable and the regex set bounded.
// =============================================================================

export type InterpolateVars = Record<string, string | number | null | undefined>

const MERGE_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g

/** Treat null, undefined, and whitespace-only strings as empty. */
function isEmpty(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === 'number') return false
  return String(v).trim() === ''
}

function toStr(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

/**
 * Substitute `{{key}}` placeholders with values from `vars`. Empty values
 * (null, undefined, "", whitespace) cause the placeholder to be dropped and
 * the surrounding whitespace / punctuation cleaned up.
 *
 * Unknown placeholders (not in `vars`) are treated the same as empty.
 */
export function renderTemplate(template: string, vars: InterpolateVars): string {
  if (!template) return ''

  // Pass 1: substitute. Empty values become an empty string so the cleanup
  // pass can collapse the surrounding context.
  const substituted = template.replace(MERGE_RE, (_match, key: string) => {
    const v = vars[key]
    return isEmpty(v) ? '' : toStr(v)
  })

  return cleanupWhitespace(substituted)
}

/**
 * Collapse orphan punctuation and whitespace introduced when a `{{var}}`
 * substitution drops out. Exported for reuse in render paths that do their
 * own substitution but still want the cleanup.
 */
export function cleanupWhitespace(input: string): string {
  let s = input

  // Empty possessive: " 's order" -> " order", "'s order" at line-start -> "order".
  // We match `'s` (or `’s`) when preceded by either whitespace or the start
  // of a line, indicating the noun it was attached to is gone.
  s = s.replace(/(^|\s)['’]s\b/g, (_, lead: string) => lead)

  // Stray standalone "'s" with nothing before it.
  s = s.replace(/(^|[\s>])['’]s(\s|$|[.,;:!?])/g, '$1$2')

  // Per-line cleanup, preserving newline structure.
  const lines = s.split('\n').map((line) => cleanupLine(line))
  return lines.join('\n')
}

function cleanupLine(line: string): string {
  // Templates don't carry meaningful indentation; leading whitespace on a
  // line is almost always substitution residue. Strip it.
  let body = line.replace(/^\s+/, '')

  // Inline: collapse whitespace before punctuation: "Hi ," -> "Hi,".
  body = body.replace(/\s+([,.;:!?])/g, '$1')

  // Inline: collapse double spaces.
  body = body.replace(/ {2,}/g, ' ')

  // Empty parenthetical "()" / "( )" left by a dropped var.
  body = body.replace(/\(\s*\)/g, '')

  // Double commas left over: ",," -> ",".
  body = body.replace(/,\s*,/g, ',')

  // Leading comma on a body: ", welcome" -> "welcome".
  body = body.replace(/^,\s*/, '')

  // Repeated "and / or" left by dropped vars: "and and" -> "and".
  body = body.replace(/\b(and|or)\s+\1\b/gi, '$1')

  // Trim trailing whitespace.
  body = body.replace(/\s+$/, '')

  return body
}
