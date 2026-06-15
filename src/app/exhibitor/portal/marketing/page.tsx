// Vendor marketing kit page.
//
// Combines two ideas:
//   (i) auto-filled per-vendor PNG templates (IG Story, IG Feed, FB Post,
//       Find-Us link card) generated server-side from the vendor's
//       business_name + stall_code + logo via Puppeteer.
//   (iii) a shared festival brand pack the vendor can lift verbatim
//        (logos, colour codes, hashtags, hero images, suggested caption).
//
// Auth: the per-vendor PNG routes are session-gated, so the page itself only
// renders when the exhibitor session resolves an application row. Anonymous
// hits would render a usable brand pack but no auto-fill cards, so we gate
// the page entirely behind requirePaid() to stay consistent with the rest
// of the portal.
//
// Doctrine:
//   - Law 2 (PII): every per-vendor download goes through a session-gated
//     API route. The page itself only echoes the vendor's own data.
//   - Law 7 (no em-dashes): all copy strings here use commas / periods /
//     colons. The grep is run by the doctrine-reviewer before merge.

import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { parseAllocation } from '@/lib/stalls'
import { requirePaid } from '@/lib/exhibitor-paygate'
import { PageShell, PageHeader, Card, Pill } from '@/components/chrome/PageChrome'
import { Download, Sparkles, Hash, Palette, Image as ImageIcon } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface AssetCard {
  key: string
  label: string
  dims: string
  use: string
  href: string
  ratio: string // tailwind aspect-ratio class for the preview
}

const ASSET_CARDS: AssetCard[] = [
  {
    key: 'ig-story',
    label: 'Instagram Story',
    dims: '1080 x 1920',
    use: 'Share to your IG / Facebook story. Tall vertical canvas.',
    href: '/api/exhibitor/portal/marketing/ig-story/png',
    ratio: 'aspect-[9/16]',
  },
  {
    key: 'ig-feed',
    label: 'Instagram Feed Post',
    dims: '1080 x 1080',
    use: 'Square post for the IG grid or a Facebook feed post.',
    href: '/api/exhibitor/portal/marketing/ig-feed/png',
    ratio: 'aspect-square',
  },
  {
    key: 'fb-post',
    label: 'Facebook Post',
    dims: '1200 x 630',
    use: 'Wide post or shared link preview on Facebook and LinkedIn.',
    href: '/api/exhibitor/portal/marketing/fb-post/png',
    ratio: 'aspect-[1200/630]',
  },
  {
    key: 'link-card',
    label: 'Find Us at CTH Card',
    dims: '1200 x 630',
    use: 'Drop in WhatsApp, email signatures, or as a link preview.',
    href: '/api/exhibitor/portal/marketing/link-card/png',
    ratio: 'aspect-[1200/630]',
  },
]

const BRAND_COLORS = [
  { name: 'Crimson', hex: '#cd2653', subtle: 'Primary brand colour. Buttons, badges, link accents.' },
  { name: 'Cream',   hex: '#F8F5EE', subtle: 'Soft background. Letting the logo breathe.' },
  { name: 'Charcoal', hex: '#1A1A1A', subtle: 'Headlines and high-contrast type.' },
]

const HASHTAGS = ['#YoungAtHeartFest', '#CapeTownHalaal', '#CTH2026', '#HalaalCapeTown', '#Youngsfield2026']

const HERO_IMAGES = [
  { src: '/about/festival-crowd.jpg', alt: 'Festival crowd at Youngsfield' },
  { src: '/about/festival-food.jpg', alt: 'Halaal festival food stall' },
  { src: '/gallery/gallery-3214.jpg', alt: 'Festival vendor stand' },
  { src: '/gallery/gallery-3367.jpg', alt: 'Festival atmosphere at golden hour' },
  { src: '/gallery/gallery-3412.jpg', alt: 'Live entertainment crowd shot' },
  { src: '/gallery/gallery-3450.jpg', alt: 'Festival vendor handing over food' },
]

const SUGGESTED_CAPTION =
  "Come find us at Cape Town's biggest halaal festival, 11 to 13 December 2026 at Youngsfield Military Base. " +
  "Three days of food, family, and a real Young at Heart vibe. Tickets at cthalaal.co.za. " +
  "#YoungAtHeartFest #CapeTownHalaal #CTH2026"

export default async function MarketingPage() {
  await requirePaid()
  const ctx = await getExhibitorContext()
  const app = (ctx?.application as Record<string, unknown>) || {}
  const state = parsePortalState((app.admin_notes as string) || null)
  const stall = parseAllocation((app.admin_notes as string) || null).stall || 'TBA'
  const businessName = ((app.business_name as string) || 'Your stall').replace(/^DEMO\s*·?\s*/i, '')
  const hasLogo = Boolean(state.profile?.logo_path)

  return (
    <PageShell>
      <PageHeader
        kicker="Marketing kit"
        title="Tell people where to find you."
        subtitle="Download ready to share assets with your stall code baked in, plus the festival brand pack so your audience knows it is the real Cape Town Halaal."
      />

      {/* Section 1: per-vendor auto-filled assets */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#cd2653]" />
            <h2 className="font-serif text-2xl text-[#1B1A17]">Your auto-filled assets</h2>
          </div>
          <Pill tone="brand">Stall {stall}</Pill>
        </div>
        <p className="text-sm text-[#1B1A17]/60 mb-6 max-w-2xl">
          Every download below is rendered live with your business name, your stall code, and your logo. {hasLogo ? null : (
            <>Add your logo on the <a className="underline text-[#cd2653]" href="/exhibitor/portal/profile">Profile</a> page so it shows on the assets. The festival logo is used until you do.</>
          )}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ASSET_CARDS.map((a) => (
            <Card key={a.key} className="flex flex-col">
              {/* preview frame: hits the same route so we get the real PNG.
                  loading="lazy" so the four don't fight each other on load. */}
              <div className={`w-full ${a.ratio} bg-[#F8F5EE] rounded-xl overflow-hidden border border-[#E5E5E5]/60 mb-4`}>
                <img
                  src={a.href}
                  alt={`${a.label} preview`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mb-1 flex items-center justify-between">
                <h3 className="font-semibold text-[#1B1A17]">{a.label}</h3>
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#1B1A17]/50">{a.dims}</span>
              </div>
              <p className="text-xs text-[#1B1A17]/60 leading-relaxed mb-4 min-h-[2.5em]">{a.use}</p>
              <a
                href={a.href}
                download
                className="mt-auto inline-flex items-center justify-center gap-2 bg-[#cd2653] hover:bg-[#bf3026] text-white text-sm font-medium rounded-full px-4 py-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </a>
            </Card>
          ))}
        </div>
      </section>

      {/* Section 2: shared festival brand pack */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-[#cd2653]" />
          <h2 className="font-serif text-2xl text-[#1B1A17]">Shared festival brand pack</h2>
        </div>
        <p className="text-sm text-[#1B1A17]/60 mb-6 max-w-2xl">
          Use these everywhere you talk about being at the festival. Same logos, same colours, same hashtags as the official accounts.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Logos card */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-[#cd2653]" />
              <h3 className="font-semibold text-[#1B1A17]">Festival logos</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#F8F5EE] rounded-lg aspect-square flex items-center justify-center p-4">
                <img src="/logo.png" alt="CTH logo full colour" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="bg-[#1A1A1A] rounded-lg aspect-square flex items-center justify-center p-4">
                <img src="/logo.png" alt="CTH logo on dark" className="max-w-full max-h-full object-contain invert" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <a href="/logo.png" download="CTH-logo.png" className="inline-flex items-center gap-2 text-xs font-medium text-[#cd2653] hover:underline">
                <Download className="w-3 h-3" /> Full colour PNG
              </a>
              <a href="/icon.svg" download="CTH-logo.svg" className="inline-flex items-center gap-2 text-xs font-medium text-[#cd2653] hover:underline">
                <Download className="w-3 h-3" /> Vector SVG
              </a>
              <a href="/icon-512.png" download="CTH-logo-square.png" className="inline-flex items-center gap-2 text-xs font-medium text-[#cd2653] hover:underline">
                <Download className="w-3 h-3" /> Square avatar PNG
              </a>
            </div>
          </Card>

          {/* Colours card */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-[#cd2653]" />
              <h3 className="font-semibold text-[#1B1A17]">Brand colours</h3>
            </div>
            <ul className="space-y-3">
              {BRAND_COLORS.map((c) => (
                <li key={c.hex} className="flex items-center gap-3">
                  <span
                    className="w-12 h-12 rounded-lg border border-[#E5E5E5] shrink-0"
                    style={{ background: c.hex }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-[#1B1A17]">{c.name}</span>
                      <code className="font-mono text-xs text-[#1B1A17]/80 bg-[#F8F5EE] px-2 py-0.5 rounded">{c.hex}</code>
                    </div>
                    <p className="text-[11px] text-[#1B1A17]/55 mt-0.5">{c.subtle}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Hashtags + caption card */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-[#cd2653]" />
              <h3 className="font-semibold text-[#1B1A17]">Hashtags and caption</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {HASHTAGS.map((h) => (
                <code key={h} className="font-mono text-[11px] text-[#cd2653] bg-[#cd2653]/8 border border-[#cd2653]/15 px-2 py-1 rounded">
                  {h}
                </code>
              ))}
            </div>
            <p className="text-xs text-[#1B1A17]/55 uppercase tracking-[0.16em] font-semibold mb-1">Suggested caption</p>
            <p className="text-sm text-[#1B1A17]/80 leading-relaxed">
              {SUGGESTED_CAPTION}
            </p>
          </Card>
        </div>

        {/* Hero photos */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="w-4 h-4 text-[#cd2653]" />
            <h3 className="font-semibold text-[#1B1A17]">Festival hero photos</h3>
          </div>
          <p className="text-xs text-[#1B1A17]/55 mb-4">
            Generic festival shots you can pair with your own photos. Credit Cape Town Halaal where it makes sense.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {HERO_IMAGES.map((img) => (
              <a
                key={img.src}
                href={img.src}
                download
                className="group relative block aspect-square rounded-lg overflow-hidden bg-[#F8F5EE] border border-[#E5E5E5]/60"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-[#1A1A1A]/0 group-hover:bg-[#1A1A1A]/40 transition-colors flex items-end justify-end p-2">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-[#1B1A17] text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-full inline-flex items-center gap-1">
                    <Download className="w-3 h-3" /> Save
                  </span>
                </div>
              </a>
            ))}
          </div>
        </Card>

        <p className="text-xs text-[#1B1A17]/50 mt-6 max-w-3xl">
          A friendly note: please do not crop or recolour the festival logo, and keep the dates and venue accurate. {businessName} is the only business you can attach to these auto-filled assets, so they are safe to share anywhere.
        </p>
      </section>
    </PageShell>
  )
}
