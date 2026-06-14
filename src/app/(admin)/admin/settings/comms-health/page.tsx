import Link from 'next/link'
import { ChevronLeft, MessageCircle, Mail, Cpu } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Channel = {
  key: 'whatsapp' | 'email' | 'dgx'
  label: string
  Icon: typeof MessageCircle
  status: 'unknown'
  description: string
}

// Placeholder health board. Sprint 2 wires each pill to a real probe (Meta
// graph ping for WhatsApp, GoDaddy SMTP NOOP for email, DGX heartbeat). Until
// those probes land we deliberately report "Probe pending, not monitored" so
// Samreen doesn't read a green pill and miss a real outage.
const CHANNELS: Channel[] = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    Icon: MessageCircle,
    status: 'unknown',
    description: 'Meta Cloud API delivery channel.',
  },
  {
    key: 'email',
    label: 'Email',
    Icon: Mail,
    status: 'unknown',
    description: 'GoDaddy SMTP confirmations + Resend blasts.',
  },
  {
    key: 'dgx',
    label: 'DGX',
    Icon: Cpu,
    status: 'unknown',
    description: 'Inference / summarisation backend.',
  },
]

const PILL_STYLE: Record<Channel['status'], string> = {
  unknown: 'bg-neutral-100 text-neutral-600 border-neutral-200',
}

const PILL_LABEL: Record<Channel['status'], string> = {
  unknown: 'Probe pending, not monitored',
}

export default function SettingsCommsHealthPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 mb-3"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Settings
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Comms Health</h1>
        <p className="text-sm text-neutral-500 mt-1">
          No channels are monitored yet. Live probes land next sprint, treat every row as unknown until then.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CHANNELS.map(({ key, label, Icon, status, description }) => (
          <div
            key={key}
            className="bg-white border border-neutral-200 rounded-xl p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#cd2653]/10 text-[#cd2653]">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-neutral-900">{label}</span>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PILL_STYLE[status]}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                {PILL_LABEL[status]}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
              {description}
            </p>
            <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
              Live status will land in the next sprint. For now treat as unknown.
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
