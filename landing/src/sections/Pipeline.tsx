import type { CSSProperties } from 'react'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import { pipeline } from '@/content/copy'

export default function Pipeline() {
  return (
    <section id="how" className="border-y border-border/50 bg-[#0a1520]">
      <div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeader eyebrow={pipeline.eyebrow} title={pipeline.title} from="right" />

        <ol className="mt-14 grid gap-px overflow-hidden rounded-md border border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-3">
          {pipeline.steps.map((step, i) => (
            <li key={step.name} className="group relative bg-base transition-colors duration-300 hover:bg-surface">
              {/* Data sweeps through the stages in order, on a loop. */}
              <span
                aria-hidden
                className="stage-bar absolute inset-x-0 top-0 h-0.5 bg-primary shadow-[0_0_12px_var(--color-primary)]"
                style={{ '--i': i } as CSSProperties}
              />
              <Reveal delay={i * 80} from={(['left', 'below', 'right'] as const)[i % 3]} className="h-full p-6 sm:p-7">
                <p className="font-mono text-xs text-primary">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-3 text-lg font-semibold text-white transition-transform duration-300 group-hover:translate-x-1">
                  {step.name} <span className="font-normal text-text-secondary">{step.verb}</span>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
