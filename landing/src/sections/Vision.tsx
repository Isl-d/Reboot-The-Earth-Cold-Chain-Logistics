import Reveal from '@/components/Reveal'
import StatusChip from '@/components/StatusChip'
import { vision } from '@/content/copy'

// Beyond food: a compact band, clearly marked as a direction, not a product.
export default function Vision() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal from="left">
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase">{vision.eyebrow}</p>
            <StatusChip label="Designed, not built" />
          </div>
          <h2 className="mt-3 text-3xl leading-tight font-semibold tracking-[-0.02em] text-white">{vision.title}</h2>
          <p className="mt-4 leading-relaxed text-text-secondary">{vision.body}</p>
          <p className="mt-6 font-mono text-sm text-text-primary">
            {vision.chain.map((c, i) => (
              <span key={c}>
                {i > 0 && <span className="px-2 text-primary">→</span>}
                {c}
              </span>
            ))}
          </p>
        </Reveal>

        <Reveal from="right" delay={120}>
          <ul className="grid gap-px overflow-hidden rounded-md border border-dashed border-border bg-border/50 sm:grid-cols-2">
            {vision.fields.map((f) => (
              <li key={f.name} className="bg-base p-5">
                <p className="font-medium text-white">{f.name}</p>
                <p className="mt-1 text-sm leading-snug text-text-secondary">{f.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-text-secondary">{vision.note}</p>
        </Reveal>
      </div>
    </section>
  )
}
