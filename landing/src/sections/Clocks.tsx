import ProvenanceTag from '@/components/ProvenanceTag'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import StatusChip from '@/components/StatusChip'
import { clocks, stack } from '@/content/copy'

// Safe is not the same as sellable: the two clocks side by side, and the
// Commercial Reserve formula where they meet.
export default function Clocks() {
  return (
    <section id="product" className="border-y border-border/50 bg-[#0a1520]">
      <div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeader eyebrow={clocks.eyebrow} title={clocks.title} body={clocks.body} from="left" />

        <div className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {clocks.items.map((c, i) => (
            <Reveal key={c.name} delay={i * 120} from={i === 0 ? 'left' : 'right'} className="h-full">
              <article className="flex h-full flex-col rounded-md border border-border/70 bg-base p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-text-secondary">{c.kind}</p>
                  <StatusChip label={c.status} />
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{c.name}</h3>
                <p className="mt-4 text-lg text-text-primary">“{c.question}”</p>

                <ol className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-text-secondary">
                  {c.clock.map((step, k) => (
                    <li key={step} className="flex items-center gap-2">
                      {k > 0 && (
                        <span aria-hidden className="text-primary">
                          →
                        </span>
                      )}
                      {step}
                    </li>
                  ))}
                </ol>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-5">
                  <p className="font-medium text-white">{c.goal}</p>
                  <ProvenanceTag tag={c.tag} />
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-4">
          <div className="grid grid-cols-1 gap-6 rounded-md border border-primary/40 bg-primary/5 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="max-w-2xl leading-relaxed text-text-primary">{clocks.footnote}</p>
              <p className="mt-2 text-sm text-text-secondary">Commercial Reserve lives where the two clocks meet.</p>
            </div>
            <div>
              <p className="font-mono text-2xl text-white sm:text-3xl">{stack.commercial.formula}</p>
              <dl className="mt-2 grid gap-0.5 text-xs text-text-secondary">
                {stack.commercial.terms.map((t) => (
                  <div key={t.sym} className="flex gap-2">
                    <dt className="w-6 font-mono text-primary">{t.sym}</dt>
                    <dd>{t.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
