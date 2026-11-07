import type { ReactNode } from 'react'
import { clsx } from './clsx'

export type StepState = 'done' | 'run' | 'idle'

export interface StepItem {
  label: ReactNode
  /** Mono sub-line: what the stage does or which file owns it. */
  detail?: ReactNode
  state: StepState
  /** Small mono tag after the label, e.g. "4 trucks" or a backend timing. */
  tag?: ReactNode
  /** Output of the stage, e.g. a <pre className="tt-pre"> or a value row. */
  children?: ReactNode
}

// QAI numbered pipeline: idle steps are faded, the running step pulses sky,
// finished steps turn lime. Purely presentational: state comes from the caller.
export default function Steps({ items, className }: { items: StepItem[]; className?: string }) {
  return (
    <ol className={clsx('m-0 grid list-none gap-2.5 p-0', className)}>
      {items.map((item, i) => (
        <li
          key={i}
          className={clsx('grid grid-cols-[36px_1fr] gap-3 transition-opacity duration-300', item.state === 'idle' && 'opacity-35')}
        >
          <span className={clsx('tt-step-n', item.state === 'done' && 'is-done', item.state === 'run' && 'is-run')}>{i + 1}</span>
          <div className="min-w-0">
            <b className="text-body-md">{item.label}</b>
            {item.tag && (
              <span className="ml-2 rounded border-2 border-ink bg-surface px-1.5 font-mono text-[11px] font-bold">{item.tag}</span>
            )}
            {item.detail && <span className="block font-mono text-[12px] opacity-80">{item.detail}</span>}
            {item.children}
          </div>
        </li>
      ))}
    </ol>
  )
}
