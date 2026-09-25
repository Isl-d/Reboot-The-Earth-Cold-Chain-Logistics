import { NavLink } from 'react-router-dom'

// Both route sets live behind one rail: Person 1's command-center routes and
// Person 2's intelligence routes. `/styleguide` is dev-only, matching App.tsx.
const links = [
  { to: '/', label: 'OPS', icon: '◈', title: 'Command Center' },
  { to: '/fleet', label: 'FLEET', icon: '⬡', title: 'Fleet' },
  { to: '/incidents', label: 'ALERT', icon: '◉', title: 'Incidents' },
  { to: '/simulation', label: 'SIM', icon: '▶', title: 'Simulation' },
  { to: '/model', label: 'MODEL', icon: '◫', title: 'Mathematical Model' },
  { to: '/optimization', label: 'OPT', icon: '◎', title: 'Optimization' },
  { to: '/analytics', label: 'LOSS', icon: '▤', title: 'Food-Loss Analytics' },
  { to: '/inventory', label: 'INV', icon: '▦', title: 'Inventory' },
  { to: '/comparison', label: 'CMP', icon: '⇄', title: 'Scenario Comparison' },
  { to: '/map', label: 'MAP', icon: '▧', title: 'Fleet Map' },
  ...(import.meta.env.DEV
    ? [{ to: '/styleguide', label: 'STYLE', icon: '◐', title: 'Style Guide' }]
    : []),
]

export function Sidebar() {
  return (
    <aside className="w-14 bg-base border-r border-border flex flex-col items-center py-4 gap-1 shrink-0 overflow-y-auto">
      <div className="mb-4">
        <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center">
          <span className="text-base font-bold text-[10px] leading-none">CC</span>
        </div>
      </div>
      {links.map(({ to, label, icon, title }) => (
        <NavLink
          key={to}
          to={to}
          end
          title={title}
          className={({ isActive }) =>
            `w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-sm transition-colors ${
              isActive
                ? 'bg-elevated text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
            }`
          }
        >
          <span className="text-sm leading-none">{icon}</span>
          <span className="text-[9px] tracking-[0.06em] font-medium leading-none">{label}</span>
        </NavLink>
      ))}
    </aside>
  )
}
