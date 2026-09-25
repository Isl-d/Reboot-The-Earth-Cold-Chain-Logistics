import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useQuery } from '@tanstack/react-query'
import { fetchRoutesGeoJson, fetchAllTruckPositions } from '@/api/fetchers'
import { Card } from '@/design'

const QATAR_CENTER: [number, number] = [25.28, 51.18]
const QATAR_ZOOM = 9

// Theme-aware colours (index.css). Three routes in the data; the fourth slot
// is never reached, so no hue is ever cycled.
const ROUTE_COLORS = ['var(--color-route-1)', 'var(--color-route-2)', 'var(--color-route-3)']

// Markers use DESIGN.md tokens: a Tactical Slate ring instead of a drop shadow.
function markerIcon(size: number, radius: string, background: string, label: string, fontSize: number) {
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:${radius};
      background:${background};border:2px solid var(--color-base);
      display:flex;align-items:center;justify-content:center;
      font-family:var(--font-sans);font-size:${fontSize}px;color:var(--color-base);font-weight:600;
    ">${label}</div>`,
  })
}

const truckIcon = (riskColor: string) => markerIcon(28, '50%', riskColor, 'T', 12)
const warehouseIcon = () => markerIcon(24, '2px', 'var(--color-text-secondary)', 'W', 10)
const storeIcon = () => markerIcon(22, '50%', 'var(--color-text-primary)', 'S', 9)

// The backend sends riskLevel uppercase (CRITICAL); the mock layer lowercase.
function riskToColor(risk?: string): string {
  switch (risk?.toLowerCase()) {
    case 'critical': return 'var(--color-risk-critical)'
    case 'high': return 'var(--color-risk-high)'
    case 'medium': return 'var(--color-risk-medium)'
    case 'low': return 'var(--color-risk-low)'
    default: return 'var(--color-text-secondary)'
  }
}

interface TruckPosition {
  truckId: string
  name: string
  lat: number
  lon: number
  temperatureC?: number
  speedKmh?: number
  risk?: string
  product?: string
}

function FitBounds({ geojson }: { geojson: GeoJSON.FeatureCollection | null }) {
  const map = useMap()
  useEffect(() => {
    if (!geojson || !geojson.features.length) return
    const layer = L.geoJSON(geojson)
    const bounds = layer.getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [geojson, map])
  return null
}

function RouteStyler({ geojson }: { geojson: GeoJSON.FeatureCollection }) {
  const geoJsonRef = useRef<L.GeoJSON | null>(null)

  const routeStyle = useMemo(() => {
    return (_feature: GeoJSON.Feature | undefined, idx: number) => ({
      color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
      weight: 4,
      opacity: 0.85,
    })
  }, [])

  const styleCallback = (feature?: GeoJSON.Feature): L.PathOptions => {
    const routeId = feature?.properties?.route_id ?? ''
    const idx = geojson.features.findIndex(
      (f) => f.properties?.route_id === routeId,
    )
    return routeStyle(feature, idx >= 0 ? idx : 0)
  }

  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    const props = feature.properties
    if (props && props.name) {
      ;(layer as L.Path).bindTooltip(
        `<strong>${props.route_id}</strong>: ${props.name}<br/>${props.distance_km ?? '?'} km`,
        { sticky: true },
      )
    }
  }

  return (
    <GeoJSON
      ref={(el: L.GeoJSON | null) => { geoJsonRef.current = el }}
      key={JSON.stringify(geojson).slice(0, 100)}
      data={geojson}
      style={styleCallback}
      onEachFeature={onEachFeature}
    />
  )
}

export default function MapScreen() {
  const { data: geojson, isLoading: geoLoading } = useQuery({
    queryKey: ['routesGeoJson'],
    queryFn: fetchRoutesGeoJson,
    staleTime: 60_000,
  })

  const { data: trucks } = useQuery<TruckPosition[]>({
    queryKey: ['allTruckPositions'],
    queryFn: fetchAllTruckPositions,
    refetchInterval: 5_000,
  })

  const [selectedTruck, setSelectedTruck] = useState<string | null>(null)

  const warehouseMarkers = useMemo(() => [
    { id: 'WH01', label: 'WH01 — Doha North', lat: 25.35, lon: 51.44 },
    { id: 'WH02', label: 'WH02 — Al Wakrah', lat: 25.17, lon: 51.60 },
    { id: 'WH03', label: 'WH03 — Industrial Area', lat: 25.19, lon: 51.43 },
    { id: 'WH04', label: 'WH04 — Al Rayyan', lat: 25.29, lon: 51.42 },
  ], [])

  const storeMarkers = useMemo(() => [
    { id: 'STORE01', label: 'Al Meera — West Bay', lat: 25.32, lon: 51.52 },
    { id: 'STORE02', label: 'Lulu — Al Wakrah', lat: 25.17, lon: 51.60 },
    { id: 'STORE03', label: 'Carrefour — Al Rayyan', lat: 25.29, lon: 51.42 },
  ], [])

  return (
    <div className="col-span-4 tablet:col-span-8 desktop:col-span-12 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 text-label-ui uppercase text-muted">
        {[
          { label: 'Route', color: 'var(--color-route-1)', square: true },
          { label: 'Low', color: 'var(--color-risk-low)' },
          { label: 'Medium', color: 'var(--color-risk-medium)' },
          { label: 'High', color: 'var(--color-risk-high)' },
          { label: 'Critical', color: 'var(--color-risk-critical)' },
          { label: 'Warehouse', color: 'var(--color-text-secondary)', square: true },
          { label: 'Store', color: 'var(--color-text-primary)' },
        ].map(({ label, color, square }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2.5 w-2.5 ${square ? 'rounded-sm' : 'rounded-full'}`}
              style={{ background: color }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* DESIGN.md → Shapes: the map container is a data panel — zero radius. */}
      <Card className="relative flex-1 overflow-hidden" style={{ borderRadius: 0 }}>
        {geoLoading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-base/80">
            <span className="text-body-md text-muted">Loading map data...</span>
          </div>
        )}
        <MapContainer
          center={QATAR_CENTER}
          zoom={QATAR_ZOOM}
          className="h-full w-full"
          style={{ minHeight: 500 }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {geojson && <FitBounds geojson={geojson} />}
          {geojson && <RouteStyler geojson={geojson} />}

          {warehouseMarkers.map((wh) => (
            <Marker key={wh.id} position={[wh.lat, wh.lon]} icon={warehouseIcon()}>
              <Popup><strong>{wh.label}</strong></Popup>
            </Marker>
          ))}

          {storeMarkers.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lon]} icon={storeIcon()}>
              <Popup><strong>{s.label}</strong></Popup>
            </Marker>
          ))}

          {trucks?.map((t) =>
            t.lat != null && t.lon != null ? (
              <Marker
                key={t.truckId}
                position={[t.lat, t.lon]}
                icon={truckIcon(riskToColor(t.risk))}
                eventHandlers={{
                  click: () => setSelectedTruck(t.truckId),
                }}
              >
                <Popup>
                  <div className="text-body-sm">
                    <strong className="text-navy">{t.name || t.truckId}</strong>
                    {t.temperatureC != null && (
                      <div className="font-mono">{t.temperatureC.toFixed(1)} °C</div>
                    )}
                    {t.speedKmh != null && <div>{t.speedKmh.toFixed(0)} km/h</div>}
                    {t.product && <div className="text-muted">{t.product}</div>}
                  </div>
                </Popup>
              </Marker>
            ) : null,
          )}
        </MapContainer>
      </Card>

      {trucks && trucks.length > 0 && (
        <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
          {trucks.map((t) => (
            <Card
              key={t.truckId}
              className="cursor-pointer p-3"
              style={selectedTruck === t.truckId ? { borderColor: 'var(--color-primary)' } : undefined}
              onClick={() => setSelectedTruck(t.truckId === selectedTruck ? null : t.truckId)}
            >
              <div className="flex items-center justify-between">
                <span className="text-headline-sm text-navy">{t.name || t.truckId}</span>
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: riskToColor(t.risk) }}
                />
              </div>
              <div className="mt-1 flex gap-4 font-mono text-body-sm text-muted">
                {t.temperatureC != null && <span>{t.temperatureC.toFixed(1)} °C</span>}
                {t.speedKmh != null && <span>{t.speedKmh.toFixed(0)} km/h</span>}
                {t.product && <span className="truncate">{t.product}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
