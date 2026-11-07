import Reveal from '@/components/Reveal'
import SectionHeader from '@/components/SectionHeader'
import { award, contact, team } from '@/content/copy'

const initials = (name: string) =>
  name
    .split(' ')
    .filter((_, i, a) => i === 0 || i === a.length - 1)
    .map((w) => w[0])
    .join('')

// The people behind it, the hackathon win, and a small strip for investors.
export default function Team() {
  return (
    <section id="team" className="border-y border-border/50 bg-[#0a1520]">
      <div className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
        <SectionHeader eyebrow={team.eyebrow} title={team.title} body={team.body} aside={<p className="text-sm text-risk-medium">{award}</p>} from="left" />

        <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {team.people.map((p, i) => (
            <li key={p.name}>
              <Reveal delay={i * 70} className="h-full rounded-md border border-border/70 bg-base p-5">
                <span aria-hidden className="flex size-11 items-center justify-center rounded-full border border-primary/50 bg-surface font-mono text-sm text-primary">
                  {initials(p.name)}
                </span>
                <p className="mt-4 font-medium text-white">{p.name}</p>
                <p className="mt-0.5 text-sm text-text-secondary">{p.role}</p>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal className="mt-12">
          <div className="flex flex-col gap-5 rounded-md border border-border/70 bg-base p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h3 className="text-xl font-semibold text-white">{team.investors.title}</h3>
              <p className="mt-2 leading-relaxed text-text-secondary">{team.investors.body}</p>
            </div>
            <a
              href={contact.investors}
              className="shrink-0 rounded-sm border border-border bg-surface px-5 py-3 text-sm font-semibold text-primary transition-colors hover:border-primary"
            >
              {team.investors.cta}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
