# CTH Floor Command Aesthetic Guide

The visual language for the festival floor allocation surfaces (admin + exhibitor). This is what Taona wants. Match it.

## Reference deliverables
- **Functionality reference**: `~/Downloads/01_floor_map.html` (mode toggle, click-to-allocate, drawer, search, toast, mobile bottom-sheet).
- **Feel reference**: `~/Desktop/cth-allocation-prototypes/05-atlas.html` (Atlas variant — ivory + brass + Fraunces + Inter + glass floats + slow elegant motion).
- **Site palette** (canonical, already in this repo): brand-red `#cd2653`, brand-red-dark `#bf3026`, ivory `#F6F2E8`, ink `#1B1A17`, brass `#B8924A`, brass-light `#E8C679`.

## Palette tokens to use

```
ivory       #F6F2E8   page background (warm white)
ink         #1B1A17   primary text
brass       #B8924A   small accents, dividers, neighbour outlines
brass-light #E8C679   hover / soft highlight
brand-red   #cd2653   selected stall, primary CTA, "YOU ARE HERE"
brand-dark  #bf3026   primary CTA hover
line        rgba(27,26,23,.14)   borders, dividers
glass       rgba(246,242,232,.92) + backdrop-filter:blur(10px)
status:
  available  fill rgba(255,255,255,.6)  stroke #d8d2c4
  held       fill #fcd34d                stroke #d4a01a
  allocated  fill var(--brand-red)       stroke var(--brand-dark)
  selected   fill rgba(205,38,83,.18)    stroke var(--brand-red) stroke-width 1.6
  facility   fill #d8d2c4                stroke #b4ad9d
```

## Type

- **Brand header / titles**: Fraunces (already in repo via `font-serif`), italic optional, weight 600.
- **Body / labels / numerics**: Inter (`font-sans`), small caps + letter-spacing for kickers (`text-xs uppercase tracking-[0.2em]`).
- **No em-dashes** in any user-facing copy (use commas / periods / colons).

## Chrome conventions

- Page background = ivory (`bg-[#F6F2E8]`).
- Cards: white surfaces only when high-data density; otherwise glass floats `bg-[#F6F2E8]/92 backdrop-blur-md` + `border-[color:var(--line)]`.
- Border radius: cards `rounded-2xl`, pills/buttons `rounded-full`, stalls in SVG `rx={0.6}`.
- Shadows: soft long shadows `shadow-[0_8px_28px_rgba(27,26,23,.12)]` only on floating glass elements.

## Motion

- All transitions 200–250ms `ease-out` for buttons / hover.
- Drawer slide-in 320ms `cubic-bezier(.2,.8,.2,1)`.
- Selected-stall fill transitions 150ms.

## Mode chip

Top-right pill chip "ADMIN | VENDOR" — only renders the active one bold, brand-red. Inactive = ink at 50% opacity. Pill background ivory at 60%.

## Drawer / modal

- Right-side drawer on desktop (`width: 360px`), bottom sheet on mobile (`max-h: 62vh`, slides up from bottom).
- Header: kicker `text-xs uppercase tracking-[0.2em] text-brand-red` over Fraunces 24px stall code.
- Action buttons: primary brand-red full-width, secondary ivory-glass with brass border.
- No em-dashes in copy.

## CTH legal/voice doctrine to obey (from project CLAUDE.md)

- Allocations persist via `⟦STALL:code⟧` markers on `vendor_applications.admin_notes` (NEVER create a stalls table — DDL is blocked).
- Vendor PII never leaks to public pages.
- Stick to existing API contracts: `/api/admin/stalls` GET/POST, `/api/exhibitor/map` GET.
- No em-dashes anywhere vendor-facing.
- All deploys via `vercel --prod` from project root.

## What to keep unchanged

- Props on `<StallMap />` — both pages depend on them.
- Data shapes from the APIs.
- Tab structure on vendor-ops page (allocation / payments / documents / broadcast).
- The existing animated "YOU ARE HERE" pulsing circle in vendor mode.

## What to upgrade visually

1. Stall fills + strokes match the palette table above.
2. Zone labels become small-caps brass.
3. Selected-stall halo = brand-red with a soft glow `drop-shadow`.
4. Map background = ivory (not the existing `#f1f5f0`).
5. Hover state on admin-mode stalls = brand-red 50% opacity stroke + brightness boost.
6. Page-level surfaces (cards, counters, drawers) move from neutral grays to the ivory/brass system above.
