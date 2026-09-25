import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Shell from './layout/Shell'
import SimulationScreen from './screens/simulation/SimulationScreen'
import ModelScreen from './screens/model/ModelScreen'
import OptimizationScreen from './screens/optimization/OptimizationScreen'
import AnalyticsScreen from './screens/analytics/AnalyticsScreen'
import InventoryScreen from './screens/inventory/InventoryScreen'
import ComparisonScreen from './screens/comparison/ComparisonScreen'

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
        {isDev && (
          <Route
            path="/styleguide"
            element={
              <Suspense fallback={null}>
                <StyleGuideScreen />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/simulation" replace />} />
      </Route>
    </Routes>
  )
}
