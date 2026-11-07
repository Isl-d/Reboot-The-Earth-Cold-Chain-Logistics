import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import PageGrid from './components/layout/PageGrid'
import { PageHeader } from './components/layout/PageHeader'
import { TopNav } from './components/layout/TopNav'
import './hooks/useTheme' // applies the stored theme before first paint
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
 * Wraps the ported intelligence screens in the same chrome as the command
 * center pages: the navy page band, then the screen's col-span-* grid on the
 * dotted canvas.
 */
function IntelligencePage({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <PageHeader eyebrow="Analyse" title={title} />
      <div className="tt-canvas flex-1 overflow-y-auto px-4 py-5 tablet:px-5">
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--color-base)', color: 'var(--color-text-primary)' }}>
      <TopNav />
      <main style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          {/* Command center (Person 1) */}
          <Route path="/"          element={<CommandCenter />} />
          <Route path="/fleet"     element={<Fleet />} />
          <Route path="/trucks/:id" element={<TruckDetail />} />
          <Route path="/incidents" element={<Incidents />} />

          {/* Intelligence (Person 2) */}
          <Route path="/simulation"   element={<IntelligencePage title={<>Run a <em>scenario</em></>}><SimulationScreen /></IntelligencePage>} />
          <Route path="/model"        element={<IntelligencePage title={<>The <em>model</em>, step by step</>}><ModelScreen /></IntelligencePage>} />
          <Route path="/optimization" element={<IntelligencePage title={<><em>Optimize</em> the next move</>}><OptimizationScreen /></IntelligencePage>} />
          <Route path="/analytics"    element={<IntelligencePage title={<>Food <em>loss</em> prevented</>}><AnalyticsScreen /></IntelligencePage>} />
          <Route path="/inventory"    element={<IntelligencePage title={<><em>Inventory</em> at the stores</>}><InventoryScreen /></IntelligencePage>} />
          <Route path="/comparison"   element={<IntelligencePage title={<>Act now <em>vs</em> do nothing</>}><ComparisonScreen /></IntelligencePage>} />
          <Route path="/map"          element={<IntelligencePage title={<>Fleet <em>map</em></>}><MapScreen /></IntelligencePage>} />
          {isDev && <Route path="/styleguide" element={<IntelligencePage title={<>Style <em>guide</em></>}><StyleGuideScreen /></IntelligencePage>} />}
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
