import CountUp from '@/components/CountUp'
import ProvenanceTag, { type ProvenanceTagName } from '@/components/ProvenanceTag'
import Reveal from '@/components/Reveal'
import { APP_URL } from '@/content/copy'
import { useLive } from '@/live/LiveProvider'

// A strip of the command center's own numbers, read from its backend. Hidden
// entirely when the backend is unreachable; the page never fills it in.

const fmt = (n: number, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })

export default function LiveStats() {
  const { status, trucks, openIncidents, foodLoss, updatedAt } = useLive()

  if (status !== 'live') return null

  const stats: { label: string; value: string; tag: ProvenanceTagName }[] = [
    { label: 'Trucks reporting', value: fmt(trucks.length), tag: 'SYNTHETIC' },
    { label: 'Open incidents', value: fmt(openIncidents), tag: 'CALCULATED' },
    ...(foodLoss
      ? [
          { label: 'Food saved this period', value: `${fmt(foodLoss.savedKg, 1)} kg`, tag: 'CALCULATED' as const },
          {
            label: 'Loss prevented',
            value: `${fmt(foodLoss.estimatedFinancialLossPrevented)} ${foodLoss.currency}`,
            tag: 'CALCULATED' as const,
          },
          { label: 'CO₂ avoided', value: `${fmt(foodLoss.co2AvoidedKg, 1)} kg`, tag: 'CALCULATED' as const },
        ]
      : []),
  ]

  return (
    <section aria-label="Live figures from the command center" className="border-y border-border/50 bg-[#0a1520]">
      <div className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8">
        <Reveal className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase">
            <span aria-hidden className="pulse-dot size-2 rounded-full bg-risk-critical" />
            Live from the command center
          </p>
          <p className="font-mono text-xs text-text-secondary">
            Test fleet · updated {updatedAt?.toLocaleTimeString()} ·{' '}
            <a href={APP_URL} className="text-primary hover:underline">
              open dashboard →
            </a>
          </p>
        </Reveal>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border/70 bg-border/70 md:grid-cols-3 lg:grid-cols-5">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="h-full bg-base p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-text-secondary">{s.label}</p>
                <ProvenanceTag tag={s.tag} />
              </div>
              <p className="mt-3 font-mono text-2xl font-medium tracking-tight text-white sm:text-3xl">
                <CountUp value={s.value} />
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
