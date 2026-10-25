/*
  Copied verbatim from Person 1's original command-center API contract; the
  live wire shapes are in docs/API_CONTRACT.md.
  Person 1 owns these interfaces — do not rename or restructure fields here.
  If Person 1's real contract changes, update this file to match, then fix
  whichever adapters in src/api/adapters/ consume it.
*/

export interface Truck {
  id: string
  latitude: number
  longitude: number
  temperature: number
  humidity: number
  speed: number
  riskScore: number
  riskLevel: string
}

export interface Prediction {
  spoilageProbability: number
  remainingShelfLife: number
  thermalExposure: number
  confidence: number
}

export interface Recommendation {
  action: string
  destination?: string
  eta?: number
  expectedLoss: number
  foodSaved: number
  reasoning: string
}
