import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000,
})

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'
