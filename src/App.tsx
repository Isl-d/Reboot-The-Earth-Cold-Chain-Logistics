import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Shell from './layout/Shell'

// Every screen (Recharts-heavy) is code-split per route — Shell wraps the
// Outlet in one Suspense boundary so the sidebar/top bar never unmount
// during a chunk load, only the content area shows a fallback.
const SimulationScreen = lazy(() => import('./screens/simulation/SimulationScreen'))
const ModelScreen = lazy(() => import('./screens/model/ModelScreen'))
const OptimizationScreen = lazy(() => import('./screens/optimization/OptimizationScreen'))
const AnalyticsScreen = lazy(() => import('./screens/analytics/AnalyticsScreen'))
const InventoryScreen = lazy(() => import('./screens/inventory/InventoryScreen'))
const ComparisonScreen = lazy(() => import('./screens/comparison/ComparisonScreen'))
const StyleGuideScreen = lazy(() => import('./screens/styleguide/StyleGuideScreen'))

const isDev = import.meta.env.DEV

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/simulation" replace />} />
        <Route path="/simulation" element={<SimulationScreen />} />
        <Route path="/model" element={<ModelScreen />} />
        <Route path="/optimization" element={<OptimizationScreen />} />
        <Route path="/analytics" element={<AnalyticsScreen />} />
        <Route path="/inventory" element={<InventoryScreen />} />
        <Route path="/comparison" element={<ComparisonScreen />} />
        {isDev && <Route path="/styleguide" element={<StyleGuideScreen />} />}
        <Route path="*" element={<Navigate to="/simulation" replace />} />
      </Route>
    </Routes>
  )
}
