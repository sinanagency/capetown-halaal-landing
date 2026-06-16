interface StatusPillProps {
  tone: 'success' | 'warn' | 'danger' | 'info' | 'neutral'
  label: string
}

const dotColours: Record<string, string> = {
  success: 'bg-[#16A34A]',
  warn: 'bg-[#D97706]',
  danger: 'bg-[#DC2626]',
  info: 'bg-[#2563EB]',
  neutral: 'bg-[#6B7280]',
}

const bgColours: Record<string, string> = {
  success: 'bg-[#DCFCE7]',
  warn: 'bg-[#FEF3C7]',
  danger: 'bg-[#FEE2E2]',
  info: 'bg-[#DBEAFE]',
  neutral: 'bg-[#F3F4F6]',
}

export function StatusPill({ tone, label }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-5 px-2.5 rounded-full text-xs font-medium ${bgColours[tone]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColours[tone]}`} />
      {label}
    </span>
  )
}
