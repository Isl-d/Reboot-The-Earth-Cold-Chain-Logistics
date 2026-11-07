import CountUp from '@/components/CountUp'
import ProvenanceTag from '@/components/ProvenanceTag'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import { problem } from '@/content/copy'

export default function Problem() {
  const { why } = problem
  return (
    <section id="problem" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
      <SectionHeader eyebrow={problem.eyebrow} title={problem.title} body={problem.body} from="left" />

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {problem.stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 100}>
            <div className="h-full rounded-md border border-border/70 bg-surface p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-4xl font-medium tracking-tight text-white sm:text-5xl">
                  <CountUp value={s.value} />
                </p>
                <ProvenanceTag tag="CITED" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="mt-3 text-right font-mono text-xs text-text-secondary">Source: {problem.source}</p>

      {/* Why Qatar: the thermal-debt chain on the left, the national targets on the right. */}
      <div className="mt-16 grid grid-cols-1 gap-10 border-t border-border/50 pt-14 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
        <Reveal from="left">
          <h3 className="text-2xl font-semibold tracking-[-0.01em] text-white">{why.title}</h3>
          <p className="mt-3 max-w-2xl leading-relaxed text-text-secondary">{why.body}</p>
          <ol className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-3 font-mono text-xs sm:text-sm" aria-label="Thermal debt">
            {why.debt.map((d, i) => (
              <li key={d} className="flex items-center gap-2">
                {i > 0 && (
                  <span aria-hidden className="text-text-secondary">
                    +
                  </span>
                )}
                <span className="rounded-sm border border-border/70 bg-surface px-2.5 py-1.5 text-text-primary">{d}</span>
              </li>
            ))}
            <li className="flex items-center gap-2">
              <span aria-hidden className="text-text-secondary">
                =
              </span>
              <span className="rounded-sm border border-risk-critical/50 bg-risk-critical/10 px-2.5 py-1.5 text-risk-critical">
                {why.debtResult}
              </span>
            </li>
          </ol>
        </Reveal>

        <Reveal from="right" delay={120}>
          <div className="rounded-md border border-border/70 bg-surface p-6">
            <div className="grid grid-cols-2 gap-4">
              {why.targets.map((t) => (
                <div key={t.label}>
                  <p className="font-mono text-4xl font-medium tracking-tight text-risk-low">{t.value}</p>
                  <p className="mt-1 text-sm text-text-secondary">{t.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-text-secondary">{why.policy}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <ProvenanceTag tag="CITED" />
              <p className="font-mono text-xs text-text-secondary">{why.targetsSource}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
