import { brand, footer, REPO_URL } from '@/content/copy'

export default function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 py-10 text-sm text-text-secondary sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-6" />
          <span className="font-semibold text-text-primary">{brand.name}</span>
        </div>
        <p className="max-w-xl text-xs leading-relaxed">{footer.disclaimer}</p>
        <a href={REPO_URL} className="shrink-0 transition-colors hover:text-white">
          Source on GitHub
        </a>
      </div>
    </footer>
  )
}
