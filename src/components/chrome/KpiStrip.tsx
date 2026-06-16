import { type ReactNode } from 'react'

export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-row gap-12 bg-[var(--bg-elevated)] py-4 pb-5 px-6 rounded-lg">
      {children}
    </div>
  )
}
