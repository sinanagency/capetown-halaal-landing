'use client'

import { TYPE_META, type StallType } from '@/lib/stalls'

export interface MapStall {
  code: string
  type: StallType
  num: number
  col: number
  row: number
  w: number
  h: number
  status?: 'available' | 'held' | 'allocated'
  occupant?: { business_name?: string } | null
}

interface Props {
  stalls: MapStall[]
  grid: { cols: number; rows: number }
  zones: { label: string; col: number; row: number; w: number; h: number }[]
  mode?: 'admin' | 'exhibitor'
  selected?: string | null
  onSelect?: (code: string) => void
  mineCode?: string | null
  neighbourCodes?: string[]
}

const STATUS_FILL: Record<string, string> = {
  available: '#ffffff',
  held: '#fcd34d',
  allocated: '#22c55e',
}

export default function StallMap({ stalls, grid, zones, mode = 'admin', selected, onSelect, mineCode, neighbourCodes = [] }: Props) {
  const neighbours = new Set(neighbourCodes)

  function fillFor(s: MapStall): string {
    if (mode === 'exhibitor') {
      if (s.code === mineCode) return '#cd2653'
      if (neighbours.has(s.code)) return TYPE_META[s.type].color
      return '#eef0f2'
    }
    if (selected === s.code) return '#cd2653'
    if (s.status === 'allocated') return STATUS_FILL.allocated
    if (s.status === 'held') return STATUS_FILL.held
    return '#ffffff'
  }
  function strokeFor(s: MapStall): string {
    if (mode === 'exhibitor') {
      if (s.code === mineCode) return '#7c1d3a'
      if (neighbours.has(s.code)) return '#94a3b8'
      return '#dfe3e7'
    }
    if (selected === s.code) return '#7c1d3a'
    return TYPE_META[s.type].color
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${grid.cols} ${grid.rows}`}
        className="w-full h-auto select-none"
        style={{ minWidth: 640, background: '#f1f5f0', borderRadius: 8 }}
      >
        {/* zones */}
        {zones.map((z, i) => (
          <g key={`z-${i}`}>
            <rect x={z.col} y={z.row} width={z.w} height={z.h} fill="#ffffff" fillOpacity={0.5} stroke="#cbd5e1" strokeWidth={0.3} rx={1} />
            <text x={z.col + z.w / 2} y={z.row + z.h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(2.4, z.h * 0.5)} fill="#64748b" fontWeight={700}>
              {z.label}
            </text>
          </g>
        ))}

        {/* stalls */}
        {stalls.map((s) => {
          const interactive = mode === 'admin' && !!onSelect
          const isMine = mode === 'exhibitor' && s.code === mineCode
          return (
            <rect
              key={s.code}
              x={s.col}
              y={s.row}
              width={s.w}
              height={s.h}
              rx={0.6}
              fill={fillFor(s)}
              stroke={strokeFor(s)}
              strokeWidth={isMine || selected === s.code ? 0.8 : 0.3}
              className={interactive ? 'cursor-pointer hover:stroke-[#cd2653] [stroke-width:0.6] transition-colors' : ''}
              onClick={interactive ? () => onSelect!(s.code) : undefined}
            >
              <title>
                {s.code}
                {s.occupant?.business_name ? ` · ${s.occupant.business_name}` : s.status ? ` · ${s.status}` : ''}
              </title>
            </rect>
          )
        })}

        {/* exhibitor "you are here" pin */}
        {mode === 'exhibitor' && mineCode && (() => {
          const me = stalls.find((s) => s.code === mineCode)
          if (!me) return null
          return (
            <g>
              <circle cx={me.col + me.w / 2} cy={me.row + me.h / 2} r={Math.max(me.w, me.h) * 1.4} fill="none" stroke="#cd2653" strokeWidth={0.5} opacity={0.7}>
                <animate attributeName="r" values={`${Math.max(me.w, me.h)};${Math.max(me.w, me.h) * 2.2}`} dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <text x={me.col + me.w / 2} y={me.row - 1.5} textAnchor="middle" fontSize={2.6} fontWeight={800} fill="#cd2653">YOU ARE HERE</text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
