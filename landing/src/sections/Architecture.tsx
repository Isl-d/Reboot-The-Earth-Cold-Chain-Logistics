import type { CSSProperties } from 'react'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import { architecture } from '@/content/copy'

export default function Architecture() {
  return (
    <section id="architecture" className="border-y border-border/50 bg-[#0a1520]">
      <div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeader eyebrow={architecture.eyebrow} title={architecture.title} body={architecture.body} from="right" />

        <Reveal className="mt-14">
          {/* A reading "travels" left to right: each node lights in turn. */}
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
            {architecture.flow.map((node, i) => (
              <li key={node} className="flex items-center gap-2">
                <span
                  className="flow-node rounded-sm border border-border/70 bg-surface px-3 py-2 font-mono text-xs text-text-primary sm:text-sm"
                  style={{ '--i': i } as CSSProperties}
                >
                  {node}
                </span>
                {i < architecture.flow.length - 1 && (
                  <span aria-hidden className="flow-arrow inline-block text-primary" style={{ '--i': i } as CSSProperties}>
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="mt-8">
          <div className="inline-flex items-center gap-3 rounded-sm border border-border/70 bg-base px-4 py-3 font-mono text-sm">
            <span className="text-text-secondary">$</span>
            <span className="text-white">{architecture.command}</span>
            <span aria-hidden className="cursor" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
