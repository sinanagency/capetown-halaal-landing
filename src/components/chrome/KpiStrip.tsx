import { type ReactNode } from 'react'

export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-row flex-wrap gap-6 sm:gap-12 bg-[var(--bg-elevated)] py-4 pb-5 px-6 rounded-lg overflow-hidden">
      {children}
    </div>
  )
}
