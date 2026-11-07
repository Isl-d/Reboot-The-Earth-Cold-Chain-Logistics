import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useQuery } from '@tanstack/react-query'
import { fetchRoutesGeoJson, fetchAllTruckPositions } from '@/api/fetchers'
import { fetchStores, fetchWarehouses } from '@/api/geo'
import { Box } from '@/design'
import { RiskBadge } from '@/components/common/RiskBadge'
import { MapLegend, storeMarkerIcon, truckMarkerIcon, warehouseMarkerIcon } from '@/components/map/LiveMap'
import type { RiskLevel } from '@/types'

const QATAR_CENTER: [number, number] = [25.28, 51.18]
const QATAR_ZOOM = 9

const ROUTE_COLORS = ['var(--color-route-1)', 'var(--color-route-2)', 'var(--color-route-3)']

// A 1x1 transparent tile so an offline map degrades to the themed panel
// instead of showing broken-image placeholders.
const BLANK_TILE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

const RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

function asRiskLevel(risk?: string): RiskLevel | null {
  const r = (risk ?? '').toUpperCase() as RiskLevel
  return RISK_LEVELS.includes(r) ? r : null
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

function FitBounds({ geojson, points }: { geojson: GeoJSON.FeatureCollection | null; points: [number, number][] }) {
  const map = useMap()
  const key = JSON.stringify(points)
  useEffect(() => {
    const bounds = L.latLngBounds([])
    if (geojson && geojson.features.length) bounds.extend(L.geoJSON(geojson).getBounds())
    points.forEach((p) => bounds.extend(p))
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geojson, key, map])
  return null
}

function RouteStyler({ geojson }: { geojson: GeoJSON.FeatureCollection }) {
  const geoJsonRef = useRef<L.GeoJSON | null>(null)

  const styleCallback = (feature?: GeoJSON.Feature): L.PathOptions => {
    const routeId = feature?.properties?.route_id ?? ''
    const idx = geojson.features.findIndex((f) => f.properties?.route_id === routeId)
    return { color: ROUTE_COLORS[(idx >= 0 ? idx : 0) % ROUTE_COLORS.length], weight: 4, opacity: 0.85 }
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

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: fetchWarehouses,
    staleTime: 60_000,
  })

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: fetchStores,
    staleTime: 60_000,
  })

  const [selectedTruck, setSelectedTruck] = useState<string | null>(null)

  const fitPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = []
    ;(trucks ?? []).forEach((t) => {
      if (t.lat != null && t.lon != null) pts.push([t.lat, t.lon])
    })
    warehouses.forEach((w) => pts.push([w.latitude, w.longitude]))
    stores.forEach((s) => pts.push([s.latitude, s.longitude]))
    return pts
  }, [trucks, warehouses, stores])

  const atRisk = (trucks ?? []).filter((t) => ['HIGH', 'CRITICAL'].includes((t.risk ?? '').toUpperCase()))

  return (
    <div className="col-span-4 tablet:col-span-8 desktop:col-span-12 flex flex-col gap-4">
      <Box
        title="Routes and trucks"
        tone="sky"
        meta={
          <>
            <span className="tabular-nums tablet:hidden">{trucks?.length ?? 0} trucks</span>
            <span className="hidden tabular-nums tablet:inline">
              {trucks?.length ?? 0} trucks · {warehouses.length} warehouses · {stores.length} stores
            </span>
            {atRisk.length > 0 && (
              <span className="whitespace-nowrap rounded-md border-2 border-on-fill bg-fill-coral px-1.5 py-px text-on-fill">
                {atRisk.length} at risk
              </span>
            )}
          </>
        }
        bodyClassName="flex flex-col"
      >
        <div className="relative isolate h-[440px] tablet:h-[560px]">
          {geoLoading && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-base/80">
              <span className="tt-caps text-text-secondary">Loading map data</span>
            </div>
          )}
          <MapContainer
            center={QATAR_CENTER}
            zoom={QATAR_ZOOM}
            className="h-full w-full bg-base"
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              errorTileUrl={BLANK_TILE}
            />

            <FitBounds geojson={geojson ?? null} points={fitPoints} />
            {geojson && <RouteStyler geojson={geojson} />}

            {warehouses.map((wh) => (
              <Marker key={wh.id} position={[wh.latitude, wh.longitude]} icon={warehouseMarkerIcon(wh.id)}>
                <Popup>
                  <div className="min-w-[140px]">
                    <div className="font-mono text-[13px] font-bold text-text-primary">{wh.id}</div>
                    <div className="text-[13px] text-text-primary">{wh.name}</div>
                    {wh.availableCapacityKg != null && (
                      <div className="mt-1 font-mono text-[11px] text-text-secondary">Available: {wh.availableCapacityKg} kg</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {stores.map((s) => (
              <Marker key={s.id} position={[s.latitude, s.longitude]} icon={storeMarkerIcon('S')}>
                <Popup>
                  <div className="min-w-[120px]">
                    <div className="font-mono text-[13px] font-bold text-text-primary">{s.id}</div>
                    <div className="text-[13px] text-text-primary">{s.name}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {trucks?.map((t) =>
              t.lat != null && t.lon != null ? (
                <Marker
                  key={t.truckId}
                  position={[t.lat, t.lon]}
                  icon={truckMarkerIcon(t.truckId, t.risk, { selected: selectedTruck === t.truckId })}
                  zIndexOffset={selectedTruck === t.truckId ? 1000 : 500}
                  eventHandlers={{ click: () => setSelectedTruck(t.truckId) }}
                >
                  <Popup>
                    <div className="min-w-[150px]">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <strong className="text-[13px] text-text-primary">{t.name || t.truckId}</strong>
                        {(() => {
                          const level = asRiskLevel(t.risk)
                          return level ? <RiskBadge level={level} /> : null
                        })()}
                      </div>
                      {t.temperatureC != null && (
                        <div className="font-mono text-[12px] text-text-primary">{t.temperatureC.toFixed(1)} °C</div>
                      )}
                      {t.speedKmh != null && (
                        <div className="font-mono text-[11px] text-text-secondary">{t.speedKmh.toFixed(0)} km/h</div>
                      )}
                      {t.product && <div className="text-[12px] text-text-secondary">{t.product}</div>}
                    </div>
                  </Popup>
                </Marker>
              ) : null,
            )}
          </MapContainer>
        </div>
        <MapLegend>
          <span className="h-4 w-[2px] bg-border" aria-hidden />
          <span className="text-text-secondary">Routes</span>
          {ROUTE_COLORS.map((c, i) => (
            <span key={c} className="flex items-center gap-1.5">
              <span className="inline-block h-[5px] w-5 rounded-full" style={{ background: c }} aria-hidden />
              R{i + 1}
            </span>
          ))}
        </MapLegend>
      </Box>

      {trucks && trucks.length > 0 && (
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
          {trucks.map((t) => {
            const level = asRiskLevel(t.risk)
            const selected = selectedTruck === t.truckId
            return (
              <button
                key={t.truckId}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedTruck(selected ? null : t.truckId)}
                className="tt-box tt-box-sm flex flex-col text-left outline-none transition-transform hover:-translate-x-px hover:-translate-y-px focus-visible:shadow-focus-halo"
              >
                <span className={`tt-hd w-full px-3 py-2 ${selected ? 'tt-tone-sky' : 'tt-tone-paper'}`}>
                  <span className="truncate">{t.name || t.truckId}</span>
                  {level ? (
                    <RiskBadge level={level} />
                  ) : (
                    <span className="tt-caps text-text-secondary">{(t.risk ?? 'unknown').toUpperCase()}</span>
                  )}
                </span>
                <span className="flex w-full flex-wrap gap-x-4 gap-y-1 px-3 py-2.5 font-mono text-[13px] text-text-primary">
                  <span className="font-bold">{t.truckId}</span>
                  {t.temperatureC != null && <span>{t.temperatureC.toFixed(1)} °C</span>}
                  {t.speedKmh != null && <span className="text-text-secondary">{t.speedKmh.toFixed(0)} km/h</span>}
                  {t.product && <span className="truncate font-sans text-text-secondary">{t.product}</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
