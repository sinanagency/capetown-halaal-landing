'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Alignment = 'left' | 'right' | 'center'

interface Column<T> {
  key: string
  header: string
  width?: string
  render?: (row: T, index: number) => ReactNode
  mono?: boolean
  align?: Alignment
}

interface DenseTableProps<T extends Record<string, any>> {
  columns: Column<T>[]
  rows: T[]
  onRowClick?: (row: T, index: number) => void
  emptyState?: {
    illustration?: ReactNode
    label?: string
    cta?: ReactNode
  }
}

export function DenseTable<T extends Record<string, any>>({
  columns,
  rows,
  onRowClick,
  emptyState,
}: DenseTableProps<T>) {
  const alignClass = (align?: Alignment) => {
    if (align === 'right') return 'text-right'
    if (align === 'center') return 'text-center'
    return 'text-left'
  }

  return (
    <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'uppercase tracking-wider text-xs text-[var(--text-tertiary)] font-semibold h-11 px-4',
                    alignClass(col.align)
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  <div className="flex flex-col items-center justify-center gap-3 py-8">
                    {emptyState?.illustration}
                    <p className="text-sm text-[var(--text-tertiary)]">
                      {emptyState?.label ?? 'No data'}
                    </p>
                    {emptyState?.cta}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row, i)}
                  className={cn(
                    'h-14 border-b border-[var(--border)] last:border-b-0 text-sm',
                    onRowClick && 'cursor-pointer hover:bg-[var(--bg-hover)]'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4',
                        alignClass(col.align),
                        col.mono && 'font-mono text-xs tabular-nums'
                      )}
                    >
                      {col.render
                        ? col.render(row, i)
                        : (row[col.key] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
