import { useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import {
  ActionChip,
  AXIS_LINE,
  AXIS_STYLE,
  Box,
  Breakdown,
  Button,
  Card,
  CHART_COLORS,
  CrosshairTooltip,
  FilterChip,
  FilterGroup,
  FilterPanel,
  InfoTip,
  Input,
  KpiCard,
  LiveBadge,
  Modal,
  Ontology,
  ProvenanceBadge,
  ScenarioPicker,
  SegmentedControl,
  Select,
  StatusChip,
  Stepper,
  Steps,
  TelemetryValueCard,
  TypedText,
  type BoxTone,
  type KpiTone,
  type ProvenanceKind,
  type StatusTier,
} from '@/design'
import type { ScenarioId } from '@/api/types'
import { clsx, FOCUS_RING } from '@/design/clsx'
import { useTheme } from '@/hooks/useTheme'
import DataLayerDebug from './DataLayerDebug'

// Dev-only design reference. Every value on this page is a static sample.

const STATUS_TIERS: StatusTier[] = ['safe', 'warning', 'critical', 'offline']
const PROVENANCE_KINDS: ProvenanceKind[] = ['measured', 'calculated', 'predicted', 'recommended', 'finance']
const ACTIONS = ['CONTINUE', 'TRANSFER', 'DISCOUNT', 'PRIORITIZE_SALE', 'REDISTRIBUTE', 'QUARANTINE'] as const
const SAMPLE_TREND = [4.1, 4.3, 4.0, 4.6, 5.1, 4.9, 5.4, 5.2, 5.8]

const ROLES: Array<{ fill: string; name: string; role: string }> = [
  { fill: 'bg-fill-maroon', name: 'Maroon', role: 'Brand accent: primary button, title highlight' },
  { fill: 'bg-fill-sky', name: 'Sky', role: 'Measured data, the map, selected state' },
  { fill: 'bg-fill-lime', name: 'Lime', role: 'Safe, done, result rows, act now' },
  { fill: 'bg-fill-lilac', name: 'Lilac', role: 'AI-explained and predicted' },
  { fill: 'bg-fill-coral', name: 'Coral', role: 'HIGH risk and loss' },
  { fill: 'bg-fill-critical', name: 'Critical', role: 'CRITICAL risk' },
  { fill: 'bg-fill-sun', name: 'Sun', role: 'MEDIUM risk and finance only. Use rarely.' },
]

const BOX_TONES: Array<{ tone: BoxTone; use: string }> = [
  { tone: 'paper', use: 'default section' },
  { tone: 'sky', use: 'measured inputs' },
  { tone: 'lime', use: 'recommended result' },
  { tone: 'lilac', use: 'predicted, AI' },
  { tone: 'coral', use: 'loss, high risk' },
  { tone: 'critical', use: 'critical incident' },
  { tone: 'ink', use: 'console, result' },
  { tone: 'maroon', use: 'brand, rare' },
  { tone: 'sun', use: 'finance only' },
]

const KPI_TONES: Array<{ tone: KpiTone; label: string; value: string; unit: string; provenance: ProvenanceKind }> = [
  { tone: 'paper', label: 'Transported', value: '3,200', unit: 'kg', provenance: 'calculated' },
  { tone: 'sky', label: 'Cargo temp', value: '3.8', unit: '°C', provenance: 'measured' },
  { tone: 'lilac', label: 'Spoilage', value: '12.4', unit: '%', provenance: 'predicted' },
  { tone: 'lime', label: 'Saved', value: '428', unit: 'kg', provenance: 'recommended' },
  { tone: 'coral', label: 'Lost', value: '91', unit: 'kg', provenance: 'calculated' },
  { tone: 'sun', label: 'Loss prevented', value: '4,548', unit: 'QAR', provenance: 'finance' },
]

const SAMPLE_BARS = [
  { label: 'T101', value: 12, fill: 'var(--color-fill-lime)' },
  { label: 'T102', value: 61, fill: 'var(--color-fill-coral)' },
  { label: 'T103', value: 27, fill: 'var(--color-fill-sun)' },
  { label: 'T104', value: 8, fill: 'var(--color-fill-lime)' },
]

const LAYLA_SAMPLE =
  'Cargo on T102 has spent 38 minutes above the 4°C limit. The engine ranks a transfer to WH01 first because it is the only feasible store within the remaining safe time.'

const FULL = 'col-span-4 tablet:col-span-8 desktop:col-span-12'
const HALF = 'col-span-4 tablet:col-span-8 desktop:col-span-6'

function Label({ children }: { children: ReactNode }) {
  return <span className="tt-caps mb-2 block text-text-secondary">{children}</span>
}

export default function StyleGuideScreen() {
  const { theme, toggleTheme } = useTheme()
  const [range, setRange] = useState<'today' | 'day' | 'week'>('day')
  const [modalOpen, setModalOpen] = useState(false)
  const [chips, setChips] = useState(['Warehouse: WH01', 'Product: Fresh Chicken'])
  const [scenario, setScenario] = useState<ScenarioId>('REFRIGERATION_FAILURE')
  const [speed, setSpeed] = useState(10)
  const [typedKey, setTypedKey] = useState(0)

  return (
    <>
      {/* Intro */}
      <Box
        title="Design reference"
        tone="ink"
        meta={<span className="tt-chip">dev only</span>}
        className={FULL}
        bodyClassName="flex flex-wrap items-center justify-between gap-3 p-4"
      >
        <p className="max-w-2xl text-body-md">
          The QAI primitives in <span className="font-mono text-[13px] font-bold">frontend/src/design</span>. Sand
          canvas, paper boxes, 3px ink frame, hard shadow. Check every change in both themes.
        </p>
        <Button variant="secondary" onClick={toggleTheme}>
          Switch to {theme === 'dark' ? 'light' : 'dark'}
        </Button>
      </Box>

      {/* Colour roles */}
      <Box title="Colour roles" meta="7 fills · gold is rare" className={FULL}>
        <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4">
          {ROLES.map((r) => (
            <div key={r.name} className="flex items-center gap-3 border-b-2 border-line p-3 tablet:border-r-2">
              <span className={clsx('h-10 w-10 shrink-0 rounded-md border-[3px] border-ink shadow-level1', r.fill)} aria-hidden />
              <span className="min-w-0">
                <b className="block text-body-md">{r.name}</b>
                <span className="block text-body-sm text-text-secondary">{r.role}</span>
              </span>
            </div>
          ))}
        </div>
      </Box>

      {/* Box tones */}
      <Box title="Box header tones" meta="<Box tone>" className={FULL} bodyClassName="p-4">
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 desktop:grid-cols-3">
          {BOX_TONES.map((b) => (
            <Box key={b.tone} title={b.tone} tone={b.tone} meta={b.use} small bodyClassName="p-3">
              <p className="text-body-sm text-text-secondary">Body sits on paper. Meta is mono caps.</p>
            </Box>
          ))}
        </div>
      </Box>

      {/* KPI tiles */}
      <Box title="Stat tiles" meta="<KpiCard tone> · max one gold" className={FULL} bodyClassName="p-4">
        <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-6">
          {KPI_TONES.map((k) => (
            <KpiCard key={k.tone} label={k.label} value={k.value} unit={k.unit} provenance={k.provenance} tone={k.tone} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 tablet:grid-cols-2">
          <KpiCard label="With trend" value="5.8" unit="°C" provenance="measured" tone="sky" trend={SAMPLE_TREND} trendTier="warning" />
          <TelemetryValueCard
            zoneId="REEFER-QA-084"
            provenance="measured"
            value="-18.4°C"
            trend={SAMPLE_TREND}
            trendTier="warning"
            safeWindowLabel="-22°C to -16°C"
            qarAtRisk="QAR 4,200 at risk"
          />
        </div>
      </Box>

      {/* Buttons */}
      <Box title="Buttons" meta="press: shadow collapses" className={HALF} bodyClassName="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Emergency stop</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div>
          <Label>Press group (selected is sky)</Label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 5, 10, 30, 60].map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === speed}
                onClick={() => setSpeed(s)}
                className={clsx(
                  FOCUS_RING,
                  'tt-press min-h-9 font-mono text-[13px] font-bold',
                  s === speed ? 'bg-fill-sky text-on-fill' : 'bg-surface text-text-primary',
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Segmented control</Label>
          <SegmentedControl
            value={range}
            onChange={setRange}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
            ]}
          />
        </div>
      </Box>

      {/* Chips */}
      <Box title="Chips" meta="2px border · mono caps" className={HALF} bodyClassName="flex flex-col gap-4 p-4">
        <div>
          <Label>Status</Label>
          <div className="flex flex-wrap gap-2">
            {STATUS_TIERS.map((tier) => (
              <StatusChip key={tier} tier={tier} />
            ))}
          </div>
        </div>
        <div>
          <Label>Provenance (full, then compact dot)</Label>
          <div className="flex flex-wrap items-center gap-2">
            {PROVENANCE_KINDS.map((kind) => (
              <ProvenanceBadge key={kind} kind={kind} />
            ))}
            {PROVENANCE_KINDS.map((kind) => (
              <ProvenanceBadge key={`${kind}-c`} kind={kind} compact />
            ))}
          </div>
        </div>
        <div>
          <Label>Actions</Label>
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((action) => (
              <ActionChip key={action} action={action} />
            ))}
          </div>
        </div>
        <div>
          <Label>Live, tag, filter</Label>
          <div className="flex flex-wrap items-center gap-2">
            <LiveBadge live />
            <LiveBadge live={false} />
            <span className="tt-chip">
              <span className="tt-live-dot" aria-hidden /> Layla
            </span>
            {chips.map((chip) => (
              <FilterChip key={chip} label={chip} onRemove={() => setChips((c) => c.filter((x) => x !== chip))} />
            ))}
          </div>
        </div>
      </Box>

      {/* Steps */}
      <Box title="Steps" meta="idle · running · done" className={HALF} bodyClassName="p-4">
        <Steps
          items={[
            { label: 'Sensor data', detail: 'MQTT ingest', state: 'done', tag: '500 samples' },
            { label: 'Thermal exposure', detail: 'degrees above safe max, over time', state: 'done', tag: '38.2 °C·min' },
            {
              label: 'Spoilage prediction',
              detail: 'exposure-response prior',
              state: 'run',
              children: <pre className="tt-pre">{'{ "spoilageProbability": 0.124 }'}</pre>,
            },
            { label: 'Decision', detail: 'feasible options ranked', state: 'idle' },
          ]}
        />
      </Box>

      {/* Ontology + TypedText */}
      <div className={clsx(HALF, 'flex flex-col gap-4')}>
        <Box title="Ontology" meta="how the answer is built">
          <Ontology
            entities={[
              { type: 'Truck', value: 'T102', tone: 'sky' },
              { type: 'Cargo', value: 'Fresh chicken' },
              { type: 'Condition', value: 'Excursion', tone: 'coral' },
              { type: 'Decision', value: 'Transfer WH01', tone: 'lime' },
            ]}
            relations={['carries', 'is in', 'triggers']}
          />
        </Box>
        <Box
          title="Layla explains"
          tone="lilac"
          meta={
            <>
              <ProvenanceBadge kind="predicted" compact /> AI-explained
            </>
          }
          bodyClassName="p-4"
        >
          <p className="min-h-[4.5em] text-body-md" key={typedKey}>
            <TypedText text={LAYLA_SAMPLE} />
          </p>
          <Button variant="secondary" className="mt-3" onClick={() => setTypedKey((k) => k + 1)}>
            Replay
          </Button>
        </Box>
      </div>

      {/* Breakdown + table */}
      <Box title="Breakdown" tone="lime" meta="lime total row" className={HALF}>
        <Breakdown
          rows={[
            { code: 'TC', label: 'Transport cost', value: 'QAR 35.34' },
            { code: 'FL', label: 'Food-loss cost', value: 'QAR 157.68', sign: '+ ' },
            { code: 'DC', label: 'Delay cost', value: 'QAR 26.03', sign: '+ ', note: <ProvenanceBadge kind="calculated" compact /> },
          ]}
          total={{ code: 'J', label: 'Objective (min)', value: '219.04' }}
        />
      </Box>

      <Box title="Table" meta="ink header · scrolls inside box" className={HALF}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-body-md">
            <thead className="tt-thead">
              <tr>
                <th>Store</th>
                <th className="text-right">ETA</th>
                <th className="text-right">Exp. loss</th>
                <th>Feasible</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b-2 border-line bg-fill-lime font-bold text-on-fill">
                <td className="px-3 py-2 font-mono">WH01</td>
                <td className="px-3 py-2 text-right font-mono">13 min</td>
                <td className="px-3 py-2 text-right font-mono">1.1%</td>
                <td className="px-3 py-2">
                  <StatusChip tier="safe" label="Recommended" />
                </td>
              </tr>
              <tr className="border-b-2 border-line hover:bg-elevated">
                <td className="px-3 py-2 font-mono">WH02</td>
                <td className="px-3 py-2 text-right font-mono">21 min</td>
                <td className="px-3 py-2 text-right font-mono">1.8%</td>
                <td className="px-3 py-2">
                  <StatusChip tier="safe" label="Feasible" />
                </td>
              </tr>
              <tr className="hover:bg-elevated">
                <td className="px-3 py-2 font-mono">WH03</td>
                <td className="px-3 py-2 text-right font-mono">44.9 min</td>
                <td className="px-3 py-2 text-right font-mono">3.7%</td>
                <td className="px-3 py-2">
                  <StatusChip tier="critical" label="Not feasible" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Box>

      {/* Chart */}
      <Box title="Bar chart" meta="2px ink axes · ink outline" className={HALF} bodyClassName="p-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={SAMPLE_BARS} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false} unit="%" width={40} />
            <CrosshairTooltip cursor={{ fill: 'var(--color-elevated)' }} formatter={(v) => [`${v}%`, 'Spoilage']} />
            <Bar dataKey="value" stroke={CHART_COLORS.ink} strokeWidth={2} radius={[4, 4, 0, 0]} animationDuration={700}>
              {SAMPLE_BARS.map((b) => (
                <Cell key={b.label} fill={b.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Typography */}
      <Box title="Type" meta="DM Sans · JetBrains Mono" className={HALF} bodyClassName="flex flex-col gap-1.5 p-4">
        <p className="tt-title text-headline-xl">
          Run a <em>scenario</em>
        </p>
        <p className="text-headline-lg">Headline LG</p>
        <p className="text-headline-md">Headline MD</p>
        <p className="text-headline-sm">Headline SM</p>
        <p className="text-body-md">Body MD: short and plain sentences.</p>
        <p className="text-body-sm text-text-secondary">Body SM secondary</p>
        <p className="font-mono text-telemetry-xl tabular-nums">-18.4°C</p>
        <p className="font-mono text-telemetry-md tabular-nums">QAR 9,800.00</p>
        <p className="tt-caps">Mono caps label</p>
      </Box>

      {/* Forms */}
      <Box title="Inputs" meta="3px ink frame" className={HALF} bodyClassName="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-3">
          <Input placeholder="4.0" unit="°C" className="w-40" />
          <Select
            className="w-56"
            options={[
              { value: 'wh01', label: 'WH01 · Doha North' },
              { value: 'wh02', label: 'WH02 · Al Wakrah' },
            ]}
          />
        </div>
        <div>
          <Label>Scenario picker</Label>
          <ScenarioPicker value={scenario} onChange={setScenario} />
        </div>
      </Box>

      <Box title="Panels" meta="filter · stepper · modal" className={HALF} bodyClassName="flex flex-col gap-4 p-4">
        <FilterPanel>
          <FilterGroup title="Warehouse">
            <label className="flex items-center gap-2 text-body-sm">
              <input type="checkbox" defaultChecked /> WH01 · Doha North
            </label>
            <label className="flex items-center gap-2 text-body-sm">
              <input type="checkbox" /> WH02 · Al Wakrah
            </label>
          </FilterGroup>
        </FilterPanel>
        <Card className="p-4">
          <Label>Stepper</Label>
          <Stepper originLabel="T102" destinationLabel="WH01" etaMinutes={18} />
        </Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
          <span className="inline-flex items-center gap-2 text-body-sm">
            Info tip
            <InfoTip title="Info tip">Hover or focus to read what a value means and where it comes from.</InfoTip>
          </span>
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Critical incident">
          <p className="text-body-md text-navy">Truck T102: temperature 7.4°C, safe threshold 4°C.</p>
        </Modal>
      </Box>

      <Box title="Data layer" meta="hook smoke test" className={FULL}>
        <DataLayerDebug />
      </Box>
    </>
  )
}
