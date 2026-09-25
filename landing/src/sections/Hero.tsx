import BackgroundVideo, { hasVideo } from '@/components/BackgroundVideo'
import ProvenanceTag from '@/components/ProvenanceTag'
import ThermalTraceCard from '@/components/ThermalTraceCard'
import { APP_URL, hero } from '@/content/copy'

export default function Hero() {
  return (
    <section id="top" className="hero-fallback relative isolate flex min-h-[100svh] items-center overflow-hidden">
      <div aria-hidden className="grid-lines grid-pan absolute inset-0 -z-10" />
      <div aria-hidden className="aurora absolute inset-0 -z-10">
        <span className="aurora-blob aurora-a" />
        <span className="aurora-blob aurora-b" />
      </div>
      <BackgroundVideo name="hero" className="-z-10" />
      {/* Keeps the copy readable over any footage. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(12,24,37,0.35)_0%,rgba(12,24,37,0.55)_55%,var(--color-base)_100%)]"
      />

      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-14 px-5 pt-32 pb-20 sm:px-8 sm:pb-28 lg:grid-cols-[1.15fr_0.85fr] xl:gap-20">
        <div>
          <p className="rise mb-5 font-mono text-xs font-medium tracking-[0.14em] text-primary uppercase" style={{ animationDelay: '0ms' }}>
            {hero.eyebrow}
          </p>
          <h1
            className="rise text-4xl leading-[1.05] font-bold tracking-[-0.03em] text-balance text-white sm:text-6xl xl:text-7xl"
            style={{ animationDelay: '120ms' }}
          >
            {hero.title}
          </h1>
          <p
            className="rise mt-6 max-w-2xl text-base leading-relaxed text-pretty text-text-primary sm:text-lg"
            style={{ animationDelay: '260ms' }}
          >
            {hero.body}
          </p>
          <div className="rise mt-9 flex flex-wrap gap-3" style={{ animationDelay: '400ms' }}>
            <a
              href="#demo"
              className="btn-shine rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-on-accent transition-colors hover:bg-primary-dim"
            >
              {hero.primaryCta}
            </a>
            <a
              href={APP_URL}
              className="rounded-sm border border-border bg-surface/60 px-5 py-3 text-sm font-semibold text-primary backdrop-blur-sm transition-colors hover:border-primary"
            >
              {hero.secondaryCta}
            </a>
          </div>
        </div>

        <div className="rise" style={{ animationDelay: '520ms' }}>
          <ThermalTraceCard />
        </div>
      </div>

      <a
        href="#how"
        aria-label="Scroll to how it works"
        className="scroll-cue absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-text-secondary transition-colors hover:text-primary sm:block"
      >
        <svg width="22" height="34" viewBox="0 0 22 34" fill="none" aria-hidden>
          <rect x="1" y="1" width="20" height="32" rx="10" stroke="currentColor" strokeWidth="1.5" />
          <circle className="scroll-wheel" cx="11" cy="10" r="2.5" fill="currentColor" />
        </svg>
      </a>

      {hasVideo('hero') && <ProvenanceTag tag="AI-GENERATED" className="absolute right-4 bottom-4" />}
    </section>
  )
}
