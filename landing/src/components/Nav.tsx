import { useEffect, useState } from 'react'
import { APP_URL, brand, nav } from '@/content/copy'
import Logo from '@/components/Logo'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-border/60 bg-base/95' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-8">
        <a href="#top" aria-label={`${brand.name}, back to top`} className="text-white">
          <Logo size={28} />
        </a>
        <ul className="hidden items-center gap-7 text-sm text-text-secondary md:flex">
          {nav.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="transition-colors hover:text-white">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={APP_URL}
          className="btn-shine shrink-0 rounded-sm bg-primary px-3.5 py-2 text-xs font-semibold tracking-[0.04em] text-on-accent transition-colors hover:bg-primary-dim"
        >
          <span className="sm:hidden">Open app</span>
          <span className="hidden sm:inline">Open the command center</span>
        </a>
      </nav>
    </header>
  )
}
