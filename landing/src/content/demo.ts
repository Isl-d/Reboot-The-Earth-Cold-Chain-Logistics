// The T102 refrigeration-failure story, as scripted in pitch/DEMO_SCRIPT.md.
// These are scenario inputs and scripted readings; SIMULATED, never measured.
// Food saved (kg / QAR) is deliberately absent: backend/intelligence/foodloss.py
// computes it at runtime, and the page must not invent it. To show it, snapshot
// one real run of `make scenario SCENARIO=REFRIGERATION_FAILURE TRUCK=T102` here.

export type Provenance = 'SIMULATED' | 'SYNTHETIC' | 'CITED' | 'ILLUSTRATIVE' | 'AI-GENERATED'

export const truck = {
  id: 'T102',
  cargo: 'Fresh chicken',
  massKg: 500,
  safeBandC: [0, 4] as const,
  provenance: 'SIMULATED' as Provenance,
}

/** Scripted temperature climb after the cooling unit stops. */
export const temperatureTrace = [3.8, 4.4, 5.1, 5.9, 6.7, 7.4]

export const timeline = [
  { t: '0:00', label: 'Cooling normal', detail: '3.8 °C · risk LOW', tone: 'low' },
  { t: '0:40', label: 'Refrigeration fails', detail: 'cargo starts warming', tone: 'medium' },
  { t: '1:00', label: 'Incident opens', detail: 'risk climbs to HIGH', tone: 'high' },
  { t: '2:00', label: 'Cold stores compared', detail: 'three candidates in range', tone: 'high' },
  { t: '2:30', label: 'DIVERT → WH01', detail: 'optimizer picks the least loss', tone: 'low' },
] as const

export const warehouses = [
  { id: 'WH01', etaMin: 18, selected: true },
  { id: 'WH02', etaMin: 27, selected: false },
  { id: 'WH03', etaMin: 46, selected: false },
]

export const decision = { action: 'DIVERT', target: 'WH01' }
