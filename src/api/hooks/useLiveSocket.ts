import { useEffect, useRef, useState } from 'react'
import { adaptTelemetrySample } from '../adapters'
import { USE_MOCKS } from '../client'
import type { TelemetrySampleDto } from '../dto'
import type { TelemetrySample } from '../types'
import { MockLiveSocket } from '../../mocks/liveSocket'

export type LiveConnectionStatus = 'connecting' | 'open' | 'offline'

interface LiveSocketState {
  status: LiveConnectionStatus
  samplesByTruck: Record<string, TelemetrySample>
}

// The minimal slice of the WebSocket API this hook actually uses. MockLiveSocket
// implements this directly; the real WebSocket is narrowed to it below, since
// its full event types (MessageEvent, CloseEvent, ...) carry more than we read.
interface LiveSocketLike {
  onopen: (() => void) | null
  onmessage: ((event: { data: string }) => void) | null
  onerror: (() => void) | null
  onclose: (() => void) | null
  close(): void
}

const MAX_BACKOFF_MS = 10_000

/**
 * Subscribes to /ws/live — the same stream as Person 1's /sensors/live (see
 * docs/PIPELINE.md "Resolved"), so this is the one subscription point any
 * screen can use for live telemetry. Reconnects with exponential backoff on
 * an unexpected close; a malformed message is dropped, not fatal.
 */
export function useLiveSocket() {
  const [state, setState] = useState<LiveSocketState>({ status: 'connecting', samplesByTruck: {} })
  const attemptRef = useRef(0)

  useEffect(() => {
    let socket: LiveSocketLike
    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout>

    function connect() {
      socket = USE_MOCKS ? new MockLiveSocket() : (new WebSocket(import.meta.env.VITE_WS_URL) as unknown as LiveSocketLike)
      setState((s) => ({ ...s, status: 'connecting' }))

      socket.onopen = () => {
        attemptRef.current = 0
        setState((s) => ({ ...s, status: 'open' }))
      }

      socket.onmessage = (event) => {
        try {
          // The backend /ws/live sends flat messages; the mock wraps them in
          // `sample`. Normalise both shapes into a TelemetrySampleDto here so
          // adaptTelemetrySample sees the same structure in either case.
          type RawMsg = {
            truckId: string
            event?: string
            // Wrapped shape (mock)
            sample?: TelemetrySampleDto
            // Flat shape (real backend)
            timestamp?: string
            temperatureC?: number
            humidityPct?: number
            doorOpen?: boolean
          }
          const raw = JSON.parse(event.data) as RawMsg
          const sampleDto: TelemetrySampleDto = raw.sample ?? {
            timestamp: raw.timestamp ?? new Date().toISOString(),
            temperatureC: raw.temperatureC ?? 0,
            humidityPct: raw.humidityPct ?? 0,
            doorOpen: raw.doorOpen ?? false,
          }
          const sample = adaptTelemetrySample(sampleDto)
          setState((s) => ({ ...s, samplesByTruck: { ...s.samplesByTruck, [raw.truckId]: sample } }))
        } catch {
          // Drop a malformed live message rather than crash the subscription;
          // the next message (or a screen's own polling fallback) recovers state.
        }
      }

      socket.onclose = () => {
        if (cancelled) return
        setState((s) => ({ ...s, status: 'offline' }))
        const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attemptRef.current)
        attemptRef.current += 1
        reconnectTimer = setTimeout(connect, delay)
      }

      socket.onerror = () => socket.close()
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [])

  return state
}
