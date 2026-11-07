import { useState } from 'react'
import ProvenanceTag from '@/components/ProvenanceTag'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import { contact, software } from '@/content/copy'
import shot from '@/assets/media/command-center.jpg'

// The command center as an operator sees it, with numbered pins that match the
// list beside it. The screenshot is the simulator's fleet and is tagged so.
export default function Software() {
  const [hot, setHot] = useState<number | null>(null)

  return (
    <section id="software" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
      <SectionHeader eyebrow={software.eyebrow} title={software.title} body={software.body} from="left" />

      <div className="mt-14 grid grid-cols-1 gap-8 xl:grid-cols-[1.6fr_0.6fr] xl:items-start">
        <Reveal from="zoom">
          <figure>
            <div className="relative overflow-hidden rounded-md border border-border/70 shadow-[0_40px_90px_-40px_rgba(0,200,224,0.45)]">
              <img
                src={shot}
                width={1600}
                height={1000}
                loading="lazy"
                decoding="async"
                alt="The Thermal Trace command center: headline figures, a live map of Doha, active incidents, sensor monitoring and simulation control."
                className="block h-auto w-full"
              />
              {software.callouts.map((c) => (
                <span
                  key={c.n}
                  aria-hidden
                  className={`pin absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-mono text-xs font-semibold transition-transform duration-200 sm:size-7 ${
                    hot === c.n ? 'scale-125 bg-white text-[var(--color-base)]' : 'bg-primary text-on-accent'
                  }`}
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                >
                  {c.n}
                </span>
              ))}
            </div>
            <figcaption className="mt-3 flex items-start gap-2 text-sm text-text-secondary">
              <ProvenanceTag tag="SYNTHETIC" className="mt-0.5 shrink-0" />
              {software.caption}
            </figcaption>
          </figure>
        </Reveal>

        <Reveal from="right" delay={120}>
          <ol className="grid gap-1 sm:grid-cols-2 xl:grid-cols-1">
            {software.callouts.map((c) => (
              <li
                key={c.n}
                onMouseEnter={() => setHot(c.n)}
                onMouseLeave={() => setHot(null)}
                className="flex gap-3 rounded-sm p-3 transition-colors hover:bg-surface"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-semibold text-on-accent">
                  {c.n}
                </span>
                <div>
                  <p className="font-medium text-white">{c.name}</p>
                  <p className="text-sm leading-snug text-text-secondary">{c.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <a
            href={contact.demo}
            className="btn-shine mt-6 inline-block rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-on-accent transition-colors hover:bg-primary-dim"
          >
            {software.cta}
          </a>
        </Reveal>
      </div>
    </section>
  )
}
