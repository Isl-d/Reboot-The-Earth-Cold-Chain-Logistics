import type { ReactNode } from 'react'

export interface BreakdownRow {
  /** Mono code, e.g. "TR" or "Tf". */
  code: string
  label: ReactNode
  /** Already formatted by the caller from a backend value. */
  value: ReactNode
  /** Operator shown before the value, e.g. "−" or "+". */
  sign?: string
  /** Optional provenance badge or note after the label. */
  note?: ReactNode
}

// QAI term table: code · label · signed value, ending in a lime result row.
// Presentational only: every value is a backend number formatted by the caller.
export default function Breakdown({ rows, total }: { rows: BreakdownRow[]; total: BreakdownRow }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[14px]">
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-b-2 border-line">
              <td className="w-14 px-3 py-2 font-mono font-bold">{r.code}</td>
              <td className="px-3 py-2">
                {r.label}
                {r.note && <span className="ml-2 inline-flex align-middle">{r.note}</span>}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
                {r.sign}
                {r.value}
              </td>
            </tr>
          ))}
          <tr className="bg-fill-lime font-bold text-on-fill">
            <td className="px-3 py-2 font-mono">{total.code}</td>
            <td className="px-3 py-2">
              {total.label}
              {total.note && <span className="ml-2 inline-flex align-middle">{total.note}</span>}
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">{total.value}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
