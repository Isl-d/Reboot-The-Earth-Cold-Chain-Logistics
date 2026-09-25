import type { ReactNode } from 'react'
import Reveal from './Reveal'

export default function SectionHeader({
  eyebrow,
  title,
  body,
  aside,
}: {
  eyebrow: string
  title: string
  body?: string
  aside?: ReactNode
}) {
  return (
    <Reveal className="max-w-3xl">
      <p className="mb-3 font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase">{eyebrow}</p>
      <h2 className="text-3xl leading-tight font-semibold tracking-[-0.02em] text-balance text-white sm:text-4xl">
        {title}
      </h2>
      {body && <p className="mt-4 text-base leading-relaxed text-pretty text-text-secondary sm:text-lg">{body}</p>}
      {aside && <div className="mt-4">{aside}</div>}
    </Reveal>
  )
}
