import { brand, CONTACT_EMAIL, footer, REPO_URL } from '@/content/copy'
import Logo from '@/components/Logo'

export default function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto grid max-w-[1400px] gap-6 px-5 py-10 text-sm text-text-secondary sm:px-8 md:grid-cols-[auto_1fr_auto] md:items-start md:gap-10">
        <div>
          <span className="text-text-primary">
            <Logo size={24} />
          </span>
          <p className="mt-2 text-xs">by {brand.company}, Doha</p>
        </div>
        <p className="max-w-xl text-xs leading-relaxed">{footer.disclaimer}</p>
        <ul className="space-y-1.5 md:text-right">
          <li>
            <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-white">
              {CONTACT_EMAIL}
            </a>
          </li>
          <li>
            <a href={REPO_URL} className="text-xs transition-colors hover:text-white">
              {footer.source}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  )
}
