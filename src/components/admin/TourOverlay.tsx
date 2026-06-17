'use client'

import { useEffect, useState, useRef } from 'react'

interface TourOverlayProps {
  targetSelector?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
  onNext?: () => void
  onPrev?: () => void
  onClose?: () => void
  isFirst?: boolean
  isLast?: boolean
  navigating?: boolean
}

export function TourOverlay({
  targetSelector,
  placement = 'bottom',
  children,
  onNext,
  onPrev,
  onClose,
  isFirst,
  isLast,
  navigating,
}: TourOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!targetSelector) {
      setTargetRect(null)
      return
    }

    let attempts = 0
    const maxAttempts = 50
    const interval = setInterval(() => {
      const element = document.querySelector(targetSelector)
      if (element) {
        const rect = element.getBoundingClientRect()
        setTargetRect(rect)
        clearInterval(interval)
        
        // Scroll into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (attempts >= maxAttempts) {
        clearInterval(interval)
      }
      attempts++
    }, 100)

    return () => clearInterval(interval)
  }, [targetSelector])

  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect()
      setTooltipRect(rect)
    }
  }, [targetRect])

  const getTooltipPosition = () => {
    if (!targetRect || !tooltipRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

    const gap = 16
    const padding = 20

    switch (placement) {
      case 'top':
        return {
          bottom: `calc(100vh - ${targetRect.top - gap}px)`,
          left: `${Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipRect.width / 2, window.innerWidth - tooltipRect.width - padding))}px`,
        }
      case 'bottom':
        return {
          top: `${targetRect.bottom + gap}px`,
          left: `${Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipRect.width / 2, window.innerWidth - tooltipRect.width - padding))}px`,
        }
      case 'left':
        return {
          top: `${Math.max(padding, Math.min(targetRect.top + targetRect.height / 2 - tooltipRect.height / 2, window.innerHeight - tooltipRect.height - padding))}px`,
          right: `calc(100vw - ${targetRect.left - gap}px)`,
        }
      case 'right':
        return {
          top: `${Math.max(padding, Math.min(targetRect.top + targetRect.height / 2 - tooltipRect.height / 2, window.innerHeight - tooltipRect.height - padding))}px`,
          left: `${targetRect.right + gap}px`,
        }
    }
  }

  const tooltipPosition = getTooltipPosition()

  return (
    <>
      {/* Backdrop with cutout */}
      {targetRect && (
        <div
          className="fixed inset-0 z-[9998] pointer-events-none"
          style={{
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.6)`,
          }}
        />
      )}

      {/* Target highlight */}
      {targetRect && (
        <div
          className="fixed z-[9999] pointer-events-none border-2 border-[#cd2653] rounded-lg"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            boxShadow: '0 0 0 4px rgba(205, 38, 83, 0.3)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-md"
        style={tooltipPosition}
      >
        {children}
        
        {/* Tooltip arrow */}
        {targetRect && (
          <div
            className="absolute w-3 h-3 bg-white border-neutral-200 rotate-45"
            style={{
              [placement === 'top' ? 'bottom' : placement === 'bottom' ? 'top' : placement === 'left' ? 'right' : 'left']: '-6px',
              [placement === 'top' || placement === 'bottom' ? 'left' : 'top']: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              borderRight: placement === 'left' ? '1px solid' : 'none',
              borderBottom: placement === 'top' ? '1px solid' : 'none',
              borderLeft: placement === 'right' ? '1px solid' : 'none',
              borderTop: placement === 'bottom' ? '1px solid' : 'none',
              borderColor: '#e5e5e5',
            }}
          />
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between p-4 bg-neutral-50 border-t border-neutral-100 rounded-b-2xl">
          <div>
            {!isFirst && onPrev && (
              <button
                onClick={onPrev}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1"
              >
                ← Back
              </button>
            )}
            {isFirst && onClose && (
              <button
                onClick={onClose}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
              >
                Skip tour
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={isLast ? onClose : onNext}
              disabled={navigating}
              className="inline-flex items-center gap-1.5 bg-[#cd2653] hover:bg-[#b01f45] text-white font-semibold rounded-full px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {isLast ? 'Done' : navigating ? 'Loading...' : 'Next'}
              {!isLast && !navigating && <span>→</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
