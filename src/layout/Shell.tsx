/*
  Minimal, throwaway app shell (Segment 3 builds the real version).
  Exists now only so routes render during scaffolding.
*/
import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/simulation', label: 'Simulation' },
  { to: '/model', label: 'Mathematical Model' },
  { to: '/optimization', label: 'Optimization' },
  { to: '/analytics', label: 'Food-Loss Analytics' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/comparison', label: 'Scenario Comparison' },
]

export default function Shell() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 220, borderRight: '1px solid #E2E8F0', padding: '1rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Cold-Chain Intelligence</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'block',
              padding: '0.5rem 0',
              color: isActive ? '#0F172A' : '#64748B',
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main style={{ flex: 1, padding: '1.5rem' }}>
        <Outlet />
      </main>
    </div>
  )
}
