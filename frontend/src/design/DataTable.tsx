import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { clsx } from './clsx'
import type { StatusTier } from './types'

// QAI tables: ink header row in mono caps, soft row rules, framed box.
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="tt-box tt-box-sm overflow-x-auto">
      <table className="w-full border-collapse">{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead className="tt-thead">{children}</thead>
}

export function Th({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={clsx('px-3 py-2 text-left', className)} {...props}>
      {children}
    </th>
  )
}

interface TrProps {
  children: ReactNode
  /** Renders the 4px left-edge status border. Omit for rows with no health tier. */
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
        'border-b-2 border-line last:border-b-0 transition-colors hover:bg-elevated',
        statusTier && clsx('border-l-4', STATUS_BORDER[statusTier]),
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
        numeric && 'text-right font-mono tabular-nums whitespace-nowrap',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}
