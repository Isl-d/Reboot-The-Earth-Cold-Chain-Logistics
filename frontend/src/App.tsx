import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import PageGrid from './components/layout/PageGrid'
import { Sidebar } from './components/layout/Sidebar'
import { useTheme } from './hooks/useTheme'
import { CommandCenter } from './pages/CommandCenter'
import { Fleet } from './pages/Fleet'
import { Incidents } from './pages/Incidents'
import { TruckDetail } from './pages/TruckDetail'

// Person 2 intelligence screens (Recharts/Leaflet heavy) — code-split per
// route so the command center's initial bundle stays small. The shell's
// Suspense boundary keeps the sidebar mounted during a chunk load.
const SimulationScreen = lazy(() => import('./screens/simulation/SimulationScreen'))
const ModelScreen = lazy(() => import('./screens/model/ModelScreen'))
const OptimizationScreen = lazy(() => import('./screens/optimization/OptimizationScreen'))
const AnalyticsScreen = lazy(() => import('./screens/analytics/AnalyticsScreen'))
const InventoryScreen = lazy(() => import('./screens/inventory/InventoryScreen'))
const ComparisonScreen = lazy(() => import('./screens/comparison/ComparisonScreen'))
const MapScreen = lazy(() => import('./screens/map/MapScreen'))
const StyleGuideScreen = lazy(() => import('./screens/styleguide/StyleGuideScreen'))

const isDev = import.meta.env.DEV

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, gcTime: 60_000 } },
})

/**
 * Wraps the ported intelligence screens in the light design-system canvas
 * (bg-canvas + PageGrid) inside the dark command-center shell — the same
 * layout their own Shell provided before the merge.
 */
function IntelligencePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto bg-canvas">
      <div className="p-3 tablet:p-4 desktop:p-6">
        <PageGrid>
          <Suspense
            fallback={
              <div className="col-span-4 tablet:col-span-8 desktop:col-span-12 py-16 text-center text-body-sm text-muted">
                Loading…
              </div>
            }
          >
            {children}
          </Suspense>
        </PageGrid>
      </div>
    </div>
  )
}

function AppShell() {
  useTheme()
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--color-base)', color: 'var(--color-text-primary)' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          {/* Command center (Person 1) */}
          <Route path="/"          element={<CommandCenter />} />
          <Route path="/fleet"     element={<Fleet />} />
          <Route path="/trucks/:id" element={<TruckDetail />} />
          <Route path="/incidents" element={<Incidents />} />

          {/* Intelligence (Person 2) */}
          <Route path="/simulation"   element={<IntelligencePage><SimulationScreen /></IntelligencePage>} />
          <Route path="/model"        element={<IntelligencePage><ModelScreen /></IntelligencePage>} />
          <Route path="/optimization" element={<IntelligencePage><OptimizationScreen /></IntelligencePage>} />
          <Route path="/analytics"    element={<IntelligencePage><AnalyticsScreen /></IntelligencePage>} />
          <Route path="/inventory"    element={<IntelligencePage><InventoryScreen /></IntelligencePage>} />
          <Route path="/comparison"   element={<IntelligencePage><ComparisonScreen /></IntelligencePage>} />
          <Route path="/map"          element={<IntelligencePage><MapScreen /></IntelligencePage>} />
          {isDev && <Route path="/styleguide" element={<IntelligencePage><StyleGuideScreen /></IntelligencePage>} />}
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
