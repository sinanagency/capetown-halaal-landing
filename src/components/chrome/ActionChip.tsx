import { type ReactNode } from 'react'

interface ActionChipProps {
  icon: ReactNode
  label: string
  tone: 'lavender' | 'mint' | 'peach' | 'butter' | 'sky' | 'rose'
  onClick?: () => void
}

const chipBg: Record<string, string> = {
  lavender: 'bg-[#EEF0FB]',
  mint: 'bg-[#E7F5EE]',
  peach: 'bg-[#FBEEE6]',
  butter: 'bg-[#FBF6E1]',
  sky: 'bg-[#E5F0FB]',
  rose: 'bg-[#FBE8EC]',
}

const iconBg: Record<string, string> = {
  lavender: 'bg-[#6B7AC7]',
  mint: 'bg-[#5BA87B]',
  peach: 'bg-[#C9865E]',
  butter: 'bg-[#C4A83D]',
  sky: 'bg-[#5A8BC7]',
  rose: 'bg-[#C76B7F]',
}

export function ActionChip({ icon, label, tone, onClick }: ActionChipProps) {
  return (
    <button
      onClick={onClick}
      className={`h-[90px] rounded-lg p-3 flex flex-col justify-between text-left transition-opacity hover:opacity-90 ${chipBg[tone]}`}
    >
      <div
        className={`w-7 h-7 rounded flex items-center justify-center text-white ${iconBg[tone]}`}
      >
        {icon}
      </div>
      <span className="text-xs font-medium text-[var(--text-primary)] truncate">
        {label}
      </span>
    </button>
  )
}
