import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import ProvenanceTag from '@/components/ProvenanceTag'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import StatusChip, { statusOf } from '@/components/StatusChip'
import { stack } from '@/content/copy'

// The anatomy of value: four reserves drawn as a stack, foundation widest.
// Selecting a layer opens its detail beside the stack. Every figure here is
// the deck's worked example and is tagged EXAMPLE; nothing is computed in
// the page.

type Level = 1 | 2 | 3 | 4

// Narrower towards the top, so the stack reads as built from the ground up.
const width: Record<Level, string> = { 4: '76%', 3: '84%', 2: '92%', 1: '100%' }

export default function ReserveStack() {
  const [level, setLevel] = useState<Level>(2)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const layers = stack.layers

  const onKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : null
    if (next === null || next < 0 || next >= layers.length) return
    e.preventDefault()
    setLevel(layers[next].level as Level)
    tabs.current[next]?.focus()
  }

  return (
    <section id="how" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
      <SectionHeader eyebrow={stack.eyebrow} title={stack.title} body={stack.body} from="right" />

      <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <Reveal from="left">
          <p className="mb-4 text-sm text-text-secondary">{stack.hint}</p>
          <div role="tablist" aria-orientation="vertical" aria-label="The four reserves" className="flex flex-col items-center gap-2">
            {layers.map((l, i) => {
              const on = l.level === level
              return (
                <button
                  key={l.level}
                  ref={(el) => {
                    tabs.current[i] = el
                  }}
                  role="tab"
                  id={`layer-tab-${l.level}`}
                  aria-selected={on}
                  aria-controls="layer-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => setLevel(l.level as Level)}
                  onKeyDown={(e) => onKey(e, i)}
                  style={{ width: width[l.level as Level] }}
                  className={`slab group relative rounded-md border px-4 py-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-5 ${
                    on
                      ? 'is-on border-primary bg-primary/10 shadow-[0_18px_40px_-24px_var(--color-primary)]'
                      : 'border-border/70 bg-surface hover:border-primary/50'
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-text-secondary">Layer {l.level}</span>
                    <span className="flex flex-wrap justify-end gap-1.5">
                      {statusOf(l.status) !== 'live' && <StatusChip label="Designed" />}
                      <ProvenanceTag tag={l.tag} />
                    </span>
                  </span>
                  <span className={`mt-1 block text-lg font-semibold ${on ? 'text-white' : 'text-text-primary'}`}>{l.name}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-text-secondary">{l.short}</span>
                </button>
              )
            })}
          </div>
        </Reveal>

        <Reveal from="right" delay={120}>
          <div
            id="layer-panel"
            role="tabpanel"
            aria-labelledby={`layer-tab-${level}`}
            className="h-full rounded-md border border-border/70 bg-surface p-6 sm:p-8"
          >
            <div key={level} className="panel-in">
              {level === 1 && <Signals />}
              {level === 2 && <Thermal />}
              {level === 3 && <Commercial />}
              {level === 4 && <Decision />}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function PanelHead({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.01em] text-balance text-white">{title}</h3>
      {body && <p className="mt-2 leading-relaxed text-text-secondary">{body}</p>}
    </div>
  )
}

function Signals() {
  return (
    <>
      <PanelHead title="Six signals. Three numbers that matter." body="Is it deteriorating, how long is it still good for, and how much damage has already been done.">
        <ProvenanceTag tag="MEASURED" />
      </PanelHead>
      <ul className="mt-6 grid gap-px overflow-hidden rounded-md border border-border/70 bg-border/70 sm:grid-cols-2">
        {stack.signals.map((s) => (
          <li key={s.name} className="bg-base p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-white">{s.name}</p>
              <StatusChip label={stack.signalStates[s.state]} />
            </div>
            <p className="mt-1.5 text-sm leading-snug text-text-secondary">{s.body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-text-secondary">{stack.signalsNote}</p>
    </>
  )
}

function Thermal() {
  const t = stack.thermal
  const ratio = parseFloat(t.reserve.value) / parseFloat(t.label.value)
  return (
    <>
      <PanelHead title={t.title} body={t.body}>
        <ProvenanceTag tag="CALCULATED" />
        <ProvenanceTag tag="EXAMPLE" />
      </PanelHead>
      <div className="mt-6 space-y-4">
        {[
          { ...t.label, frac: 1, color: 'var(--color-text-secondary)' },
          { ...t.reserve, frac: ratio, color: 'var(--color-primary)' },
        ].map((b) => (
          <div key={b.name}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-text-secondary">{b.name}</span>
              <span className="font-mono text-2xl text-white">{b.value}</span>
            </div>
            <div className="mt-1.5 h-2.5 rounded-sm bg-base">
              <div className="bar-x h-full rounded-sm" style={{ width: `${b.frac * 100}%`, background: b.color }} />
            </div>
          </div>
        ))}
      </div>
      <dl className="mt-7 space-y-2.5 border-t border-border/60 pt-5">
        {t.formulas.map((f) => (
          <div key={f.name} className="grid gap-1 sm:grid-cols-[13rem_1fr] sm:gap-4">
            <dt className="text-sm text-text-secondary">{f.name}</dt>
            <dd className="overflow-x-auto font-mono text-sm whitespace-nowrap text-text-primary">{f.f}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

function Commercial() {
  const c = stack.commercial
  return (
    <>
      <PanelHead title={c.title} body={c.body}>
        <StatusChip label="Designed, staged in the pilot" />
        <ProvenanceTag tag="ILLUSTRATIVE" />
      </PanelHead>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {c.stages.map((s, i) => (
          <li key={s.name} className="rounded-md border border-border/70 bg-base p-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-primary">{i + 1}</span>
              <p className="font-medium text-white">{s.name}</p>
            </div>
            {/* The value left at each stage: illustrative, falling. */}
            <div className="mt-2.5 h-1 rounded-sm bg-surface">
              <div className="bar-x h-full rounded-sm bg-primary/70" style={{ width: `${100 - i * 18}%` }} />
            </div>
            <p className="mt-2.5 text-sm leading-snug text-text-secondary">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-border/60 pt-5">
        <p className="font-mono text-xl text-white">{c.formula}</p>
        {c.terms.map((t) => (
          <p key={t.sym} className="text-sm text-text-secondary">
            <span className="font-mono text-primary">{t.sym}</span> {t.label}
          </p>
        ))}
      </div>
    </>
  )
}

function Decision() {
  const d = stack.decision
  const max = Math.max(...d.options.map((o) => o.etaMin))
  const reservePct = (d.reserveMin / max) * 100
  return (
    <>
      <PanelHead title={d.title} body={d.body}>
        <ProvenanceTag tag="OPTIMIZED" />
        <ProvenanceTag tag="EXAMPLE" />
      </PanelHead>

      <div className="relative mt-7 space-y-4">
        {/* The thermal reserve as a line every option is measured against. */}
        <div aria-hidden className="pointer-events-none absolute inset-y-0 z-10 border-l border-dashed border-risk-critical" style={{ left: `${reservePct}%` }}>
          <span className="absolute -top-5 -translate-x-1/2 font-mono text-[11px] whitespace-nowrap text-risk-critical">
            reserve {d.reserveMin} min
          </span>
        </div>
        {d.options.map((o) => (
          <div key={o.name}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-text-primary">{o.name}</span>
              <span className={`font-mono ${o.fits ? 'text-risk-low' : 'text-risk-critical'}`}>
                {o.etaMin} min {o.fits ? '✓ fits' : '✗ spoils'}
              </span>
            </div>
            <div className="mt-1.5 h-3 rounded-sm bg-base">
              <div
                className="bar-x h-full rounded-sm"
                style={{ width: `${(o.etaMin / max) * 100}%`, background: o.fits ? 'var(--color-risk-low)' : 'var(--color-risk-critical)' }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/50 bg-primary/10 px-4 py-3">
        <p className="font-mono text-lg text-primary">{d.result}</p>
        <p className="text-sm text-text-primary">
          Decision reserve: <span className="text-white">{d.window}</span>
        </p>
      </div>

      <div className="mt-6 grid gap-4 border-t border-border/60 pt-5 sm:grid-cols-2">
        <div>
          <p className="text-sm text-text-secondary">The optimizer picks</p>
          <p className="mt-1 font-mono text-sm text-white">{d.objective}</p>
        </div>
        <div>
          <p className="text-sm text-text-secondary">Subject to</p>
          <ul className="mt-1 space-y-0.5 text-sm text-text-primary">
            {d.constraints.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
