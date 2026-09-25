import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { clsx, FOCUS_RING } from '@/design/clsx'
import {
  AnalyticsIcon,
  ChevronIcon,
  ComparisonIcon,
  InventoryIcon,
  ModelIcon,
  OptimizationIcon,
  SimulationIcon,
} from './icons'

// DESIGN.md → Layout & Spacing: "fixed 64px collapsed icon rail / 260px expanded navigation drawer".
const COLLAPSED_WIDTH = 'w-16'
const EXPANDED_WIDTH = 'w-[260px]'
const COLLAPSE_STORAGE_KEY = 'cci.sidebar.collapsed'

export const NAV_ITEMS = [
  { to: '/simulation', label: 'Simulation', Icon: SimulationIcon },
  { to: '/model', label: 'Mathematical Model', Icon: ModelIcon },
  { to: '/optimization', label: 'Optimization', Icon: OptimizationIcon },
  { to: '/analytics', label: 'Food-Loss Analytics', Icon: AnalyticsIcon },
  { to: '/inventory', label: 'Inventory', Icon: InventoryIcon },
  { to: '/comparison', label: 'Scenario Comparison', Icon: ComparisonIcon },
] as const

// DESIGN.md's mobile breakpoint (<768px) has no room for a 260px drawer
// alongside content, so a first-time mobile visit starts collapsed to the
// 64px rail. An explicit saved preference (from either device) always wins.
function readStoredCollapsed(): boolean {
  try {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY)
    if (stored !== null) return stored === 'true'
  } catch {
    // Fall through to the viewport-based default below.
  }
  return typeof window !== 'undefined' && window.innerWidth < 768
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(readStoredCollapsed)

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed))
    } catch {
      // Per-viewer convenience only — a blocked/full storage just means the
      // preference doesn't persist across reloads, nothing else depends on it.
    }
  }, [collapsed])

  return (
    <nav
      aria-label="Main"
      className={clsx(
        'flex h-full flex-col bg-navy text-white transition-[width] duration-200 ease-in-out',
        collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
      )}
    >
      <div className={clsx('flex h-16 items-center border-b border-white/10', collapsed ? 'justify-center' : 'gap-2 px-4')}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-sky text-navy text-label-code font-bold">
          C
        </span>
        {!collapsed && <span className="truncate text-headline-sm text-white">Cold-Chain Intelligence</span>}
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                clsx(
                  FOCUS_RING,
                  'flex items-center gap-3 rounded px-3 py-2 text-body-md transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-navy-light text-white border-l-[3px] border-sky pl-[9px]'
                    : 'text-white/70 hover:bg-navy-light hover:text-white',
                )
              }
            >
              <Icon className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="border-t border-white/10 p-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className={clsx(
            FOCUS_RING,
            'flex w-full items-center gap-2 rounded px-3 py-2 text-body-sm text-white/70 hover:bg-navy-light hover:text-white',
            collapsed && 'justify-center px-0',
          )}
        >
          <ChevronIcon direction={collapsed ? 'right' : 'left'} className="shrink-0" />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </nav>
  )
}
