import { CheckCircle2, Circle, CircleDot } from 'lucide-react'
import { loadTasks, type TaskStatus } from './TaskChecklist'

// Horizontal pill row shown at the top of each portal sub-page. Same data as
// TaskChecklist, compact render. Server component, no client JS.
export default async function MiniTaskStrip({ activeKey }: { activeKey?: 'contract' | 'payment' | 'documents' | 'staff' }) {
  const loaded = await loadTasks()
  if (!loaded) return null
  const { tasks } = loaded

  const required = tasks.filter((t) => t.status !== 'optional')
  const doneCount = required.filter((t) => t.status === 'done').length

  return (
    <div className="mb-6 rounded-2xl border border-[#E5E5E5]/60 bg-[#FDFAF1] px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#1B1A17]/55">
          Your progress: {doneCount} of {required.length} done
        </p>
        <a
          href="/exhibitor/portal"
          className="text-[11px] font-semibold text-[#cd2653] hover:underline"
        >
          See checklist
        </a>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tasks.map((t) => {
          const isActive = activeKey === t.key
          return (
            <a
              key={t.key}
              href={t.href}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                isActive
                  ? 'bg-[#cd2653] border-[#cd2653] text-white'
                  : t.status === 'done'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : t.status === 'in-progress'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : t.status === 'todo'
                  ? 'bg-white border-[#cd2653]/30 text-[#bf3026]'
                  : 'bg-white border-[#E5E5E5] text-[#1B1A17]/55'
              }`}
              title={shortLabelFor(t.key)}
            >
              <Glyph status={t.status} active={isActive} />
              <span className="font-semibold truncate">{shortLabelFor(t.key)}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

function shortLabelFor(k: 'contract' | 'payment' | 'documents' | 'staff') {
  switch (k) {
    case 'contract':
      return 'Sign'
    case 'payment':
      return 'Pay'
    case 'documents':
      return 'Documents'
    case 'staff':
      return 'Staff'
  }
}

function Glyph({ status, active }: { status: TaskStatus; active: boolean }) {
  const cls = active ? 'text-white' : ''
  if (status === 'done') return <CheckCircle2 className={`w-3.5 h-3.5 ${cls || 'text-emerald-600'}`} />
  if (status === 'in-progress') return <CircleDot className={`w-3.5 h-3.5 ${cls || 'text-amber-500'}`} />
  return <Circle className={`w-3.5 h-3.5 ${cls || 'text-[#1B1A17]/30'}`} />
}
