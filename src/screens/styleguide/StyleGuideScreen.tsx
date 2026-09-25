import { useState, type ReactNode } from 'react'
import {
  ActionChip,
  Button,
  Card,
  FilterChip,
  FilterGroup,
  FilterPanel,
  Input,
  KpiCard,
  LiveBadge,
  Modal,
  ProvenanceBadge,
  Select,
  SegmentedControl,
  StatusChip,
  Stepper,
  Table,
  Td,
  Th,
  Thead,
  TelemetryValueCard,
  Tr,
  type ProvenanceKind,
  type StatusTier,
} from '@/design'
import DataLayerDebug from './DataLayerDebug'

const STATUS_TIERS: StatusTier[] = ['safe', 'warning', 'critical', 'offline']
const PROVENANCE_KINDS: ProvenanceKind[] = ['measured', 'calculated', 'predicted', 'recommended', 'finance']
const ACTIONS = ['CONTINUE', 'TRANSFER', 'DISCOUNT', 'PRIORITIZE_SALE', 'REDISTRIBUTE', 'QUARANTINE'] as const

const SAMPLE_TREND = [4.1, 4.3, 4.0, 4.6, 5.1, 4.9, 5.4, 5.2, 5.8]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-headline-sm text-navy">{title}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  )
}

export default function StyleGuideScreen() {
  const [range, setRange] = useState<'today' | 'day' | 'week'>('day')
  const [modalOpen, setModalOpen] = useState(false)
  const [chips, setChips] = useState(['Warehouse: WH01', 'Product: Fresh Chicken'])

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-1 text-headline-xl text-navy">Style Guide</h1>
      <p className="mb-8 text-body-md text-muted">
        Every primitive and variant, built strictly from docs/DESIGN.md. Dev-only route.
      </p>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          <p className="text-headline-xl">Headline XL</p>
          <p className="text-headline-lg">Headline LG</p>
          <p className="text-headline-md">Headline MD</p>
          <p className="text-headline-sm">Headline SM</p>
          <p className="text-body-lg">Body LG</p>
          <p className="text-body-md">Body MD</p>
          <p className="text-body-sm">Body SM</p>
          <p className="font-mono text-telemetry-xl tabular-nums">-18.4°C</p>
          <p className="font-mono text-telemetry-md tabular-nums">QAR 9,800.00</p>
          <p className="font-mono text-label-code uppercase">REEFER-QA-084</p>
          <p className="text-label-ui uppercase">Label UI</p>
        </div>
      </Section>

      <Section title="Buttons">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Emergency Stop</Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
      </Section>

      <Section title="Status chips">
        {STATUS_TIERS.map((tier) => (
          <StatusChip key={tier} tier={tier} />
        ))}
      </Section>

      <Section title="Provenance badges">
        {PROVENANCE_KINDS.map((kind) => (
          <ProvenanceBadge key={kind} kind={kind} />
        ))}
      </Section>

      <Section title="Action chips">
        {ACTIONS.map((action) => (
          <ActionChip key={action} action={action} />
        ))}
      </Section>

      <Section title="Cards">
        <Card className="w-64 p-4">
          <p className="text-body-md text-navy">Plain card</p>
          <p className="text-body-sm text-muted">Hover to see Level 1 elevation.</p>
        </Card>
      </Section>

      <Section title="KPI card">
        <div className="w-64">
          <KpiCard
            label="Food saved"
            value="428"
            unit="kg"
            provenance="finance"
            trend={SAMPLE_TREND}
            trendTier="safe"
          />
        </div>
      </Section>

      <Section title="Telemetry value card">
        <div className="w-72">
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
      </Section>

      <Section title="Data table">
        <Table>
          <Thead>
            <tr>
              <Th>Batch</Th>
              <Th>Product</Th>
              <Th className="text-right">Quantity</Th>
            </tr>
          </Thead>
          <tbody>
            <Tr statusTier="critical">
              <Td>CHK-1029</Td>
              <Td>Fresh Chicken</Td>
              <Td numeric>500 kg</Td>
            </Tr>
            <Tr statusTier="safe">
              <Td>BEF-2031</Td>
              <Td>Fresh Beef</Td>
              <Td numeric>320 kg</Td>
            </Tr>
          </tbody>
        </Table>
      </Section>

      <Section title="Inputs">
        <Input placeholder="4.0" unit="°C" className="w-40" />
        <Select
          className="w-48"
          options={[
            { value: 'wh01', label: 'WH01 — Doha North' },
            { value: 'wh02', label: 'WH02 — Al Wakrah' },
          ]}
        />
      </Section>

      <Section title="Segmented control + live badge">
        <SegmentedControl
          value={range}
          onChange={setRange}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
          ]}
        />
        <LiveBadge live />
        <LiveBadge live={false} />
      </Section>

      <Section title="Filter panel">
        <FilterPanel className="w-72">
          <FilterGroup title="Warehouse">
            <label className="flex items-center gap-2 text-body-sm">
              <input type="checkbox" defaultChecked /> WH01 — Doha North
            </label>
            <label className="flex items-center gap-2 text-body-sm">
              <input type="checkbox" /> WH02 — Al Wakrah
            </label>
          </FilterGroup>
          <FilterGroup title="Risk">
            <label className="flex items-center gap-2 text-body-sm">
              <input type="checkbox" defaultChecked /> Critical
            </label>
          </FilterGroup>
        </FilterPanel>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <FilterChip key={chip} label={chip} onRemove={() => setChips((c) => c.filter((x) => x !== chip))} />
          ))}
        </div>
      </Section>

      <Section title="Stepper">
        <div className="w-96">
          <Stepper originLabel="T-102" destinationLabel="WH01" etaMinutes={18} />
        </div>
      </Section>

      <Section title="Modal">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Critical incident">
          <p className="text-body-md text-navy">Truck T-102 — temperature 7.4°C, safe threshold 4°C.</p>
        </Modal>
      </Section>

      <Section title="Data layer (Segment 2 smoke test)">
        <div className="w-full">
          <DataLayerDebug />
        </div>
      </Section>
    </div>
  )
}
