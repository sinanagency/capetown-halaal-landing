// Client-safe constants from the WooCommerce layer.
// The main lib/woocommerce.ts module reads server-only env vars (WC_CONSUMER_*)
// and must not be imported into a client component. This file contains only
// the public WP origin + product id constants so client components can render
// links without dragging server-only code into the bundle.

export const WP_ORIGIN = 'https://tickets.youngatheart.co.za'
export const STAFF_BADGE_PRODUCT_ID = Number(process.env.NEXT_PUBLIC_STAFF_BADGE_PRODUCT_ID || 9487)
