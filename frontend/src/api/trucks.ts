import type { TruckDetail, TruckSummary, TelemetryPoint } from '../types'
import { apiClient } from './client'

// Command-center API surface (Person 1). Uses the shared axios client whose
// baseURL is '' — paths include the '/api' prefix so the dev proxy forwards
// them to the backend.
export async function getTrucks(): Promise<TruckSummary[]> {
  const { data } = await apiClient.get<{ trucks: TruckSummary[] }>('/api/trucks')
  return data.trucks
}

export async function getTruck(id: string): Promise<TruckDetail> {
  const { data } = await apiClient.get<TruckDetail>(`/api/trucks/${id}`)
  return data
}

export async function getTelemetry(
  id: string,
  from: string,
  to: string,
): Promise<TelemetryPoint[]> {
  const { data } = await apiClient.get<TelemetryPoint[]>(
    `/api/trucks/${id}/telemetry`,
    { params: { from, to } },
  )
  return data
}
