import type { ReactNode } from 'react'
import { clsx, FOCUS_RING } from './clsx'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

// QAI modal: framed box with an ink header bar.
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
        className="tt-box w-full max-w-lg"
      >
        <div className="tt-hd tt-tone-ink">
          <h2 className="m-0 text-headline-sm">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={clsx(FOCUS_RING, 'rounded-sm px-1 text-lg leading-none opacity-80 hover:opacity-100')}
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
