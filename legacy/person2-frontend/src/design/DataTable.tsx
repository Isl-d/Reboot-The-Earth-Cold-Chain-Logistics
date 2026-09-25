import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { clsx } from './clsx'
import type { StatusTier } from './types'

// DESIGN.md → Components → Grid Data Tables
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse">{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-line-strong bg-canvas">{children}</thead>
}

export function Th({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={clsx('px-3 py-2 text-left text-label-ui uppercase text-muted', className)}
      {...props}
    >
      {children}
    </th>
  )
}

interface TrProps {
  children: ReactNode
  /** Renders the 3px left-edge status border. Omit for rows with no health tier. */
  statusTier?: StatusTier
  className?: string
}

const STATUS_BORDER: Record<StatusTier, string> = {
  safe: 'border-l-status-safe',
  warning: 'border-l-status-warning',
  critical: 'border-l-status-critical',
  offline: 'border-l-status-offline',
}

export function Tr({ children, statusTier, className }: TrProps) {
  return (
    <tr
      className={clsx(
        'border-b border-line last:border-b-0',
        statusTier && clsx('border-l-[3px]', STATUS_BORDER[statusTier]),
        className,
      )}
    >
      {children}
    </tr>
  )
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Right-aligns in monospace — use for every metric, currency, and duration. */
  numeric?: boolean
}

export function Td({ className, numeric, children, ...props }: TdProps) {
  return (
    <td
      className={clsx(
        'px-3 py-2 text-body-md text-navy',
        numeric && 'text-right font-mono tabular-nums',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}
