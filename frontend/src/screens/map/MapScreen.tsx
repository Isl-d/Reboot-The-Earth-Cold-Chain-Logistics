import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useQuery } from '@tanstack/react-query'
import { fetchRoutesGeoJson, fetchAllTruckPositions } from '@/api/fetchers'
import { Card } from '@/design'

const QATAR_CENTER: [number, number] = [25.28, 51.18]
const QATAR_ZOOM = 9

const ROUTE_COLORS = ['#0EA5E9', '#06B6D4', '#7C3AED', '#F59E0B', '#EF4444', '#10B981']

function truckIcon(riskColor: string) {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${riskColor};border:3px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-size:12px;color:#fff;font-weight:700;
    ">T</div>`,
  })
}

function warehouseIcon() {
  return L.divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div style="
      width:24px;height:24px;border-radius:4px;
      background:#0F172A;border:2px solid #fff;
      box-shadow:0 2px 4px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      font-size:10px;color:#fff;font-weight:700;
    ">W</div>`,
  })
}

function storeIcon() {
  return L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:#059669;border:2px solid #fff;
      box-shadow:0 2px 4px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      font-size:9px;color:#fff;font-weight:700;
    ">S</div>`,
  })
}

function riskToColor(risk?: string): string {
  switch (risk) {
    case 'critical': return '#EF4444'
    case 'high': return '#F59E0B'
    case 'medium': return '#F59E0B'
    case 'low': return '#10B981'
    default: return '#0EA5E9'
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
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg text-navy">Fleet Map</h1>
        <div className="flex items-center gap-4 text-body-sm text-muted">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-sky" /> Routes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#10B981' }} /> Safe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#F59E0B' }} /> Warning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#EF4444' }} /> Critical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded bg-navy" style={{ width: 12, height: 12 }} /> Warehouse
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#059669' }} /> Store
          </span>
        </div>
      </div>

      <Card className="relative flex-1 overflow-hidden">
        {geoLoading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/80">
            <span className="text-body-md text-muted">Loading map data...</span>
          </div>
        )}
        <MapContainer
          center={QATAR_CENTER}
          zoom={QATAR_ZOOM}
          className="h-full w-full"
          style={{ minHeight: 500, borderRadius: '0.5rem' }}
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
              className={`cursor-pointer p-3 transition-shadow hover:shadow-level1 ${
                selectedTruck === t.truckId ? 'ring-2 ring-sky' : ''
              }`}
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
