import { footer, REPO_URL } from '@/content/copy'
import Logo from '@/components/Logo'

export default function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 py-10 text-sm text-text-secondary sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="text-text-primary">
          <Logo size={24} />
        </div>
        <p className="max-w-xl text-xs leading-relaxed">{footer.disclaimer}</p>
        <a href={REPO_URL} className="shrink-0 transition-colors hover:text-white">
          Source on GitHub
        </a>
      </div>
    </footer>
  )
}
