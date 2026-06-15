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

/**
 * Sanitize inbound email HTML bodies for the operator-only Support Inbox.
 *
 * Allowlist is tight: only structural + inline-text tags, hyperlinks (http(s)
 * + mailto), and a small set of list/quote tags. Everything else is stripped.
 *
 * Explicitly disallowed: script, iframe, style, img, form, link, meta, object,
 * embed, video, audio, svg. No images until we have a CSP-safe pattern; until
 * then a missing image is better than a tracker pixel firing.
 *
 * Example: `<script>alert(1)</script><p>hello <a href="http://x">link</a></p>`
 *   becomes `<p>hello <a href="http://x" target="_blank" rel="noopener noreferrer">link</a></p>`.
 *   No script tag. No alert. The <p> + <a> survive because they are on the
 *   allowlist. The added target/rel come from sanitize-html's transformTags.
 */
export function sanitizeEmailHtml(input: string): string {
  if (!input) return ''
  return sanitizeHtml(input, {
    allowedTags: ['a', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'hr'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
    disallowedTagsMode: 'discard',
    transformTags: {
      // Force every anchor to open in a new tab with noopener noreferrer. This
      // is defense-in-depth in case CSP is Report-Only on /admin.
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }, true),
    },
  })
}
