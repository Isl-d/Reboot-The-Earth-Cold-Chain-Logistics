import ProvenanceTag from '@/components/ProvenanceTag'
import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import StatusChip from '@/components/StatusChip'
import { customers } from '@/content/copy'

// The two divisions, who buys each, and the shift from the legacy cold chain.
export default function Customers() {
  const { shift } = customers
  return (
    <section id="customers" className="border-y border-border/50 bg-[#0a1520]">
      <div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeader eyebrow={customers.eyebrow} title={customers.title} body={customers.body} from="right" />

        <div className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {customers.divisions.map((d, i) => (
            <Reveal key={d.name} delay={i * 120} className="h-full">
              <article className="flex h-full flex-col rounded-md border border-border/70 bg-base p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm text-text-secondary">
                    {d.clock} <ProvenanceTag tag={d.tag} />
                  </p>
                  <StatusChip label={d.status} />
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-white">{d.name}</h3>
                <p className="mt-3 leading-relaxed text-text-secondary">{d.body}</p>
                <ul className="mt-auto flex flex-wrap gap-2 pt-6">
                  {d.who.map((w) => (
                    <li key={w} className="rounded-sm border border-border/70 bg-surface px-2.5 py-1 text-sm text-text-primary">
                      {w}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-16">
          <h3 className="text-2xl font-semibold tracking-[-0.01em] text-white">{shift.title}</h3>
          <div className="mt-6 overflow-x-auto rounded-md border border-border/70">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-surface">
                  {shift.head.map((h, i) => (
                    <th key={i} scope="col" className={`px-4 py-3 font-medium ${i === 2 ? 'text-primary' : 'text-text-secondary'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shift.rows.map(([dim, legacy, ours]) => (
                  <tr key={dim} className="border-t border-border/60 bg-base">
                    <th scope="row" className="px-4 py-3 font-medium whitespace-nowrap text-text-secondary">
                      {dim}
                    </th>
                    <td className="px-4 py-3 text-text-secondary">{legacy}</td>
                    <td className="px-4 py-3 text-white">{ours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
