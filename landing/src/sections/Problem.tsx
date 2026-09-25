import CountUp from '@/components/CountUp'
import ProvenanceTag from '@/components/ProvenanceTag'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import { problem } from '@/content/copy'

export default function Problem() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
      <SectionHeader eyebrow={problem.eyebrow} title={problem.title} body={problem.body} />

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {problem.stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 100}>
            <div className="lift h-full rounded-md border border-border/70 bg-surface p-6">
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

      <Reveal className="mt-6 flex flex-col gap-2 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
        <p>{problem.target}</p>
        <p className="font-mono text-xs">Source: {problem.source}</p>
      </Reveal>
    </section>
  )
}
