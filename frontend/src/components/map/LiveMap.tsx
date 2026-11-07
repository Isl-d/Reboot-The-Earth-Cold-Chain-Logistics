import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { useEffect, useRef, type ReactNode } from 'react'
import type { RiskLevel, TruckSummary } from '../../types'
import { RiskBadge } from '../common/RiskBadge'
import { HYPERMARKETS, MAP_CENTER, MAP_ZOOM, SUPERMARKETS, WAREHOUSES } from './mapConfig'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/* ── QAI markers ───────────────────────────────────────────────
   Leaflet div icons are plain HTML in the page, so colours are CSS variables
   and follow the light/dark theme without re-rendering. Risk fills use the
   same scale as RiskBadge: lime LOW, gold MEDIUM, coral HIGH, deep red
   CRITICAL. */
const RISK_FILL: Record<string, { bg: string; fg: string }> = {
  LOW: { bg: 'var(--color-fill-lime)', fg: 'var(--color-on-fill)' },
  MEDIUM: { bg: 'var(--color-fill-sun)', fg: 'var(--color-on-fill)' },
  HIGH: { bg: 'var(--color-fill-coral)', fg: 'var(--color-on-fill)' },
  CRITICAL: { bg: 'var(--color-fill-critical)', fg: '#fbf9f3' },
}
const UNKNOWN_FILL = { bg: 'var(--color-elevated)', fg: 'var(--color-text-primary)' }

const TRUCK_GLYPH = `<svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden="true">
  <rect x="0" y="0" width="10" height="7.5" rx="1"/><path d="M10.6 2.2h2.9l2.5 3v2.3h-5.4z"/>
  <circle cx="3.4" cy="9" r="1.9"/><circle cx="12.4" cy="9" r="1.9"/></svg>`

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

/**
 * Truck tag: an ink-framed tab filled by risk, with the truck id in mono,
 * standing on a short ink stem whose foot is the truck's position. Trucks
 * with an open incident pulse at the foot; `selected` adds a sky ring.
 */
export function truckMarkerIcon(id: string, risk: string | undefined, opts: { active?: boolean; selected?: boolean } = {}) {
  const fill = RISK_FILL[(risk ?? '').toUpperCase()] ?? UNKNOWN_FILL
  const label = escapeHtml(id)
  const w = Math.round(40 + id.length * 7)
  const ring = opts.selected
    ? '0 0 0 3px var(--color-fill-sky), 4px 4px 0 2px var(--color-shadow)'
    : '2px 2px 0 0 var(--color-shadow)'
  const pulse = opts.active
    ? `<span style="position:absolute;left:${w / 2 - 7}px;top:29px;width:14px;height:14px;border-radius:50%;background:${fill.bg};animation:pulse-ring 1.4s ease-out infinite"></span>`
    : ''
  const html = `<div style="position:relative;width:${w}px;height:40px;">
    ${pulse}
    <span style="position:absolute;left:${w / 2 - 1.5}px;top:22px;width:3px;height:14px;background:var(--color-ink)"></span>
    <span style="position:absolute;left:${w / 2 - 4}px;top:32px;width:8px;height:8px;border-radius:50%;background:${fill.bg};border:2px solid var(--color-ink);box-sizing:border-box"></span>
    <div style="position:absolute;left:0;top:0;width:${w}px;height:25px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:5px;
      border:2.5px solid var(--color-ink);border-radius:6px;background:${fill.bg};color:${fill.fg};box-shadow:${ring};
      font:700 11px/1 var(--font-mono);letter-spacing:0.03em;white-space:nowrap">${TRUCK_GLYPH}${label}</div>
  </div>`
  return L.divIcon({ html, className: '', iconSize: [w, 40], iconAnchor: [w / 2, 36], popupAnchor: [0, -38] })
}

const PLACE_LABEL_STYLE =
  'margin-top:3px;font:700 10px/1 var(--font-mono);letter-spacing:0.04em;color:var(--color-text-primary);white-space:nowrap;text-shadow:0 0 3px var(--color-base),0 0 3px var(--color-base),0 0 6px var(--color-base);pointer-events:none'

function placeIcon(shape: string, size: number, label?: string) {
  const html = `<div style="width:96px;display:flex;flex-direction:column;align-items:center">
    ${shape}
    ${label ? `<div style="${PLACE_LABEL_STYLE}">${escapeHtml(label)}</div>` : ''}
  </div>`
  return L.divIcon({ html, className: '', iconSize: [96, size + 16], iconAnchor: [48, size / 2], popupAnchor: [0, -size / 2 - 2] })
}

/** Cold-storage warehouse: an ink-filled square tile marked WH. */
export function warehouseMarkerIcon(label?: string) {
  const s = 26
  const shape = `<div style="width:${s}px;height:${s}px;box-sizing:border-box;display:grid;place-items:center;border:2.5px solid var(--color-ink);border-radius:5px;
    background:var(--color-band);color:var(--color-on-band);box-shadow:2px 2px 0 0 var(--color-shadow);font:700 9px/1 var(--font-mono);letter-spacing:0.04em">WH</div>`
  return placeIcon(shape, s, label)
}

/** Store: a paper circle, H for a hypermarket, S for a supermarket. */
export function storeMarkerIcon(kind: 'H' | 'S' = 'S', label?: string) {
  const s = kind === 'H' ? 24 : 21
  const shape = `<div style="width:${s}px;height:${s}px;box-sizing:border-box;display:grid;place-items:center;border:2.5px solid var(--color-ink);border-radius:50%;
    background:var(--color-surface);color:var(--color-text-primary);box-shadow:2px 2px 0 0 var(--color-shadow);font:700 10px/1 var(--font-mono)">${kind}</div>`
  return placeIcon(shape, s, label)
}

/* ── Legend strip under a map ─────────────────────────────────── */
const LEGEND_RISK: { level: RiskLevel; label: string; cls: string }[] = [
  { level: 'LOW', label: 'Low', cls: 'bg-fill-lime' },
  { level: 'MEDIUM', label: 'Medium', cls: 'bg-fill-sun' },
  { level: 'HIGH', label: 'High', cls: 'bg-fill-coral' },
  { level: 'CRITICAL', label: 'Critical', cls: 'bg-fill-critical' },
]

/** Risk colours and place symbols, on a 3px ink rule. `children` adds items. */
export function MapLegend({ places = true, children }: { places?: boolean; children?: ReactNode }) {
  return (
    <div className="tt-caps flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-t-[3px] border-ink bg-surface px-3.5 py-2 text-text-primary">
      <span className="text-text-secondary">Risk</span>
      {LEGEND_RISK.map(({ level, label, cls }) => (
        <span key={level} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded-full border-2 border-ink ${cls}`} aria-hidden />
          {label}
        </span>
      ))}
      {places && (
        <>
          <span className="h-4 w-[2px] bg-border" aria-hidden />
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-[3px] border-2 border-ink bg-band" aria-hidden />
            Warehouse
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-ink bg-surface" aria-hidden />
            Store
          </span>
        </>
      )}
      {children}
    </div>
  )
}

/* ── MapUpdater: fit bounds once, when the first trucks arrive ── */
function MapUpdater({ trucks }: { trucks: TruckSummary[] }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || trucks.length === 0) return
    fitted.current = true
    const bounds = L.latLngBounds(trucks.map((t) => [t.latitude, t.longitude]))
    // Smaller padding on a phone-sized map so the trucks are not pushed out.
    const size = map.getSize()
    const pad = Math.round(Math.min(80, Math.min(size.x, size.y) / 6))
    map.fitBounds(bounds, { padding: [pad, pad], maxZoom: 13 })
  }, [trucks, map])
  return null
}

/* ── Popup content helpers ─────────────────────────────────── */
function LocationPopup({ name, type }: { name: string; type: string }) {
  return (
    <div className="min-w-[130px]">
      <div className="mb-0.5 text-[13px] font-extrabold text-text-primary">{name}</div>
      <div className="tt-caps text-[10px] text-text-secondary">{type}</div>
    </div>
  )
}

interface Props {
  trucks: TruckSummary[]
  onTruckClick: (id: string) => void
}

export function LiveMap({ trucks, onTruckClick }: Props) {
  return (
    <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="h-full w-full" zoomControl={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        maxZoom={19}
        keepBuffer={4}
        updateWhenZooming={false}
      />
      <MapUpdater trucks={trucks} />

      {/* ── Warehouses ──────────────────────────────────────── */}
      {WAREHOUSES.map((wh) => (
        <Marker key={wh.id} position={[wh.lat, wh.lon]} icon={warehouseMarkerIcon(wh.id)}>
          <Tooltip direction="top" offset={[0, -16]} opacity={1}>
            <LocationPopup name={wh.name} type="Cold storage" />
          </Tooltip>
          <Popup><LocationPopup name={wh.name} type="Cold storage warehouse" /></Popup>
        </Marker>
      ))}

      {/* ── Hypermarkets ────────────────────────────────────── */}
      {HYPERMARKETS.map((h) => (
        <Marker key={h.id} position={[h.lat, h.lon]} icon={storeMarkerIcon('H', h.name.split(' ')[0])}>
          <Tooltip direction="top" offset={[0, -14]} opacity={1}>
            <LocationPopup name={h.name} type="Hypermarket" />
          </Tooltip>
          <Popup><LocationPopup name={h.name} type="Hypermarket" /></Popup>
        </Marker>
      ))}

      {/* ── Supermarkets ────────────────────────────────────── */}
      {SUPERMARKETS.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lon]} icon={storeMarkerIcon('S', s.name.split(' ')[0])}>
          <Tooltip direction="top" offset={[0, -12]} opacity={1}>
            <LocationPopup name={s.name} type="Supermarket" />
          </Tooltip>
          <Popup><LocationPopup name={s.name} type="Supermarket" /></Popup>
        </Marker>
      ))}

      {/* ── Trucks ──────────────────────────────────────────── */}
      {trucks.map((truck) => (
        <Marker
          key={truck.id}
          position={[truck.latitude, truck.longitude]}
          icon={truckMarkerIcon(truck.id, truck.riskLevel, { active: truck.activeIncident })}
          zIndexOffset={truck.activeIncident ? 1000 : 500}
          eventHandlers={{ click: () => onTruckClick(truck.id) }}
        >
          <Popup>
            <div className="min-w-[170px]">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="font-mono text-[14px] font-bold text-text-primary">{truck.id}</span>
                <RiskBadge level={truck.riskLevel} />
              </div>
              <div className="font-mono text-[12px] text-text-primary">
                {truck.temperatureC.toFixed(1)}°C · {truck.humidityPct}% RH
              </div>
              <div className="font-mono text-[11px] text-text-secondary">
                {truck.speedKmh} km/h · Score {truck.riskScore}
              </div>
              <button
                type="button"
                onClick={() => onTruckClick(truck.id)}
                className="tt-press tt-caps mt-2.5 w-full bg-fill-maroon px-2 py-1 text-[#fbf9f3]"
              >
                View details →
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
