// Reference geography for the map: real warehouses and stores from the backend.
import { apiClient } from './client'
import { endpoints } from './endpoints'

export interface WarehouseMarker {
  id: string
  name: string
  latitude: number
  longitude: number
  availableCapacityKg?: number
}

export interface StoreMarker {
  id: string
  name: string
  latitude: number
  longitude: number
}

export async function fetchWarehouses(): Promise<WarehouseMarker[]> {
  return (await apiClient.get<{ warehouses: WarehouseMarker[] }>(endpoints.warehouses)).data.warehouses
}

export async function fetchStores(): Promise<StoreMarker[]> {
  return (await apiClient.get<{ stores: StoreMarker[] }>(endpoints.stores)).data.stores
}