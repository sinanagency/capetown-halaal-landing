'use client'

// Phone-grouped dedupe drawer.
// Clusters incoming rows by last-9 of phone (we already know Supabase has a
// functional index on regexp_replace(phone,'\D','','g') so this matches the
// detection on the backend). Each cluster shows all members compactly with
// a radio for "keeper"; submit posts to /api/admin/applications/dedupe.

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { X, Loader2 } from 'lucide-react'
import type { WorkbenchApplication } from './types'

function last9(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D+/g, '').slice(-9)
}

export function DedupeDrawer({
  open,
  rows,
  onClose,
  onSubmitted,
}: {
  open: boolean
  rows: WorkbenchApplication[]
  onClose: () => void
  onSubmitted: () => void
}) {
  // Cluster by phone last-9. A cluster must have >=2 rows AND a non-empty key.
  const clusters = useMemo(() => {
    const map = new Map<string, WorkbenchApplication[]>()
    for (const r of rows) {
      if (r.is_duplicate) continue // already merged
      const key = last9(r.phone)
      if (!key) continue
      const list = map.get(key) ?? []
      list.push(r)
      map.set(key, list)
    }
    return [...map.entries()]
      .filter(([, list]) => list.length >= 2)
      .map(([key, list]) => ({ key, list: list.sort(byOldestFirst) }))
      .sort((a, b) => b.list.length - a.list.length)
  }, [rows])

  // keeper per cluster, defaulting to oldest row (heuristic: oldest is
  // usually the canonical application; later ones tend to be duplicates).
  const [keeperByCluster, setKeeperByCluster] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function submitCluster(clusterKey: string, all: WorkbenchApplication[]) {
    const keeperId = keeperByCluster[clusterKey] ?? all[0].id
    const supersededIds = all.filter((r) => r.id !== keeperId).map((r) => r.id)
    if (supersededIds.length === 0) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/applications/dedupe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keeper_id: keeperId, superseded_ids: supersededIds }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        window.alert(j?.error || 'Dedupe failed.')
        return
      }
      onSubmitted()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-neutral-900/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Dedupe clusters"
    >
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-neutral-200">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Dedupe queue</h3>
            <p className="text-[11px] text-neutral-500">
              {clusters.length} phone cluster{clusters.length === 1 ? '' : 's'} with 2+ rows.
              Pick the keeper, others get marked is_duplicate=true.
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {clusters.length === 0 ? (
            <div className="text-sm text-neutral-500 py-10 text-center">
              No duplicates detected in the current queue slice.
            </div>
          ) : (
            clusters.map(({ key, list }) => {
              const keeperId = keeperByCluster[key] ?? list[0].id
              return (
                <section
                  key={key}
                  className="border border-neutral-200 rounded-xl overflow-hidden"
                >
                  <header className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-600">
                      phone …{key} · {list.length} rows
                    </span>
                    <button
                      disabled={busy}
                      onClick={() => submitCluster(key, list)}
                      className="px-2.5 py-1 text-[11px] rounded-md bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                      Merge {list.length - 1} into keeper
                    </button>
                  </header>
                  <ul>
                    {list.map((r) => {
                      const checked = r.id === keeperId
                      return (
                        <li
                          key={r.id}
                          className={cn(
                            'px-3 py-2 grid grid-cols-[20px_1fr_auto] items-center gap-3 text-sm border-b border-neutral-100 last:border-b-0',
                            checked && 'bg-emerald-50/60'
                          )}
                        >
                          <input
                            type="radio"
                            name={`keeper-${key}`}
                            checked={checked}
                            onChange={() =>
                              setKeeperByCluster((m) => ({ ...m, [key]: r.id }))
                            }
                            aria-label={`Pick ${r.business_name} as keeper`}
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-neutral-900 truncate">{r.business_name}</div>
                            <div className="text-[11px] text-neutral-500 truncate">
                              {r.contact_name} · {r.email} · {r.status}
                            </div>
                          </div>
                          <div className="text-[11px] text-neutral-400 tabular-nums">
                            {new Date(r.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function byOldestFirst(a: WorkbenchApplication, b: WorkbenchApplication): number {
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}
