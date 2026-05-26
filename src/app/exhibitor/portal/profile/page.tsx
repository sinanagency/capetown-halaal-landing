import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import ProfileEditor from '@/components/exhibitor/ProfileEditor'

export const dynamic = 'force-dynamic'

function publicUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vendor-assets/${path}`
}

export default async function ProfilePage() {
  const ctx = await getExhibitorContext()
  const app = ctx?.application
  const state = parsePortalState(app?.admin_notes as string)
  const p = state.profile || {}

  const initial = {
    business_name: (app?.business_name as string) || '',
    tagline: p.tagline ?? '',
    description: p.description ?? (app?.business_description as string) ?? '',
    website: p.website ?? (app?.website as string) ?? '',
    instagram: p.instagram ?? (app?.instagram as string) ?? '',
    facebook: p.facebook ?? (app?.facebook as string) ?? '',
    menu: p.menu ?? [],
    logo_url: p.logo_path ? publicUrl(p.logo_path) : null,
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Profile</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">{initial.business_name}</h1>
        <p className="text-neutral-500 text-sm mt-1">This is what festival-goers see in the public vendor directory.</p>
      </div>
      <ProfileEditor initial={initial} />
    </div>
  )
}
