import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import { contact, pilot } from '@/content/copy'

// How a customer starts: the pilot as a sequence, the 1x / 3x promise, and the
// three things we sell. No prices on the page by decision; they are set per
// customer from the pilot's measured results.
export default function Pilot() {
  return (
    <section id="pilot" className="border-y border-border/50 bg-[#0a1520]">
      <div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeader eyebrow={pilot.eyebrow} title={pilot.title} body={pilot.body} from="left" />

        <ol className="mt-14 grid gap-px overflow-hidden rounded-md border border-border/70 bg-border/70 md:grid-cols-2 xl:grid-cols-4">
          {pilot.steps.map((s, i) => (
            <li key={s.name} className="bg-base">
              <Reveal delay={i * 90} className="h-full p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-sm text-primary">{i + 1}</span>
                  <span className="text-sm text-text-secondary">{s.time}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{s.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{s.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal from="left" className="h-full">
            <div className="flex h-full flex-col justify-between rounded-md border border-primary/50 bg-primary/10 p-6 sm:p-8">
              <p className="text-4xl leading-tight font-semibold tracking-[-0.02em] text-white sm:text-5xl">{pilot.promise.big}</p>
              <p className="mt-6 leading-relaxed text-text-primary">{pilot.promise.body}</p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-3">
            {pilot.tiers.map((t, i) => (
              <Reveal key={t.name} delay={i * 90} className="h-full">
                <div className="h-full rounded-md border border-border/70 bg-base p-5">
                  <p className="text-sm text-text-secondary">{t.when}</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{t.name}</h3>
                  <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                    {t.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-text-secondary">{pilot.priceNote}</p>
          <a
            href={contact.pilot}
            className="btn-shine rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-on-accent transition-colors hover:bg-primary-dim"
          >
            {pilot.cta}
          </a>
        </Reveal>
      </div>
    </section>
  )
}
