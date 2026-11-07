import ProvenanceTag from '@/components/ProvenanceTag'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import { trust } from '@/content/copy'

// The provenance tags every value carries, then the commitments a buyer's QA
// and IT teams ask about first.
export default function Provenance() {
  return (
    <section id="trust" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
      <SectionHeader eyebrow={trust.eyebrow} title={trust.title} body={trust.body} from="zoom" />

      <Reveal className="mt-12">
        <dl className="grid gap-px overflow-hidden rounded-md border border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-3">
          {trust.tags.map((t) => (
            <div key={t.tag} className="flex flex-col gap-2 bg-base p-5">
              <dt>
                <ProvenanceTag tag={t.tag} />
              </dt>
              <dd className="text-sm leading-relaxed text-text-secondary">{t.body}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {trust.commitments.map((c, i) => (
          <Reveal key={c.name} delay={i * 80}>
            <div className="border-l-2 border-primary pl-5">
              <h3 className="text-lg font-semibold text-white">{c.name}</h3>
              <p className="mt-1.5 leading-relaxed text-text-secondary">{c.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
