'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface RightDrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
}

export function RightDrawer({ open, onClose, title, children }: RightDrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-[480px] bg-[var(--bg-surface)] shadow-lg border-l border-[var(--border)] z-50 transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 className="font-serif text-lg text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto h-[calc(100vh-61px)]">
          {children}
        </div>
      </div>
    </>
  )
}
