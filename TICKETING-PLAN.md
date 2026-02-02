# Young at Heart Festival - Ticketing Integration Plan

## Overview
FooEvents (already purchased) will handle ticketing on a separate WordPress site, integrated with the Next.js ecosystem via redirect.

## Architecture
```
cthalaal.co.za              → Next.js landing (Vercel)
capetown-halaal-portal      → Next.js admin portal (Vercel)
tickets.cthalaal.co.za      → WordPress + FooEvents (Cloudways)
```

## Hosting Recommendation
**Cloudways** - ~$14/mo (R250/mo)
- Best performance
- Cape Town server option (faster for SA)
- Easy WordPress management
- 3-day free trial

Alternative (budget): Hostinger ~$3/mo

## Tech Stack (Ticketing Site)
- WordPress
- WooCommerce (free)
- FooEvents (licensed)
- Custom dark theme CSS

## Brand Styling for WordPress
```css
/* Match landing page aesthetic */
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #111111;
  --accent: #cd2653;
  --accent-hover: #e02d5f;
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.6);
  --border: rgba(255, 255, 255, 0.1);
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', -apple-system, sans-serif;
}

.woocommerce .button,
.woocommerce button.button {
  background: var(--accent) !important;
  color: white !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  transition: all 0.15s ease !important;
}

.woocommerce .button:hover {
  background: var(--accent-hover) !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(205, 38, 83, 0.4);
}
```

## User Flow
```
1. User visits cthalaal.co.za (landing)
2. Clicks "Buy Tickets" button
3. Redirects to tickets.cthalaal.co.za
4. Selects ticket type/quantity
5. Checkout via WooCommerce (100+ payment gateways)
6. Receives email with QR code ticket
7. Uses FooEvents Check-in app at event
```

## Setup Steps (When Ready)

### 1. Cloudways Setup (~10 min)
- [ ] Sign up at cloudways.com
- [ ] Create new WordPress application
- [ ] Select DigitalOcean + Cape Town region
- [ ] Choose $14/mo plan (1GB RAM)

### 2. WordPress Config (~20 min)
- [ ] Install WooCommerce plugin
- [ ] Install FooEvents plugin (upload from purchase)
- [ ] Configure payment gateway (PayFast for SA, or Stripe)
- [ ] Set currency to ZAR

### 3. Branding (~30 min)
- [ ] Install dark theme or customize existing
- [ ] Add custom CSS (above)
- [ ] Upload logo
- [ ] Match fonts

### 4. Event Setup (~15 min)
- [ ] Create event product in WooCommerce
- [ ] Set ticket types (General, VIP, etc.)
- [ ] Set prices
- [ ] Configure FooEvents ticket settings
- [ ] Test purchase

### 5. Domain (~10 min)
- [ ] Add tickets.cthalaal.co.za in Cloudways
- [ ] Update DNS to point to Cloudways server
- [ ] Enable SSL

### 6. Integration (~5 min)
- [ ] Add "Buy Tickets" button to landing page
- [ ] Link: https://tickets.cthalaal.co.za
- [ ] Add link in portal dashboard

## Payment Gateway Options (South Africa)
| Gateway | Fees | Notes |
|---------|------|-------|
| PayFast | 3.5% + R2 | Most popular in SA |
| Yoco | 2.95% | Good for SA |
| Stripe | 2.9% + R5 | International |
| PayPal | 3.4% + R6 | Fallback option |

## FooEvents Features to Use
- QR code tickets (auto-generated)
- Check-in app (iOS/Android)
- Attendee management
- Ticket variations (General/VIP/Family)
- Custom ticket templates
- Export attendee lists

## Links
- FooEvents docs: https://help.fooevents.com/
- Cloudways: https://cloudways.com
- Landing: https://cthalaal.co.za
- Portal: https://capetown-halaal-portal.vercel.app

---
*Saved: February 2026*
*Ready to execute when needed*
