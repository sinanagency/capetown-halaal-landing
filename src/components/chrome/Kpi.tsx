import { cn } from '@/lib/utils'

interface KpiProps {
  label: string
  value: React.ReactNode
  delta?: { value: string; positive: boolean }
  hint?: string
}

export function Kpi({ label, value, delta, hint }: KpiProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="uppercase tracking-wider text-[var(--text-tertiary)] text-xs font-semibold">
        {label}
      </span>
      <span className="font-serif text-[var(--text-primary)] text-3xl">
        {value}
      </span>
      {delta && (
        <span
          className={cn(
            'text-xs',
            delta.positive ? 'text-green-600' : 'text-red-600'
          )}
        >
          {delta.value}
        </span>
      )}
      {hint && (
        <span className="text-xs text-[var(--text-tertiary)]">{hint}</span>
      )}
    </div>
  )
}
