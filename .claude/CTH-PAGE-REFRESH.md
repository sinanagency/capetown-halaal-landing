# CTH Page Refresh — Shared Spec

Every admin + exhibitor portal page MUST use the new shared chrome at
`@/components/chrome/PageChrome`. Apply the refresh below to each page.

## Imports

```tsx
import {
  PageShell, PageHeader, Card, StatCard, Pill, Tabs,
  ButtonPrimary, ButtonSecondary, DataTable, KV, Empty,
} from '@/components/chrome/PageChrome'
```

## Palette tokens (use only these)

```
bg          #F6F2E8   ivory
panel       #FDFAF1   warm white
panel-soft  #F2EBD8
ink         #1B1A17
muted       rgba(27,26,23,.55)
brass       #B8924A
brass-soft  #E5DCC4
brand-red   #cd2653
brand-dark  #bf3026
```

## Typography

- Headings: `font-serif` (Fraunces). H1: `text-3xl md:text-4xl`.
- Body: default sans (Inter).
- Kickers: brand-red, small caps, `text-xs uppercase tracking-[0.22em]`.

## Refactor rules

1. **Wrap the whole page in `<PageShell>`.** This gives consistent bg + max-w + padding.
2. **Replace the existing page heading block with `<PageHeader>`** with: `kicker` (small caps brand-red label like "DASHBOARD" or "VENDOR INBOX"), `title` (Fraunces), optional `subtitle`, optional `actions` (right-aligned buttons).
3. **Replace bare `<div className="bg-white border ...">` cards with `<Card>`.** Card has the right padding + brass border + warm white panel bg.
4. **Top-of-page metric tiles → `<StatCard label value hint />`.**
5. **Tab bars → `<Tabs items active onChange />`** (pill style, brand-red active).
6. **Status chips → `<Pill tone />`** with tone of `success` / `warn` / `danger` / `brand` / `neutral`.
7. **Primary CTAs → `<ButtonPrimary>` (brand-red pill).** Secondary CTAs → `<ButtonSecondary>` (ivory pill with brass border).
8. **Listing tables → `<DataTable columns rows />`.**
9. **Key-value rows in side panels → `<KV label value />`.**
10. **Empty states → `<Empty title hint cta />`.**

## Hard rules

- DO NOT change any data fetching logic, state, or API contracts.
- DO NOT add em-dashes (`—`) anywhere user-facing. Use commas, periods, colons.
- DO preserve every existing behaviour: form submits, modals, redirects, search, sorting.
- DO ensure the page works on mobile (cards stack, table scrolls horizontally).
- DO NOT introduce new dependencies. Use Tailwind + existing lucide-react icons only.
- DO NOT break the auth check at the top of admin pages (`if (!user) redirect`).

## File-by-file checklist

For the page you are refactoring:
1. Add the imports from `@/components/chrome/PageChrome`.
2. Wrap the JSX return in `<PageShell>`.
3. Replace the existing page title with `<PageHeader>`.
4. Sweep through the JSX and replace dated cards / buttons / tabs / pills with the shared primitives.
5. Run `npx tsc --noEmit` mentally: do not introduce TS errors.
6. NEVER introduce an em-dash.

## Out of scope (do NOT touch)

- The login pages (`/admin/login`, `/exhibitor/login`) — they have their own custom hero design.
- The invoice page (`/exhibitor/portal/invoice`) — already styled for A4 print.
- The map-versions demo page.
- The floor command component (already in the right palette).
