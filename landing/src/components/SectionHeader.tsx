import type { ReactNode } from 'react'
import Reveal, { useInView, type RevealFrom } from './Reveal'
import SplitWords from './SplitWords'

// Eyebrow and body slide in from `from`; the title's words follow one by one.
export default function SectionHeader({
  eyebrow,
  title,
  body,
  aside,
  from = 'below',
}: {
  eyebrow: string
  title: string
  body?: string
  aside?: ReactNode
  from?: RevealFrom
}) {
  const [ref, visible] = useInView<HTMLHeadingElement>()
  return (
    <div className="max-w-3xl">
      <Reveal from={from}>
        <p className="mb-3 font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase">{eyebrow}</p>
      </Reveal>
      <h2
        ref={ref}
        className="text-3xl leading-tight font-semibold tracking-[-0.02em] text-balance text-white sm:text-4xl"
      >
        <SplitWords text={title} show={visible} from={from} delay={100} />
      </h2>
      {body && (
        <Reveal from={from} delay={250}>
          <p className="mt-4 text-base leading-relaxed text-pretty text-text-secondary sm:text-lg">{body}</p>
        </Reveal>
      )}
      {aside && (
        <Reveal from={from} delay={350} className="mt-4">
          {aside}
        </Reveal>
      )}
    </div>
  )
}
