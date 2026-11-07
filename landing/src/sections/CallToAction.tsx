import Reveal from '@/components/Reveal'
import { contact, CONTACT_EMAIL, cta } from '@/content/copy'

export default function CallToAction() {
  return (
    <section id="contact" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 sm:py-32">
      <Reveal>
        <div className="sheen relative overflow-hidden rounded-lg border border-primary/40 bg-[radial-gradient(80%_120%_at_100%_0%,rgba(0,200,224,0.18),transparent_60%),var(--color-surface)] px-6 py-14 sm:px-12 sm:py-16">
          <h2 className="max-w-2xl text-3xl leading-tight font-semibold tracking-[-0.02em] text-balance text-white sm:text-4xl">
            {cta.title}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">{cta.body}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={contact.pilot}
              className="btn-shine rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-on-accent transition-colors hover:bg-primary-dim"
            >
              {cta.primary}
            </a>
            <a
              href={contact.demo}
              className="rounded-sm border border-border bg-base/60 px-5 py-3 text-sm font-semibold text-primary transition-colors hover:border-primary"
            >
              {cta.secondary}
            </a>
          </div>
          <p className="mt-5 text-sm text-text-secondary">
            Or write to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-text-primary underline decoration-border underline-offset-4 hover:text-white">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </Reveal>
    </section>
  )
}
