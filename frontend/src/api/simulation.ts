import type { SimulationScenario } from '../types'
import { apiClient } from './client'

export async function startSimulation(truckId?: string) {
  const { data } = await apiClient.post('/api/simulation/start', truckId ? { truckId } : {})
  return data
}

export async function stopSimulation(truckId?: string) {
  const { data } = await apiClient.post('/api/simulation/stop', truckId ? { truckId } : {})
  return data
}

export async function resetSimulation(truckId?: string) {
  const { data } = await apiClient.post('/api/simulation/reset', truckId ? { truckId } : {})
  return data
}

export async function triggerScenario(truckId: string, scenario: SimulationScenario) {
  const { data } = await apiClient.post('/api/simulation/scenario', { truckId, scenario })
  return data
}
