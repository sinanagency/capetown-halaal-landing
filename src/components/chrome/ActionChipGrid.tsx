import { type ReactNode } from 'react'

export function ActionChipGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {children}
    </div>
  )
}
