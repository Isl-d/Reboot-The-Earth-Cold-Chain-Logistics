import type { ReactNode } from 'react'
import { clsx, FOCUS_RING } from './clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

// DESIGN.md → Elevation & Depth → Surface Level 3
export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.65)] p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={clsx('w-full max-w-lg rounded-xl bg-card p-6 shadow-level3')}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-headline-md text-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={clsx(FOCUS_RING, 'rounded text-muted hover:text-navy')}
          >
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
