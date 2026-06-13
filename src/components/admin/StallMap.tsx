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
  mode?: 'admin' | 'exhibitor' | 'vendor'
  selected?: string | null
  onSelect?: (code: string) => void
  mineCode?: string | null
  neighbourCodes?: string[]
}

const STATUS_FILL: Record<string, string> = {
  available: 'rgba(255,255,255,.6)',
  held: '#fcd34d',
  allocated: '#cd2653', // brand-red
}

const STATUS_STROKE: Record<string, string> = {
  available: '#d8d2c4',
  held: '#d4a01a',
  allocated: '#bf3026', // brand-dark
}

export default function StallMap({ stalls, grid, zones, mode = 'admin', selected, onSelect, mineCode, neighbourCodes = [] }: Props) {
  const neighbours = new Set(neighbourCodes)

  function fillFor(s: MapStall): string {
    if (mode === 'exhibitor') {
      if (s.code === mineCode) return '#cd2653'
      if (neighbours.has(s.code)) return TYPE_META[s.type].color
      return 'rgba(255,255,255,.6)'
    }
    // vendor + admin both show full occupancy; vendor also highlights "mine"
    if (mode === 'vendor' && s.code === mineCode) return '#cd2653'
    if (selected === s.code) return 'rgba(205,38,83,.18)'
    if (s.status === 'allocated') return STATUS_FILL.allocated
    if (s.status === 'held') return STATUS_FILL.held
    return STATUS_FILL.available
  }

  function strokeFor(s: MapStall): string {
    if (mode === 'exhibitor') {
      if (s.code === mineCode) return '#bf3026' // brand-dark
      if (neighbours.has(s.code)) return '#B8924A' // brass
      return '#d8d2c4' // available stroke
    }
    if (mode === 'vendor' && s.code === mineCode) return '#bf3026' // brand-dark
    if (selected === s.code) return '#cd2653' // brand-red
    if (s.status === 'allocated') return STATUS_STROKE.allocated
    if (s.status === 'held') return STATUS_STROKE.held
    return STATUS_STROKE.available
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${grid.cols} ${grid.rows}`}
        className="w-full h-auto select-none"
        style={{ minWidth: 640, background: '#F6F2E8', borderRadius: 8 }}
      >
        {/* zones */}
        {zones.map((z, i) => (
          <g key={`z-${i}`}>
            <rect x={z.col} y={z.row} width={z.w} height={z.h} fill="#ffffff" fillOpacity={0.5} stroke="#B8924A" strokeWidth={0.3} rx={1} />
            <text
              x={z.col + z.w / 2}
              y={z.row + z.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.min(2.4, z.h * 0.5)}
              fill="#B8924A"
              fontWeight={700}
              className="font-sans uppercase tracking-[0.2em]"
            >
              {z.label}
            </text>
          </g>
        ))}

        {/* stalls */}
        {stalls.map((s) => {
          const interactive = mode === 'admin' && !!onSelect
          const isMine = (mode === 'exhibitor' || mode === 'vendor') && s.code === mineCode
          const isSelected = selected === s.code

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
              strokeWidth={isMine || isSelected ? (isSelected ? 1.6 : 0.8) : 0.3}
              className={`${isSelected ? 'drop-shadow ' : ''}${
                interactive
                  ? 'cursor-pointer transition-colors hover:stroke-[#cd2653]/50 hover:brightness-[1.08]'
                  : ''
              }`}
              onClick={interactive ? () => onSelect!(s.code) : undefined}
            >
              <title>
                {s.code}
                {s.occupant?.business_name ? ` · ${s.occupant.business_name}` : s.status ? ` · ${s.status}` : ''}
              </title>
            </rect>
          )
        })}

        {/* "you are here" pin (exhibitor + vendor views) */}
        {(mode === 'exhibitor' || mode === 'vendor') && mineCode && (() => {
          const me = stalls.find((s) => s.code === mineCode)
          if (!me) return null
          return (
            <g>
              <defs>
                <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#cd2653" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#E8C679" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              <circle cx={me.col + me.w / 2} cy={me.row + me.h / 2} r={Math.max(me.w, me.h) * 1.4} fill="none" stroke="url(#pulseGradient)" strokeWidth={0.5} opacity={0.7}>
                <animate attributeName="r" values={`${Math.max(me.w, me.h) * 1.4};${Math.max(me.w, me.h) * 2.8}`} dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <text x={me.col + me.w / 2} y={me.row - 1.5} textAnchor="middle" fontSize={2.6} fontWeight={800} fill="#cd2653">YOU ARE HERE</text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
