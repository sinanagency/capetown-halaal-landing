'use client'
import { useState, useEffect } from 'react'

interface Props { applicationId: string }

const DEFAULT_PREFS = {
  payment_whatsapp: true,
  payment_email: true,
  announcement_whatsapp: false,
  announcement_email: true,
  document_whatsapp: true,
  document_email: true,
}

export default function NotificationPreferences({ applicationId }: Props) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`notif-prefs-${applicationId}`)
    if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) })
  }, [applicationId])

  const toggle = (key: keyof typeof DEFAULT_PREFS) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    localStorage.setItem(`notif-prefs-${applicationId}`, JSON.stringify(next))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3">
      {[
        { key: 'payment_whatsapp' as const, label: 'Payment confirmations — WhatsApp' },
        { key: 'payment_email' as const, label: 'Payment confirmations — Email' },
        { key: 'announcement_whatsapp' as const, label: 'Festival announcements — WhatsApp' },
        { key: 'announcement_email' as const, label: 'Festival announcements — Email' },
        { key: 'document_whatsapp' as const, label: 'Document updates — WhatsApp' },
        { key: 'document_email' as const, label: 'Document updates — Email' },
      ].map(({ key, label }) => (
        <label key={key} className="flex items-center justify-between text-sm">
          <span>{label}</span>
          <button
            onClick={() => toggle(key)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              prefs[key] ? 'bg-[#cd2653]' : 'bg-neutral-300'
            }`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              prefs[key] ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </label>
      ))}
      {saved && <p className="text-xs text-emerald-600">Preferences saved</p>}
    </div>
  )
}
