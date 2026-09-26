import { useEffect, useRef, useState } from 'react'
import ProvenanceTag from './ProvenanceTag'
import { decision, temperatureTrace, truck } from '@/content/demo'
import { useLive } from '@/live/LiveProvider'
import { sample } from '@/live/sample'

// Hero visual. With the backend up it plots the focus truck's stored readings
// from the last few minutes and the optimizer's decision. Offline it loops the
// scripted T102 failure; the readout then only ever shows a scripted reading,
// never an interpolated one; the curve between points is decoration.

const W = 420
const H = 210
const PAD = { l: 34, r: 14, t: 14, b: 22 }
const DRAW_MS = 5200
const HOLD_MS = 2600
const LIVE_POINTS = 60

// Smooth curve through the points (Catmull-Rom → cubic Bézier).
function curve(points: [number, number][]) {
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`
  }
  return d
}

export default function ThermalTraceCard() {
  const { status, focus } = useLive()
  const live = status === 'live' && focus !== null && focus.temps.length >= 2

  const series = live ? sample(focus.temps, LIVE_POINTS) : [...temperatureTrace]
  const safeMax = live ? focus.safeMaxC : truck.safeBandC[1]
  const yMax = Math.max(8, Math.ceil((Math.max(...series) + 2) / 4) * 4)
  const x = (i: number) => PAD.l + (i / (series.length - 1)) * (W - PAD.l - PAD.r)
  const y = (c: number) => PAD.t + (1 - Math.max(0, c) / yMax) * (H - PAD.t - PAD.b)
  const points = series.map((c, i) => [x(i), y(c)] as [number, number])
  const path = curve(points)
  const limitY = y(safeMax)
  const limitStop = (limitY - PAD.t) / (H - PAD.t - PAD.b)

  const lineRef = useRef<SVGPathElement>(null)
  const areaRef = useRef<SVGRectElement>(null)
  const dotRef = useRef<SVGGElement>(null)
  const drawnLive = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  // The scripted loop runs every frame, so it only runs while the card is on
  // screen; scrolled away, it would keep the main thread busy under the video.
  const [onScreen, setOnScreen] = useState(true)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const line = lineRef.current
    const dot = dotRef.current
    const area = areaRef.current
    if (!line || !dot || !area) return
    const total = line.getTotalLength()
    line.style.strokeDasharray = `${total}`

    const paint = (p: number) => {
      line.style.strokeDashoffset = `${total * (1 - p)}`
      const pt = line.getPointAtLength(total * p)
      dot.setAttribute('transform', `translate(${pt.x},${pt.y})`)
      area.setAttribute('width', `${Math.max(0, pt.x - PAD.l)}`)
      if (!live) {
        // Last scripted reading the line has passed.
        setIndex(points.reduce((acc, [px], i) => (pt.x >= px - 0.5 ? i : acc), 0))
      }
      setDone(p >= 1)
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Live data draws in once, then each poll just repaints in place.
    if (reduced || (live && drawnLive.current)) {
      paint(1)
      return
    }

    let raf = 0
    let start = performance.now()
    const tick = (now: number) => {
      if (!live && now - start > DRAW_MS + HOLD_MS) start = now
      const p = Math.min(1, (now - start) / DRAW_MS)
      paint(1 - Math.pow(1 - p, 1.6))
      if (live && p >= 1) {
        drawnLive.current = true
        return
      }
      raf = requestAnimationFrame(tick)
    }
    if (!onScreen) return
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // `path` captures every input that changes the drawing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, live, onScreen])

  const reading = live ? (focus.latestC ?? series.at(-1)!) : series[index]
  const breached = reading > safeMax
  const action = live ? focus.action : decision.action
  const target = live ? focus.targetId : decision.target
  const truckId = live ? focus.truckId : truck.id
  const massKg = live ? focus.quantityKg : truck.massKg
  const cargo = live ? focus.product : truck.cargo

  return (
    <div ref={rootRef} className="float-slow relative w-full rounded-lg border border-border/70 bg-surface/90 p-5 shadow-[0_30px_80px_-30px_rgba(0,200,224,0.35)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-xs tracking-[0.1em] text-text-secondary uppercase">
            Thermal trace
            {live && (
              <span className="inline-flex items-center gap-1.5 text-risk-critical">
                <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-risk-critical" />
                Live
              </span>
            )}
          </p>
          <p className="mt-1 font-mono text-lg text-white">
            {truckId}{' '}
            <span className="text-sm text-text-secondary">
              · {massKg} kg {cargo.toLowerCase()}
            </span>
          </p>
        </div>
        {/* Live: the connected fleet is the test simulator, so its readings are
            synthetic, never measured. Offline: the worked T102 example. */}
        <ProvenanceTag tag={live ? 'SYNTHETIC' : 'EXAMPLE'} />
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <p
          className="font-mono text-5xl font-medium tracking-tight transition-colors duration-500 sm:text-6xl"
          style={{ color: breached ? 'var(--color-risk-critical)' : 'var(--color-risk-low)' }}
        >
          {reading.toFixed(1)}
          <span className="ml-1 text-2xl text-text-secondary">°C</span>
        </p>
        <span
          className={`mb-2 inline-flex items-center gap-2 rounded-sm border px-2 py-1 font-mono text-[11px] tracking-[0.08em] transition-colors duration-500 ${
            breached ? 'border-risk-critical/50 text-risk-critical' : 'border-risk-low/40 text-risk-low'
          }`}
        >
          <span aria-hidden className={`size-1.5 rounded-full ${breached ? 'pulse-dot bg-risk-critical' : 'bg-risk-low'}`} />
          {breached ? `ABOVE ${safeMax} °C` : 'IN SAFE BAND'}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full overflow-visible"
        role="img"
        aria-label={`Cargo temperature for ${truckId}, from ${series[0].toFixed(1)} to ${series.at(-1)!.toFixed(1)} °C`}
      >
        <defs>
          {/* Hard colour stop at the safe limit: teal below, red above. */}
          <linearGradient id="tt-stroke" gradientUnits="userSpaceOnUse" x1="0" y1={PAD.t} x2="0" y2={H - PAD.b}>
            <stop offset={limitStop} stopColor="var(--color-risk-critical)" />
            <stop offset={limitStop} stopColor="var(--color-risk-low)" />
          </linearGradient>
          <linearGradient id="tt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-primary)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="tt-reveal">
            <rect ref={areaRef} x={PAD.l} y="0" width="0" height={H} />
          </clipPath>
        </defs>

        {/* Safe band 0 – limit */}
        <rect x={PAD.l} y={limitY} width={W - PAD.l - PAD.r} height={y(0) - limitY} fill="var(--color-risk-low)" opacity="0.07" />
        {[0, safeMax, yMax].map((c) => (
          <g key={c}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(c)}
              y2={y(c)}
              stroke={c === safeMax ? 'var(--color-risk-critical)' : 'var(--color-border)'}
              strokeDasharray={c === safeMax ? '4 4' : undefined}
              opacity="0.6"
            />
            <text x={PAD.l - 8} y={y(c) + 4} textAnchor="end" className="fill-text-secondary font-mono text-[10px]">
              {c}°
            </text>
          </g>
        ))}
        <text x={W - PAD.r} y={limitY - 6} textAnchor="end" className="fill-risk-critical font-mono text-[10px]">
          safe limit
        </text>

        <path d={`${path} L${x(series.length - 1)},${y(0)} L${PAD.l},${y(0)} Z`} fill="url(#tt-fill)" clipPath="url(#tt-reveal)" />
        <path ref={lineRef} d={path} fill="none" stroke="url(#tt-stroke)" strokeWidth="2.5" strokeLinecap="round" />

        {!live &&
          points.map(([px, py], i) => (
            <circle
              key={i}
              cx={px}
              cy={py}
              r="3"
              fill="var(--color-base)"
              stroke={series[i] > safeMax ? 'var(--color-risk-critical)' : 'var(--color-risk-low)'}
              strokeWidth="1.5"
              opacity={i <= index ? 1 : 0}
              style={{ transition: 'opacity 0.3s' }}
            />
          ))}

        <g ref={dotRef}>
          <circle r="10" fill={breached ? 'var(--color-risk-critical)' : 'var(--color-primary)'} opacity="0.2" className="pulse-ring" />
          <circle r="4.5" fill={breached ? 'var(--color-risk-critical)' : 'var(--color-primary)'} />
        </g>
      </svg>
      <p className="mt-1 font-mono text-[10px] tracking-[0.06em] text-text-secondary uppercase">
        {live ? 'Stored readings · last 10 min · from the command center' : 'Example · refrigeration failure'}
      </p>

      {action && target && (
        <div
          className={`mt-4 flex items-center justify-between gap-3 rounded-sm border px-3 py-2.5 transition-all duration-500 ${
            done ? 'translate-y-0 border-primary/60 bg-primary/10 opacity-100' : 'translate-y-2 border-border/60 opacity-0'
          }`}
        >
          <span className="flex items-center gap-2 font-mono text-xs tracking-[0.08em] text-text-secondary uppercase">
            Decision {live && <ProvenanceTag tag="OPTIMIZED" />}
          </span>
          <span className="font-mono text-sm text-primary">
            {action} → {target}
          </span>
        </div>
      )}
    </div>
  )
}
