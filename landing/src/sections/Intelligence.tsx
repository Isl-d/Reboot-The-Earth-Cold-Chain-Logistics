import type { CSSProperties } from 'react'
import ProvenanceTag from '@/components/ProvenanceTag'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import { intelligence } from '@/content/copy'

// The pipeline every reading runs through, then the two AI systems that sit
// beside it and may never produce a number.
export default function Intelligence() {
  return (
    <section className="border-y border-border/50 bg-[#0a1520]">
      <div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeader eyebrow={intelligence.eyebrow} title={intelligence.title} body={intelligence.body} from="left" />

        <Reveal className="mt-12">
          <p className="mb-3 text-sm text-text-secondary">{intelligence.pipelineNote}</p>
          {/* A reading "travels" left to right: each step lights in turn. */}
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
            {intelligence.pipeline.map((node, i) => (
              <li key={node} className="flex items-center gap-2">
                <span
                  className="flow-node rounded-sm border border-border/70 bg-surface px-3 py-2 font-mono text-xs text-text-primary sm:text-sm"
                  style={{ '--i': i } as CSSProperties}
                >
                  {node}
                </span>
                {i < intelligence.pipeline.length - 1 && (
                  <span aria-hidden className="flow-arrow inline-block text-primary" style={{ '--i': i } as CSSProperties}>
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {intelligence.systems.map((s, i) => (
            <Reveal key={s.name} delay={i * 120} className="h-full">
              <article className="h-full rounded-md border border-border/70 bg-base p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{s.name}</h3>
                    <p className="mt-0.5 text-sm text-text-secondary">{s.role}</p>
                  </div>
                  <ProvenanceTag tag={s.tag} />
                </div>
                <p className="mt-4 leading-relaxed text-text-secondary">{s.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
