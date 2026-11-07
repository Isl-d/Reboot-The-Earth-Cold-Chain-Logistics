import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { BrandMark } from './BrandMark'

// Both route sets live in one top nav, grouped the way an operator works:
// Operate (Person 1's command-center routes) and Analyse (Person 2's
// intelligence routes). The dev-only `/styleguide` route (App.tsx) is not
// linked here; open it by URL when checking design.
const groups = [
  {
    label: 'Operate',
    links: [
      { to: '/', label: 'Command' },
      { to: '/fleet', label: 'Fleet' },
      { to: '/map', label: 'Map' },
      { to: '/incidents', label: 'Incidents' },
    ],
  },
  {
    label: 'Analyse',
    links: [
      { to: '/simulation', label: 'Simulation' },
      { to: '/model', label: 'Model' },
      { to: '/optimization', label: 'Optimize' },
      { to: '/analytics', label: 'Food loss' },
      { to: '/inventory', label: 'Inventory' },
      { to: '/comparison', label: 'Compare' },
    ],
  },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-9 items-center whitespace-nowrap rounded-md border-[3px] px-2.5 text-[14px] font-bold transition-colors outline-none focus-visible:shadow-focus-halo ${
    isActive
      ? 'border-ink bg-fill-sky text-on-fill shadow-level1'
      : 'border-transparent text-text-primary hover:border-ink hover:bg-elevated'
  }`

export function TopNav() {
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <nav className="relative z-[1100] shrink-0 border-b-[3px] border-ink bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <NavLink
          to="/"
          onClick={close}
          aria-label="Thermal Trace home"
          className="flex shrink-0 items-center gap-2.5 rounded-md text-text-primary no-underline outline-none focus-visible:shadow-focus-halo"
        >
          <BrandMark size={36} />
          <b className="text-[19px] font-extrabold tracking-[-0.01em]">
            Thermal <span className="text-primary">Trace</span>
          </b>
        </NavLink>

        {/* Inline links on wide screens. */}
        <div className="hidden min-w-0 items-center gap-3 desktop:flex">
          {groups.map((group, i) => (
            <div key={group.label} className="flex items-center gap-1">
              {i > 0 && <span className="mr-2 h-6 w-[3px] rounded-full bg-border" aria-hidden="true" />}
              <span className="tt-caps mr-1 text-text-secondary">{group.label}</span>
              {group.links.map((link) => (
                <NavLink key={link.to} to={link.to} end className={linkClass}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Theme applies app-wide, so the toggle lives in the nav, on every page. */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="tt-press inline-flex min-h-9 items-center gap-1.5 bg-surface px-2.5 text-[13px] font-bold text-text-primary outline-none focus-visible:shadow-focus-halo"
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="tt-nav-menu"
            className="tt-press inline-flex min-h-9 items-center bg-fill-maroon px-3 text-[13px] font-bold text-[#fbf9f3] outline-none focus-visible:shadow-focus-halo desktop:hidden"
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {/* Drop-down menu below the desktop breakpoint. */}
      {open && (
        <div
          id="tt-nav-menu"
          className="absolute inset-x-0 top-full grid gap-4 border-b-[3px] border-ink bg-surface px-4 py-4 shadow-level2 tablet:grid-cols-2 desktop:hidden"
        >
          {groups.map((group) => (
            <div key={group.label} className="grid gap-1.5">
              <span className="tt-caps text-text-secondary">{group.label}</span>
              <div className="flex flex-wrap gap-1.5">
                {group.links.map((link) => (
                  <NavLink key={link.to} to={link.to} end onClick={close} className={linkClass}>
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </nav>
  )
}
