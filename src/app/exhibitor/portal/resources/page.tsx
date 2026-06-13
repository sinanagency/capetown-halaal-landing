import { Calendar, MapPin, Mail, FileCheck, Users, CreditCard, Download, ArrowRight, Megaphone } from 'lucide-react'
import {
  PageShell, PageHeader, Card
} from '@/components/chrome/PageChrome'

export const dynamic = 'force-dynamic'

const QUICK = [
  { href: '/exhibitor/portal/documents', label: 'Upload compliance documents', icon: FileCheck },
  { href: '/exhibitor/portal/staff', label: 'Register your gate staff', icon: Users },
  { href: '/exhibitor/portal/stand', label: 'Find your stand on the map', icon: MapPin },
  { href: '/exhibitor/portal/payments', label: 'Stall fee & payments', icon: CreditCard },
]

export default function ResourcesPage() {
  return (
    <PageShell>
      <PageHeader
        kicker="Resources"
        title="Everything you need to know"
      />

      <div className="space-y-6">
        {/* essentials */}
        <Card className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3"><Calendar className="w-4 h-4 text-[#cd2653] mt-0.5" /><div><p className="font-medium text-[#1B1A17]">11 – 13 December 2026</p><p className="text-[#1B1A17]/55 text-xs">Three-day festival</p></div></div>
          <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-[#cd2653] mt-0.5" /><div><p className="font-medium text-[#1B1A17]">Youngsfield Military Base</p><p className="text-[#1B1A17]/55 text-xs">Wetton Road, Cape Town</p></div></div>
          <div className="flex items-start gap-3"><Mail className="w-4 h-4 text-[#cd2653] mt-0.5" /><div><p className="font-medium text-[#1B1A17]">support@youngatheart.co.za</p><p className="text-[#1B1A17]/55 text-xs">Organiser support</p></div></div>
          <div className="flex items-start gap-3"><Megaphone className="w-4 h-4 text-[#cd2653] mt-0.5" /><div><p className="font-medium text-[#1B1A17]">Load-in times & manual</p><p className="text-[#1B1A17]/55 text-xs">Posted in Announcements closer to the date</p></div></div>
        </Card>

        {/* quick actions */}
        <Card>
          <p className="font-semibold text-[#1B1A17] mb-4">Get show-ready</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {QUICK.map((q) => (
              <a key={q.href} href={q.href} className="flex items-center justify-between p-3 rounded-lg border border-[#B8924A]/40 hover:border-[#cd2653] group">
                <span className="flex items-center gap-2 text-sm text-[#1B1A17]/70"><q.icon className="w-4 h-4 text-[#cd2653]" />{q.label}</span>
                <ArrowRight className="w-4 h-4 text-[#1B1A17]/20 group-hover:text-[#cd2653]" />
              </a>
            ))}
          </div>
        </Card>

        {/* brand assets */}
        <Card>
          <p className="font-semibold text-[#1B1A17] mb-1">Brand assets</p>
          <p className="text-xs text-[#1B1A17]/55 mb-4">Use the festival logo when you promote your stall.</p>
          <a href="/logo.png" download className="inline-flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 border border-[#B8924A]/40 hover:border-[#cd2653] hover:text-[#cd2653]">
            <Download className="w-4 h-4" /> Festival logo (PNG)
          </a>
        </Card>
      </div>
    </PageShell>
  )
}
