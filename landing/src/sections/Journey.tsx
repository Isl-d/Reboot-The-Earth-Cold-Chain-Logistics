import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import BackgroundVideo from '@/components/BackgroundVideo'
import DigitalOverlay from '@/components/DigitalOverlay'
import ProvenanceTag, { type ProvenanceTagName } from '@/components/ProvenanceTag'
import type { RevealFrom } from '@/components/Reveal'
import SplitWords from '@/components/SplitWords'
import { journey } from '@/content/copy'
import { decision, temperatureTrace, truck, warehouses } from '@/content/demo'

// A pinned film of the cold chain, quay to cold store. The stage sticks to the
// viewport while the section scrolls past; each screen of scroll is one
// chapter. The active chapter's clip plays and the rest pause, its words fly in
// from the edge named in copy.ts, and the "documents" (manifest, telemetry,
// incident, decision) pop in over the footage.
//
// Every figure on the documents comes from content/demo.ts, the scripted T102
// story, and is tagged SIMULATED. The footage is AI-generated and says so.

const chapters = journey.chapters
const N = chapters.length
const safeMax = truck.safeBandC[1]
// Scroll distance per chapter, in viewport heights; lower moves faster.
const CHAPTER_SVH = 60
// Clips fetched ahead of the one on screen, so a fast scroll never waits.
const AHEAD = 2

function DocCard({
  title,
  tag,
  from,
  delay,
  className = '',
  children,
}: {
  title: string
  tag?: ProvenanceTagName
  from: RevealFrom
  delay: number
  className?: string
  children: ReactNode
}) {
  return (
    <div
      data-from={from}
      className={`doc-card w-full max-w-sm rounded-md border border-border/80 bg-base/90 p-4 shadow-[0_24px_60px_-28px_rgba(0,200,224,0.55)] ${className}`}
      style={{ '--d': `${delay}ms` } as CSSProperties}
    >
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-border/60 pb-2.5">
        <p className="truncate font-mono text-[11px] tracking-[0.1em] text-text-secondary uppercase">{title}</p>
        {tag && <ProvenanceTag tag={tag} />}
      </div>
      {children}
    </div>
  )
}

function Row({ k, v, accent }: { k: string; v: string; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <span className="text-text-secondary">{k}</span>
      <span className="font-mono text-white" style={accent ? { color: accent } : undefined}>
        {v}
      </span>
    </div>
  )
}

// The documents for each chapter. The first one is also shown on phones.
function documents(id: (typeof chapters)[number]['id']): ReactNode[] {
  const peak = temperatureTrace.at(-1)!
  switch (id) {
    case 'port':
      return [
        <DocCard key="m" title="Load manifest" tag="SIMULATED" from="right" delay={220}>
          <Row k="Truck" v={truck.id} />
          <Row k="Cargo" v={truck.cargo} />
          <Row k="Mass" v={`${truck.massKg} kg`} />
          <Row k="Safe band" v={`${truck.safeBandC[0]}–${safeMax} °C`} accent="var(--color-risk-low)" />
        </DocCard>,
        <DocCard key="h" title="Hand-offs ahead" from="below" delay={400}>
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 font-mono text-xs text-text-primary">
            {chapters.slice(1).map((c, i) => (
              <li key={c.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-primary">→</span>}
                <span className="rounded-sm border border-border/70 px-1.5 py-0.5">{c.label}</span>
              </li>
            ))}
          </ol>
        </DocCard>,
      ]
    case 'lift':
      return [
        <DocCard key="t" title={`coldchain/trucks/${truck.id}/telemetry`} tag="SIMULATED" from="left" delay={220}>
          <pre className="font-mono text-[13px] leading-6 text-text-primary">
            {[
              ['{', ''],
              ['  "truckId": ', `"${truck.id}",`],
              ['  "temperatureC": ', `${temperatureTrace[0]},`],
              ['  "doorOpen": ', 'false,'],
              ['  "refrigerationOn": ', 'true'],
              ['}', ''],
            ].map(([k, v], i) => (
              <span key={i} className="type-line block" style={{ '--d': `${320 + i * 70}ms` } as CSSProperties}>
                {k}
                <span className="text-primary">{v}</span>
              </span>
            ))}
          </pre>
        </DocCard>,
        <DocCard key="f" title="Ingest path" from="above" delay={480}>
          <p className="font-mono text-xs text-text-primary">
            MQTT <span className="text-primary">→</span> FastAPI <span className="text-primary">→</span> Postgres + Redis
          </p>
        </DocCard>,
      ]
    case 'handover':
      return [
        <DocCard key="e" title="Thermal exposure" tag="CALCULATED" from="right" delay={220}>
          <p className="font-mono text-lg text-white">
            E = ∫ max(0, T − T<sub className="text-xs">limit</sub>) dt
          </p>
          <p className="mt-2 text-xs text-text-secondary">°C·min above the limit · deterministic Python, never a model</p>
        </DocCard>,
        <DocCard key="d" title={`Event · ${truck.id}`} tag="SIMULATED" from="below" delay={420}>
          <p className="flex items-center gap-2 font-mono text-sm text-risk-medium">
            <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-risk-medium" />
            DOOR_OPENED
          </p>
        </DocCard>,
      ]
    case 'road':
      return [
        <DocCard key="r" title={`Cargo temperature · ${truck.id}`} tag="SIMULATED" from="left" delay={220}>
          <div className="flex items-end justify-between gap-3">
            <p className="font-mono text-4xl font-medium text-risk-critical">
              {peak.toFixed(1)}
              <span className="ml-1 text-lg text-text-secondary">°C</span>
            </p>
            <span className="mb-1 rounded-sm border border-risk-critical/50 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-risk-critical">
              ABOVE {safeMax} °C
            </span>
          </div>
          <div className="mt-3 flex h-14 items-end gap-1.5" aria-hidden>
            {temperatureTrace.map((c, i) => (
              <span
                key={i}
                className="bar-grow flex-1 rounded-t-sm"
                style={
                  {
                    height: `${(c / peak) * 100}%`,
                    background: c > safeMax ? 'var(--color-risk-critical)' : 'var(--color-risk-low)',
                    '--d': `${360 + i * 60}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </DocCard>,
        <DocCard key="i" title="Incident opened" tag="SIMULATED" from="right" delay={500}>
          <p className="flex items-center gap-2 font-mono text-sm text-risk-high">
            <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-risk-critical" />
            {truck.id} · risk HIGH · refrigeration off
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Opened when the reading left {truck.safeBandC[0]}–{safeMax} °C and stayed out.
          </p>
        </DocCard>,
      ]
    case 'store':
      return [
        <DocCard key="s" title="Cold stores in range" tag="SIMULATED" from="right" delay={220}>
          <ul className="space-y-1.5">
            {warehouses.map((w) => (
              <li
                key={w.id}
                className={`flex items-center justify-between rounded-sm border px-3 py-1.5 font-mono text-sm ${
                  w.selected ? 'selected-pulse border-primary bg-primary/10 text-white' : 'border-border/60 text-text-secondary'
                }`}
              >
                <span>{w.id}</span>
                <span>{w.etaMin} min</span>
              </li>
            ))}
          </ul>
        </DocCard>,
        <DocCard key="d" title="Decision" tag="SIMULATED" from="below" delay={440}>
          <p className="font-mono text-xl text-primary">
            {decision.action} → {decision.target}
          </p>
          <p className="mt-1 text-xs text-text-secondary">Food saved is computed live by the food-loss engine.</p>
        </DocCard>,
      ]
  }
}

export default function Journey() {
  const sectionRef = useRef<HTMLElement>(null)
  const railRef = useRef<HTMLOListElement>(null)
  const [active, setActive] = useState(0)
  const [onScreen, setOnScreen] = useState(false)
  // Clips are fetched only once the section is close: the current chapter and
  // the next AHEAD. A fetched clip stays mounted.
  const [loaded, setLoaded] = useState<boolean[]>(() => chapters.map(() => false))

  useEffect(() => {
    const section = sectionRef.current
    const rail = railRef.current
    if (!section || !rail) return
    let raf = 0
    const measure = () => {
      raf = 0
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - vh)))
      // Written straight to the rail (not the stage) so scrolling restyles a
      // few bars, not every layer over the video, and never re-renders React.
      rail.style.setProperty('--p', String(p))
      const i = Math.min(N - 1, Math.floor(p * N))
      setActive(i)
      setOnScreen(rect.top < vh && rect.bottom > 0)
      if (rect.top < vh * 2 && rect.bottom > -vh) {
        setLoaded((prev) => {
          const next = prev.map((v, j) => v || (j >= i && j <= i + AHEAD))
          return next.every((v, j) => v === prev[j]) ? prev : next
        })
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const goTo = (i: number) => {
    const section = sectionRef.current
    if (!section) return
    const total = section.offsetHeight - window.innerHeight
    window.scrollTo({ top: section.offsetTop + (total * (i + 0.15)) / N, behavior: 'smooth' })
  }

  const current = chapters[active]

  return (
    <section
      id="journey"
      ref={sectionRef}
      aria-label={journey.eyebrow}
      className="relative"
      style={{ height: `${100 + N * CHAPTER_SVH}svh` }}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-base [contain:paint]">
        {/* Footage: every scene stays mounted; only the active one plays. */}
        {chapters.map((c, i) => (
          <div key={c.id} aria-hidden className={`journey-scene absolute inset-0 ${i === active ? 'is-active' : ''}`}>
            <BackgroundVideo
              name={c.video}
              playing={onScreen && i === active}
              load={loaded[i]}
              className="journey-video"
            />
          </div>
        ))}
        <DigitalOverlay />
        {/* Shade behind whichever side the words are on. */}
        <div
          aria-hidden
          className={`absolute inset-0 bg-[linear-gradient(90deg,rgba(12,24,37,0.92)_0%,rgba(12,24,37,0.6)_42%,rgba(12,24,37,0.1)_75%)] transition-opacity duration-700 ${current.side === 'left' ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          aria-hidden
          className={`absolute inset-0 bg-[linear-gradient(270deg,rgba(12,24,37,0.92)_0%,rgba(12,24,37,0.6)_42%,rgba(12,24,37,0.1)_75%)] transition-opacity duration-700 ${current.side === 'right' ? 'opacity-100' : 'opacity-0'}`}
        />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,24,37,0.7)_0%,transparent_22%,transparent_55%,rgba(12,24,37,0.9)_100%)] lg:bg-[linear-gradient(180deg,rgba(12,24,37,0.6)_0%,transparent_20%,transparent_80%,rgba(12,24,37,0.7)_100%)]" />

        {/* HUD: scene counter and footage provenance. */}
        <div className="absolute inset-x-0 top-20 z-10 mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-5 sm:top-24 sm:px-8">
          <p className="font-mono text-[11px] tracking-[0.14em] text-primary uppercase">
            {journey.eyebrow} ·{' '}
            <span className="text-white">
              {String(active + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
            </span>{' '}
            <span className="hidden text-text-secondary sm:inline">· {current.label}</span>
          </p>
          <ProvenanceTag tag="AI-GENERATED" />
        </div>

        {/* Chapters: words on one side, documents on the other. */}
        <div className="absolute inset-0 mx-auto grid max-w-[1400px] grid-cols-1 grid-rows-[1fr_auto] gap-6 px-5 pt-32 pb-28 sm:px-8 lg:grid-cols-2 lg:grid-rows-1 lg:gap-16 lg:pt-28 lg:pb-32">
          {chapters.map((c, i) => {
            const on = i === active
            const left = c.side === 'left'
            return (
              <article
                key={c.id}
                aria-hidden={!on}
                className={`contents ${on ? 'is-active' : ''}`}
              >
                <div
                  className={`chapter-copy col-start-1 row-start-2 min-w-0 self-end lg:row-start-1 lg:self-center ${left ? 'lg:col-start-1' : 'lg:col-start-2'} ${on ? '' : 'pointer-events-none'}`}
                >
                  <p className="fly font-mono text-xs tracking-[0.14em] text-primary uppercase" data-from={c.from} style={{ '--d': '0ms' } as CSSProperties}>
                    {String(i + 1).padStart(2, '0')} · {c.label}
                  </p>
                  <h2 className="mt-3 text-3xl leading-[1.08] font-bold tracking-[-0.025em] text-balance text-white sm:text-5xl xl:text-6xl">
                    <SplitWords text={c.title} show={on} from={c.from} delay={60} step={40} />
                  </h2>
                  <p
                    className="fly mt-5 max-w-xl text-base leading-relaxed text-pretty text-text-primary sm:text-lg"
                    data-from={c.from}
                    style={{ '--d': '240ms' } as CSSProperties}
                  >
                    {c.body}
                  </p>
                  {i === N - 1 && (
                    <a
                      href="#demo"
                      data-from="below"
                      style={{ '--d': '380ms' } as CSSProperties}
                      className="fly btn-shine mt-7 inline-block rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-on-accent transition-colors hover:bg-primary-dim"
                    >
                      {journey.cta}
                    </a>
                  )}
                </div>
                <div
                  className={`col-start-1 row-start-1 flex min-w-0 flex-col justify-center gap-4 self-center ${left ? 'lg:col-start-2 lg:items-end' : 'lg:col-start-1 lg:items-start'} ${on ? '' : 'pointer-events-none'}`}
                >
                  {documents(c.id).map((doc, k) => (
                    <div
                      key={k}
                      className={`w-full max-w-sm ${k > 0 ? `hidden sm:block ${left ? 'lg:-translate-x-16' : 'lg:translate-x-16'}` : ''}`}
                    >
                      {doc}
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>

        {/* Progress rail: one segment per chapter; click to jump. */}
        <div className="absolute inset-x-0 bottom-6 z-10 mx-auto max-w-[1400px] px-5 sm:bottom-8 sm:px-8">
          <ol ref={railRef} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
            {chapters.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  className="group block w-full text-left"
                  aria-label={`Chapter ${i + 1}: ${c.label}`}
                  aria-current={i === active ? 'step' : undefined}
                >
                  <span className="relative block h-0.5 overflow-hidden bg-white/15">
                    <span
                      className="rail-fill absolute inset-0 bg-primary shadow-[0_0_10px_var(--color-primary)]"
                      style={{ '--i': i, '--n': N } as CSSProperties}
                    />
                  </span>
                  <span
                    className={`mt-2 hidden font-mono text-[10px] tracking-[0.12em] uppercase transition-colors sm:block ${
                      i === active ? 'text-white' : 'text-text-secondary group-hover:text-text-primary'
                    }`}
                  >
                    {c.label}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-3 hidden text-[11px] text-text-secondary lg:block">{journey.footage}</p>
        </div>
      </div>
    </section>
  )
}
