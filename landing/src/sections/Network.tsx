import { lazy, Suspense } from 'react'
import ProvenanceTag from '@/components/ProvenanceTag'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import { network } from '@/content/copy'
import type { RiskLevel } from '@/live/api'
import { useLive } from '@/live/LiveProvider'

// three.js is only fetched when this section mounts, not in the first bundle.
const NetworkScene = lazy(() => import('@/components/NetworkScene'))

const legend = [
  { label: 'Truck', color: 'var(--color-primary)' },
  { label: 'Cold store', color: 'var(--color-risk-low)' },
  { label: 'Incident', color: 'var(--color-risk-critical)' },
]

const riskColor: Record<RiskLevel, string> = {
  LOW: 'var(--color-risk-low)',
  MEDIUM: 'var(--color-risk-medium)',
  HIGH: 'var(--color-risk-high)',
  CRITICAL: 'var(--color-risk-critical)',
}

export default function Network() {
  const { status, trucks } = useLive()
  const live = status === 'live' && trucks.length > 0

  return (
    <section className="border-y border-border/50 bg-[#0a1520]">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeader eyebrow={network.eyebrow} title={network.title} body={network.body} />
          <Reveal className="mt-8 flex flex-wrap gap-5">
            {legend.map((l) => (
              <span key={l.label} className="flex items-center gap-2 text-sm text-text-secondary">
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </Reveal>

          {live && (
            <Reveal delay={100} className="mt-8">
              <div className="overflow-hidden rounded-md border border-border/70">
                <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-surface px-4 py-2.5">
                  <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-text-secondary uppercase">
                    <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-risk-critical" />
                    Fleet right now
                  </p>
                  <span className="flex gap-1.5">
                    <ProvenanceTag tag="SYNTHETIC" />
                    <ProvenanceTag tag="PREDICTED" />
                  </span>
                </div>
                <ul className="divide-y divide-border/60">
                  {trucks.map((t, i) => (
                    <li
                      key={t.id}
                      className="pop flex items-center justify-between gap-3 bg-base px-4 py-2.5 text-sm transition-colors hover:bg-surface"
                      style={{ transitionDelay: `${i * 70}ms` }}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden
                          className={`size-2 shrink-0 rounded-full ${t.activeIncident ? 'pulse-dot' : ''}`}
                          style={{ background: riskColor[t.riskLevel] }}
                        />
                        <span className="font-mono text-white">{t.id}</span>
                        <span className="truncate text-text-secondary">{t.product}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-4 font-mono text-xs">
                        <span className={t.temperatureC !== null && !t.refrigerationOn ? 'text-risk-critical' : 'text-text-primary'}>
                          {t.temperatureC !== null ? `${t.temperatureC.toFixed(1)} °C` : 'n/a'}
                        </span>
                        <span className="w-16 text-right" style={{ color: riskColor[t.riskLevel] }}>
                          {t.riskLevel}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )}
        </div>

        <Reveal delay={120}>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-border/70 bg-[radial-gradient(circle_at_50%_55%,#12233a_0%,var(--color-base)_70%)]">
            <Suspense fallback={null}>
              <NetworkScene />
            </Suspense>
            <ProvenanceTag tag="ILLUSTRATIVE" className="absolute top-3 left-3" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
