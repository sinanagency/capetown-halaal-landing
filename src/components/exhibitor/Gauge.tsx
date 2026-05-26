export function Gauge({ pct, label, sublabel }: { pct: number; label: string; sublabel?: string }) {
  const r = 54
  const c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct))
  const off = c * (1 - clamped / 100)
  return (
    <div className="relative w-[132px] h-[132px]">
      <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="#f1e4e8" strokeWidth="11" />
        <circle cx="66" cy="66" r={r} fill="none" stroke="#cd2653" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-neutral-900 leading-none">{label}</span>
        {sublabel && <span className="text-[11px] text-neutral-500 mt-1">{sublabel}</span>}
      </div>
    </div>
  )
}
