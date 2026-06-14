'use client'

// Shortcuts cheatsheet overlay. Triggered by `?`. Closes on Escape or click.

import { cn } from '@/lib/utils'

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['j'], label: 'Focus next row' },
  { keys: ['k'], label: 'Focus previous row' },
  { keys: ['a'], label: 'Approve focused row' },
  { keys: ['r'], label: 'Reject (prompts reason)' },
  { keys: ['i'], label: 'Request info (picks template)' },
  { keys: ['t'], label: 'Cycle sector tag' },
  { keys: ['s'], label: 'Snooze 24h' },
  { keys: ['m'], label: 'Open merge / dedupe drawer' },
  { keys: ['x'], label: 'Toggle bulk-select on focused row' },
  { keys: ['Enter'], label: 'Open detail page' },
  { keys: ['?'], label: 'Show this overlay' },
  { keys: ['Esc'], label: 'Close modal / drawer / overlay' },
]

export function ShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-900">Keyboard shortcuts</h3>
          <button
            onClick={onClose}
            className="text-xs text-neutral-500 hover:text-neutral-900"
          >
            close
          </button>
        </div>
        <ul className="grid grid-cols-1 gap-1.5">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className={cn(
                      'inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border border-neutral-300 bg-neutral-50 text-[11px] font-mono text-neutral-700'
                    )}
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
