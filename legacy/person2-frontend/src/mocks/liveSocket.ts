/*
  Mock /ws/live — implements just enough of the WebSocket interface for
  useLiveSocket (src/api/hooks/useLiveSocket.ts) to treat it identically to a
  real WebSocket. Emits a LiveMessageDto for every truck with a running
  simulation, every `intervalMs`.
*/

import type { LiveMessageDto } from '../api/dto'
import { TRUCKS } from './fixtures'
import { doorOpenAt, humidityAt, temperatureAt } from './scenarioEngine'
import { mockSimulationStore } from './store'

type Listener = (event: { data: string }) => void

export class MockLiveSocket {
  readyState = 1 // WebSocket.OPEN
  onopen: (() => void) | null = null
  onmessage: Listener | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null

  private timer: ReturnType<typeof setInterval>

  constructor(intervalMs = 2000) {
    // Fire onopen on the next tick, matching real WebSocket's async handshake.
    setTimeout(() => this.onopen?.(), 0)
    this.timer = setInterval(() => this.tick(), intervalMs)
  }

  private tick() {
    for (const truck of TRUCKS) {
      const state = mockSimulationStore.get(truck.id)
      if (!state?.running) continue
      const simMinutes = mockSimulationStore.elapsedSimMinutes(truck.id)
      const message: LiveMessageDto = {
        truckId: truck.id,
        sample: {
          timestamp: new Date().toISOString(),
          temperatureC: Math.round(temperatureAt(state.scenario, simMinutes) * 10) / 10,
          humidityPct: Math.round(humidityAt(state.scenario, simMinutes)),
          doorOpen: doorOpenAt(state.scenario, simMinutes),
        },
      }
      this.onmessage?.({ data: JSON.stringify(message) })
    }
  }

  send(): void {
    // The real /ws/live is receive-only from the frontend's perspective; nothing to send.
  }

  close(): void {
    clearInterval(this.timer)
    this.readyState = 3 // WebSocket.CLOSED
    this.onclose?.()
  }
}
