/*
  Every backend URL/path in one place — docs/PERSON_2_FRONTEND_INTELLIGENCE.md
  "Data you receive" / "Data you send". If the backend renames a route, this
  is the only file that needs to change.
*/

export const endpoints = {
  simulationStart: '/api/simulation/start',
  simulationStop: '/api/simulation/stop',
  simulationReset: '/api/simulation/reset',
  simulationState: (truckId: string) => `/api/simulation/${truckId}`,
  thermalExposure: (truckId: string) => `/api/model/${truckId}/thermal-exposure`,
  deterioration: (truckId: string) => `/api/model/${truckId}/deterioration`,
  spoilagePrediction: (truckId: string) => `/api/model/${truckId}/spoilage`,
  optimizationCandidates: (truckId: string, batchId: string) => `/api/optimization/${truckId}/${batchId}`,
  optimizationEvaluate: '/api/optimization/evaluate',
  foodLossAnalytics: '/api/analytics/food-loss',
  foodLossSeries: '/api/analytics/food-loss/series',
  inventory: '/api/inventory',
  truckTelemetry: (truckId: string) => `/api/trucks/${truckId}/telemetry`,
  scenarioComparison: (scenario: string) => `/api/analytics/scenario-comparison/${scenario}`,
  trucks: '/api/trucks',
} as const
