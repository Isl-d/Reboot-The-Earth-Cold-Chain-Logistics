import ProvenanceTag, { type ProvenanceTagName } from '@/components/ProvenanceTag'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import { trust } from '@/content/copy'

export default function Provenance() {
  return (
    <section id="trust" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
      <SectionHeader eyebrow={trust.eyebrow} title={trust.title} body={trust.body} />

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trust.tags.map((t, i) => (
          <Reveal key={t.tag} delay={i * 60}>
            <div className="lift h-full rounded-md border border-border/70 bg-surface p-5">
              <ProvenanceTag tag={t.tag as ProvenanceTagName} />
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{t.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
