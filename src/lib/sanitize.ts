import sanitizeHtml from 'sanitize-html'

/**
 * Strip ALL HTML tags from input. Returns plain-text only.
 *
 * Public vendor profile fields (description, menu[].desc, business_description)
 * are rendered onto /sectors/[slug]/[vendor] which is a public surface. CSP is
 * Report-Only here, so any unsanitized HTML/JS would actually execute. We do
 * not allow any tag, attribute, or scheme through.
 */
export function stripAllHtml(input: string): string {
  if (!input) return ''
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  })
}
