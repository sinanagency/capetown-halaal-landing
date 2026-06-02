import Link from 'next/link'

/**
 * Slim, site-wide legal strip. Satisfies the Visa / Mastercard website-content
 * requirements that FNB checks before activating the merchant account:
 * published policies, customer-service contact, transaction currency (ZAR),
 * and country of domicile (South Africa). Rendered globally from the root layout.
 */
export function SiteLegalFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 text-neutral-500">
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:text-neutral-900 transition-colors">Terms &amp; Conditions</Link>
          <Link href="/refund-policy" className="hover:text-neutral-900 transition-colors">Refund &amp; Cancellation</Link>
          <Link href="/privacy" className="hover:text-neutral-900 transition-colors">Privacy Policy</Link>
          <Link href="/contact" className="hover:text-neutral-900 transition-colors">Contact</Link>
        </nav>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span>All transactions in South African Rand (ZAR).</span>
          <span aria-hidden>&middot;</span>
          <span>Operated &amp; domiciled in South Africa.</span>
          <span aria-hidden>&middot;</span>
          <span>Card payments secured by FNB &mdash; Visa &amp; Mastercard accepted.</span>
        </div>

        <p className="mt-3 text-xs text-neutral-400">
          Young at Heart Festival &middot; Youngsfield Military Base, Wetton Road, Cape Town, South Africa
          &middot; <a className="underline hover:text-neutral-700" href="mailto:support@youngatheart.co.za">support@youngatheart.co.za</a>
          &middot; <a className="underline hover:text-neutral-700" href="tel:+27659435012">+27&nbsp;65&nbsp;943&nbsp;5012</a>
        </p>
      </div>
    </footer>
  )
}
