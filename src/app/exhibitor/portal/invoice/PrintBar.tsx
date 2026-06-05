'use client'

export function PrintBar({ businessName }: { businessName: string }) {
  return (
    <div className="no-print sticky top-0 bg-[#cd2653] text-white px-6 py-3 flex items-center justify-between print:hidden z-10">
      <p className="text-sm">Invoice for {businessName}</p>
      <button
        onClick={() => window.print()}
        className="bg-white text-[#cd2653] rounded-lg px-4 py-1.5 text-sm font-semibold"
      >
        Save as PDF
      </button>
    </div>
  )
}
