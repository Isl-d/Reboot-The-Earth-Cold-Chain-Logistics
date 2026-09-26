import ProvenanceTag from '@/components/ProvenanceTag'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import { scenario } from '@/content/copy'
import { decision, temperatureTrace, timeline, truck, warehouses } from '@/content/demo'
import { useLive } from '@/live/LiveProvider'
import { sample } from '@/live/sample'

const toneColor = {
  low: 'var(--color-risk-low)',
  medium: 'var(--color-risk-medium)',
  high: 'var(--color-risk-high)',
} as const

const BARS = 8

// The timeline is the worked example. The truck card beside it shows the
// command center's live answer for the truck in trouble when the backend is
// up, and the scripted T102 card when it is not.
export default function Scenario() {
  const { status, focus } = useLive()
  const live = status === 'live' && focus !== null && focus.temps.length >= 2 && focus.candidates.length > 0

  const card = live
    ? {
        id: focus.truckId,
        massKg: focus.quantityKg,
        cargo: focus.product,
        safeMax: focus.safeMaxC,
        temps: sample(focus.temps, BARS),
        stores: focus.candidates.map((c) => ({
          id: c.warehouseId,
          name: c.name,
          etaMin: Math.round(c.etaMinutes),
          lossPct: c.expectedLossPercent,
          selected: c.warehouseId === focus.selectedId,
        })),
        action: focus.action ?? 'DIVERT',
        target: focus.selectedId ?? focus.targetId ?? 'n/a',
        savedKg: focus.foodSavedKg,
        savedQar: focus.qarPrevented,
      }
    : {
        id: truck.id,
        massKg: truck.massKg,
        cargo: truck.cargo,
        safeMax: truck.safeBandC[1],
        temps: [...temperatureTrace],
        stores: warehouses.map((w) => ({ ...w, name: null, lossPct: null })),
        action: decision.action,
        target: decision.target,
        savedKg: null,
        savedQar: null,
      }
  const peak = Math.max(...card.temps, card.safeMax)

  return (
    <section id="demo" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
      <SectionHeader
        eyebrow={scenario.eyebrow}
        title={scenario.title}
        body={scenario.body}
        aside={<ProvenanceTag tag="EXAMPLE" />}
        from="left"
      />

      <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Timeline */}
        <Reveal from="left">
          <ol className="relative space-y-6 border-l border-border pl-6">
            {timeline.map((step, i) => (
              <li key={step.t} className="pop relative" style={{ transitionDelay: `${150 + i * 140}ms` }}>
                <span
                  aria-hidden
                  className="absolute top-1.5 -left-[29px] size-2.5 rounded-full ring-4 ring-base"
                  style={{ background: toneColor[step.tone] }}
                />
                <p className="font-mono text-xs text-text-secondary">{step.t}</p>
                <p className="mt-0.5 font-semibold text-white">{step.label}</p>
                <p className="text-sm text-text-secondary">{step.detail}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        {/* Truck card */}
        <Reveal delay={120} from="right">
          <div className="lift rounded-md border border-border/70 bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-3 font-mono text-2xl font-medium text-white">
                {card.id}
                {live && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.08em] text-risk-critical uppercase">
                    <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-risk-critical" />
                    Live
                  </span>
                )}
              </p>
              <p className="text-sm text-text-secondary">
                {card.massKg} kg {card.cargo.toLowerCase()} · safe 0–{card.safeMax} °C
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs font-medium tracking-[0.06em] text-text-secondary uppercase">
                {live ? 'Cargo temperature · last 10 min' : 'Cargo temperature'}
              </p>
              {live && <ProvenanceTag tag="SYNTHETIC" />}
            </div>
            <div
              className="mt-3 flex h-32 items-end gap-2"
              role="img"
              aria-label={`Temperature from ${card.temps[0].toFixed(1)} to ${card.temps.at(-1)!.toFixed(1)} °C`}
            >
              {card.temps.map((c, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="font-mono text-[11px] text-text-primary">{c.toFixed(1)}</span>
                  <div
                    className="grow-y w-full rounded-t-sm"
                    style={{
                      height: `${Math.max(2, (c / peak) * 84)}px`,
                      background: c > card.safeMax ? 'var(--color-risk-critical)' : 'var(--color-risk-low)',
                      transitionDelay: `${300 + i * 90}ms`,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Cold-store candidates */}
            <div className="mt-7 flex items-center justify-between">
              <p className="text-xs font-medium tracking-[0.06em] text-text-secondary uppercase">Cold stores in range</p>
              {live && <ProvenanceTag tag="CALCULATED" />}
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {card.stores.map((w) => (
                <li
                  key={w.id}
                  className={`rounded-sm border p-3 transition-colors ${
                    w.selected ? 'selected-pulse border-primary bg-primary/10' : 'border-border/70 bg-base/40'
                  }`}
                >
                  <p className="font-mono text-sm text-white">{w.id}</p>
                  {w.name && <p className="truncate text-xs text-text-secondary">{w.name}</p>}
                  <p className="font-mono text-xs text-text-secondary">{w.etaMin} min</p>
                  {w.lossPct !== null && (
                    <p className="font-mono text-xs text-text-secondary">{w.lossPct.toFixed(1)}% loss</p>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5">
              <p className="flex items-center gap-2 font-mono text-lg text-primary">
                {card.action} → {card.target}
                {live && <ProvenanceTag tag="OPTIMIZED" />}
              </p>
              <div className="text-right">
                <p className="flex items-center justify-end gap-2 text-xs text-text-secondary">
                  Food saved {card.savedKg !== null && <ProvenanceTag tag="CALCULATED" />}
                </p>
                {/* No figure is shown until the engine has computed one; the page never invents it. */}
                {card.savedKg === null && card.savedQar === null ? (
                  <p className="font-mono text-lg text-text-secondary">kg · QAR, per incident</p>
                ) : (
                  <p className="font-mono text-lg text-white">
                    {card.savedKg !== null ? `${card.savedKg.toFixed(1)} kg` : '— kg'} ·{' '}
                    {card.savedQar !== null ? `${Math.round(card.savedQar).toLocaleString('en-US')} QAR` : '— QAR'}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-text-secondary">
              {live ? 'Read live from the command center’s food-loss engine.' : scenario.savedNote}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
