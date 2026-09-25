import axios from 'axios'

// Empty baseURL by default so the '/api/...' paths in endpoints.ts resolve
// against the current origin (and the Vite dev proxy). Override with
// VITE_API_BASE_URL only when the API lives on a different host.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10_000,
})

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'
