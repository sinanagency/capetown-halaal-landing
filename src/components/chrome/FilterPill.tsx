import { cn } from '@/lib/utils'

interface FilterPillProps {
  label: string
  active?: boolean
  count?: number
  onClick?: () => void
}

export function FilterPill({ label, active = false, count, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-8 px-3 rounded-full text-xs font-medium transition-colors inline-flex items-center',
        active
          ? 'bg-neutral-900 text-white'
          : 'bg-white border border-[var(--border)] text-neutral-600 hover:bg-neutral-100'
      )}
    >
      {label}
      {count !== undefined && (
        <span className="tabular-nums text-[var(--text-tertiary)] ml-1.5">
          {count}
        </span>
      )}
    </button>
  )
}
