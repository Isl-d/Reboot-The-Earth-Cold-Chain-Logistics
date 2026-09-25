/*
  In-memory "is a simulation running" state for the mock backend. Everything
  derived from a running simulation (temperature, exposure, risk, telemetry
  history) is a pure function of (scenario, elapsedSimMinutes) — see
  scenarioEngine.ts — so this store only needs to hold the small bit of state
  that isn't recomputable: which truck is running what, since when.
*/

import type { ScenarioId } from '../api/dto'
import { findTruck } from './fixtures'

interface RunningSimulation {
  truckId: string
  batchId: string
  scenario: ScenarioId
  speedMultiplier: number
  startedAtMs: number
  running: boolean
}

class MockSimulationStore {
  private simulations = new Map<string, RunningSimulation>()

  start(truckId: string, scenario: ScenarioId, speedMultiplier: number): RunningSimulation {
    const truck = findTruck(truckId)
    const batchId = truck?.batchId ?? 'UNKNOWN'
    const state: RunningSimulation = {
      truckId,
      batchId,
      scenario,
      speedMultiplier,
      startedAtMs: Date.now(),
      running: true,
    }
    this.simulations.set(truckId, state)
    return state
  }

  stop(truckId: string): RunningSimulation | undefined {
    const state = this.simulations.get(truckId)
    if (!state) return undefined
    state.running = false
    return state
  }

  reset(truckId: string): RunningSimulation | undefined {
    this.simulations.delete(truckId)
    return undefined
  }

  get(truckId: string): RunningSimulation | undefined {
    return this.simulations.get(truckId)
  }

  /** Elapsed simulated minutes since start, scaled by speedMultiplier. 0 if never started. */
  elapsedSimMinutes(truckId: string): number {
    const state = this.simulations.get(truckId)
    if (!state) return 0
    const realMsElapsed = Date.now() - state.startedAtMs
    return (realMsElapsed / 60_000) * state.speedMultiplier
  }
}

export const mockSimulationStore = new MockSimulationStore()
export type { RunningSimulation }
