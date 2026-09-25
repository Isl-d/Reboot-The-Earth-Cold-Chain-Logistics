export const MAP_CENTER: [number, number] = [25.285, 51.51]
export const MAP_ZOOM = 11

export const WAREHOUSES = [
  { id: 'WH01', name: 'Cold Storage WH01', lat: 25.3180, lon: 51.4280 },
  { id: 'WH02', name: 'Cold Storage WH02', lat: 25.2480, lon: 51.5580 },
]

export const HYPERMARKETS = [
  { id: 'Carrefour', name: 'Carrefour City Center', lat: 25.2868, lon: 51.5330 },
  { id: 'LuluHyper', name: 'Lulu Hypermarket',      lat: 25.2612, lon: 51.4980 },
]

export const SUPERMARKETS = [
  { id: 'Megamart', name: 'Megamart Al Gharafa',  lat: 25.3050, lon: 51.5050 },
  { id: 'Family',   name: 'Family Food Centre',   lat: 25.2750, lon: 51.5200 },
]

// CSS variables (index.css), so markers follow the dark/light theme.
export const RISK_COLORS: Record<string, string> = {
  LOW: 'var(--color-risk-low)',
  MEDIUM: 'var(--color-risk-medium)',
  HIGH: 'var(--color-risk-high)',
  CRITICAL: 'var(--color-risk-critical)',
}

// Place markers stay neutral — DESIGN.md reserves risk colours for risk state.
export const PLACE_COLORS = {
  warehouse: 'var(--color-text-secondary)',
  store: 'var(--color-text-primary)',
}
