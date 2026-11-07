import type { ReactNode } from 'react'
import { clsx } from './clsx'

export type OntologyTone = 'paper' | 'sky' | 'lime' | 'sun' | 'coral' | 'lilac'

export interface OntologyEntity {
  /** Mono caps entity type, e.g. "Truck", "Cargo", "Decision". */
  type: string
  value: ReactNode
  tone?: OntologyTone
}

const TONE: Record<OntologyTone, string> = {
  paper: 'bg-surface text-text-primary',
  sky: 'bg-fill-sky text-on-fill',
  lime: 'bg-fill-lime text-on-fill',
  sun: 'bg-fill-sun text-on-fill',
  coral: 'bg-fill-coral text-on-fill',
  lilac: 'bg-fill-lilac text-on-fill',
}

// QAI "how this answer is built" chain: entity boxes joined by relation
// arrows. relations[i] sits between entities[i] and entities[i + 1].
export default function Ontology({
  entities,
  relations,
  className,
}: {
  entities: OntologyEntity[]
  relations: string[]
  className?: string
}) {
  return (
    <div className={clsx('flex flex-wrap items-center gap-2 p-4', className)}>
      {entities.map((e, i) => (
        <span key={i} className="contents">
          <div className={clsx('max-w-[240px] rounded-md border-[3px] border-ink px-2.5 py-1.5 shadow-level1', TONE[e.tone ?? 'paper'])}>
            <div className="tt-caps">{e.type}</div>
            <b className="text-[14px] leading-tight">{e.value}</b>
          </div>
          {i < entities.length - 1 && relations[i] && (
            <span className="font-mono text-[12px] text-text-secondary">—{relations[i]}→</span>
          )}
        </span>
      ))}
    </div>
  )
}
