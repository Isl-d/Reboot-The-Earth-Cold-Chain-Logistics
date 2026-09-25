import type { ReactNode } from 'react'
import { clsx, FOCUS_RING } from './clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

// DESIGN.md → modal: elevated tone, 6px radius, no shadow.
export default function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg border border-line bg-elevated p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-headline-md text-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={clsx(FOCUS_RING, 'rounded-sm text-muted hover:text-navy')}
          >
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
