'use client'

export function AdminPageHeader({
  caption,
  title,
  subtitle,
  actions,
}: {
  caption?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 flex-1">
        {caption && (
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            {caption}
          </p>
        )}
        <h1 className="font-serif text-2xl font-semibold text-neutral-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
