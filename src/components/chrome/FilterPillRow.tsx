'use client'

import { type ReactNode, useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'

interface FilterPillRowProps {
  children: ReactNode
  showSearch?: boolean
  onSearch?: (value: string) => void
  searchPlaceholder?: string
  sortOptions?: { value: string; label: string }[]
  sortValue?: string
  onSortChange?: (value: string) => void
}

export function FilterPillRow({
  children,
  showSearch = false,
  onSearch,
  searchPlaceholder = 'Search...',
  sortOptions,
  sortValue,
  onSortChange,
}: FilterPillRowProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="flex flex-row gap-2 items-center flex-wrap">
      {children}
      {showSearch && (
        <div className="flex items-center gap-1">
          {searchOpen ? (
            <input
              type="text"
              placeholder={searchPlaceholder}
              onChange={(e) => onSearch?.(e.target.value)}
              className="h-8 px-3 rounded-full text-xs border border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] w-48"
              autoFocus
              onBlur={() => {
                if (!(document.activeElement?.tagName === 'INPUT')) {
                  setSearchOpen(false)
                }
              }}
            />
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors"
            >
              <Search size={14} />
            </button>
          )}
        </div>
      )}
      {sortOptions && sortValue && onSortChange && (
        <div className="relative ml-auto">
          <select
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-8 pl-3 pr-7 rounded-full text-xs font-medium bg-white border border-[var(--border)] text-neutral-600 appearance-none cursor-pointer outline-none hover:bg-neutral-100 transition-colors"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500"
          />
        </div>
      )}
    </div>
  )
}
