import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useFoodLossAnalytics, useFoodLossSeries } from '@/api/hooks'
import type { FoodLossBreakdownItem } from '@/api/types'
import {
  AXIS_STYLE,
  Card,
  CHART_COLORS,
  CrosshairTooltip,
  FilterChip,
  FilterGroup,
  FilterPanel,
  KpiCard,
  Table,
  Td,
  Th,
  Thead,
  Tr,
} from '@/design'
import { filterBySelection, useMultiSelect } from '@/lib/useMultiSelect'
import BreakdownBarChart from './BreakdownBarChart'
import ChartEmpty from './ChartEmpty'

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function applyFilter(items: FoodLossBreakdownItem[], included: Set<string>): FoodLossBreakdownItem[] {
  return filterBySelection(items, (i) => i.label, included)
}

export default function AnalyticsScreen() {
  const analytics = useFoodLossAnalytics()
  const series = useFoodLossSeries()

  const seriesEmptyText = series.isError
    ? 'Could not load the food-loss series.'
    : series.isLoading
      ? 'Loading…'
      : 'No loss recorded yet — run a scenario to populate.'
  const filterEmptyText = series.isLoading ? 'Loading…' : 'No options yet.'

  const productFilter = useMultiSelect()
  const warehouseFilter = useMultiSelect()
  const causeFilter = useMultiSelect()

  const byProduct = useMemo(
    () => applyFilter(series.data?.byProduct ?? [], productFilter.selected),
    [series.data, productFilter.selected],
  )
  const byWarehouse = useMemo(
    () => applyFilter(series.data?.byWarehouse ?? [], warehouseFilter.selected),
    [series.data, warehouseFilter.selected],
  )
  const byCause = useMemo(
    () => applyFilter(series.data?.byCause ?? [], causeFilter.selected),
    [series.data, causeFilter.selected],
  )

  // "Saved food over time" and "Financial impact" aren't returned as their own
  // series (docs/api-contracts.md doesn't define one) — derived only from
  // backend-supplied numbers already fetched, never invented: per-day saved
  // food is predicted minus actual loss (where prevention worked), and the
  // financial chart is the two backend scalars placed side by side.
  const savedOverTime = (series.data?.overTime ?? []).map((p) => ({
    dateMs: p.dateMs,
    savedKg: Math.max(0, p.predictedLostKg - p.lostKg),
  }))
  const financialBars = analytics.data
    ? [
        { label: 'Financial loss', valueQar: analytics.data.estimatedFinancialLoss, color: CHART_COLORS.excursion },
        { label: 'Financial loss prevented', valueQar: analytics.data.estimatedFinancialLossPrevented, color: CHART_COLORS.safeLine },
      ]
    : []

  // Cause, product, and warehouse each independently partition the SAME
  // total lost kg — summing across all three would triple-count it. Each
  // row's percentage is of its own dimension's (currently filtered) total.
  const sumLostKg = (items: FoodLossBreakdownItem[]) => items.reduce((sum, r) => sum + r.lostKg, 0) || 1
  const totalsByDimension = {
    Cause: sumLostKg(byCause),
    Product: sumLostKg(byProduct),
    Warehouse: sumLostKg(byWarehouse),
  }
  const detailRows = [
    ...byCause.map((r) => ({ dimension: 'Cause' as const, ...r })),
    ...byProduct.map((r) => ({ dimension: 'Product' as const, ...r })),
    ...byWarehouse.map((r) => ({ dimension: 'Warehouse' as const, ...r })),
  ]

  const activeChips = [
    ...[...productFilter.selected].map((l) => ({ label: `Product: ${l}`, remove: () => productFilter.remove(l) })),
    ...[...warehouseFilter.selected].map((l) => ({ label: `Warehouse: ${l}`, remove: () => warehouseFilter.remove(l) })),
    ...[...causeFilter.selected].map((l) => ({ label: `Cause: ${l}`, remove: () => causeFilter.remove(l) })),
  ]

  return (
    <>
      {/* KPIs — mass flows (5) then rates & money (4); each row fills the width so no empty slot is left */}
      <div className="col-span-4 tablet:col-span-8 desktop:col-span-12 grid grid-cols-2 gap-2 tablet:grid-cols-3 desktop:grid-cols-5">
        <KpiCard label="Transported" value={analytics.data ? analytics.data.transportedKg.toLocaleString() : '—'} unit="kg" provenance="calculated" />
        <KpiCard label="At risk" value={analytics.data ? analytics.data.atRiskKg.toLocaleString() : '—'} unit="kg" provenance="calculated" />
        <KpiCard
          label="Lost"
          value={analytics.data ? analytics.data.lostKg.toLocaleString() : '—'}
          unit="kg"
          provenance="calculated"
          trend={series.data?.overTime.map((p) => p.lostKg)}
          trendTier="critical"
        />
        <KpiCard label="Saved" value={analytics.data ? analytics.data.savedKg.toLocaleString() : '—'} unit="kg" provenance="calculated" />
        <KpiCard label="CO₂ avoided" value={analytics.data?.co2AvoidedKg !== undefined ? analytics.data.co2AvoidedKg.toLocaleString() : '—'} unit="kg" provenance="calculated" />
      </div>
      <div className="col-span-4 tablet:col-span-8 desktop:col-span-12 grid grid-cols-2 gap-2 desktop:grid-cols-4">
        <KpiCard label="Loss rate" value={analytics.data ? analytics.data.lossRatePercent.toFixed(2) : '—'} unit="%" provenance="calculated" />
        <KpiCard label="Prevented loss" value={analytics.data ? analytics.data.preventedLossPercent.toFixed(2) : '—'} unit="%" provenance="calculated" />
        <KpiCard
          label="Financial loss"
          value={analytics.data ? `QAR ${analytics.data.estimatedFinancialLoss.toLocaleString()}` : '—'}
          provenance="finance"
        />
        <KpiCard
          label="Financial loss prevented"
          value={analytics.data ? `QAR ${analytics.data.estimatedFinancialLossPrevented.toLocaleString()}` : '—'}
          provenance="finance"
        />
      </div>

      {/* Filters */}
      <div className="col-span-4 tablet:col-span-8 desktop:col-span-3 desktop:self-start">
        <FilterPanel>
          <FilterGroup title="Product">
            {(series.data?.byProduct ?? []).length === 0 && <p className="text-body-sm text-muted">{filterEmptyText}</p>}
            {(series.data?.byProduct ?? []).map((p) => (
              <label key={p.label} className="flex items-center gap-2 text-body-sm">
                <input type="checkbox" checked={productFilter.selected.has(p.label)} onChange={() => productFilter.toggle(p.label)} />
                {p.label}
              </label>
            ))}
          </FilterGroup>
          <FilterGroup title="Warehouse">
            {(series.data?.byWarehouse ?? []).length === 0 && <p className="text-body-sm text-muted">{filterEmptyText}</p>}
            {(series.data?.byWarehouse ?? []).map((w) => (
              <label key={w.label} className="flex items-center gap-2 text-body-sm">
                <input type="checkbox" checked={warehouseFilter.selected.has(w.label)} onChange={() => warehouseFilter.toggle(w.label)} />
                {w.label}
              </label>
            ))}
          </FilterGroup>
          <FilterGroup title="Cause">
            {(series.data?.byCause ?? []).length === 0 && <p className="text-body-sm text-muted">{filterEmptyText}</p>}
            {(series.data?.byCause ?? []).map((c) => (
              <label key={c.label} className="flex items-center gap-2 text-body-sm">
                <input type="checkbox" checked={causeFilter.selected.has(c.label)} onChange={() => causeFilter.toggle(c.label)} />
                {c.label}
              </label>
            ))}
          </FilterGroup>
        </FilterPanel>
        {activeChips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <FilterChip key={chip.label} label={chip.label} onRemove={chip.remove} />
            ))}
          </div>
        )}
      </div>

      <div className="col-span-4 tablet:col-span-8 desktop:col-span-9 grid grid-cols-1 gap-2">
        {/* Food loss over time — actual vs predicted */}
        <Card className="p-4">
          <h2 className="mb-2 text-headline-sm text-navy">Food Loss Over Time — Predicted vs Actual</h2>
          {series.data && series.data.overTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={series.data.overTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis dataKey="dateMs" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatDate} tick={AXIS_STYLE} stroke={CHART_COLORS.grid} />
                <YAxis tick={AXIS_STYLE} stroke={CHART_COLORS.grid} unit=" kg" width={76} />
                <CrosshairTooltip labelFormatter={(ms) => formatDate(Number(ms))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="predictedLostKg" name="Predicted" stroke={CHART_COLORS.predicted} fill={CHART_COLORS.predicted} fillOpacity={0.08} strokeDasharray="4 4" isAnimationActive={false} />
                <Area type="monotone" dataKey="lostKg" name="Actual" stroke={CHART_COLORS.excursion} fill={CHART_COLORS.excursion} fillOpacity={0.15} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty height={220} message={seriesEmptyText} />
          )}
        </Card>

        <div className="grid grid-cols-1 gap-2 tablet:grid-cols-3">
          <Card className="p-4">
            <h2 className="text-headline-sm text-navy">Loss by Cause</h2>
            <div className="mt-2">
              <BreakdownBarChart data={byCause} emptyMessage={seriesEmptyText} color={CHART_COLORS.excursion} />
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="text-headline-sm text-navy">Loss by Product</h2>
            <div className="mt-2">
              <BreakdownBarChart data={byProduct} emptyMessage={seriesEmptyText} color={CHART_COLORS.measured} />
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="text-headline-sm text-navy">Loss by Warehouse</h2>
            <div className="mt-2">
              <BreakdownBarChart data={byWarehouse} emptyMessage={seriesEmptyText} color={CHART_COLORS.calculated} />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2">
          <Card className="p-4">
            <h2 className="text-headline-sm text-navy">Food Saved Over Time</h2>
            <p className="mb-2 text-body-sm text-muted">Predicted loss minus actual loss, per day</p>
            {savedOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={savedOverTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="dateMs" type="number" domain={['dataMin', 'dataMax']} tickFormatter={formatDate} tick={AXIS_STYLE} stroke={CHART_COLORS.grid} />
                  <YAxis tick={AXIS_STYLE} stroke={CHART_COLORS.grid} unit=" kg" width={76} />
                  <CrosshairTooltip labelFormatter={(ms) => formatDate(Number(ms))} formatter={(value) => [`${value} kg`, 'Saved']} />
                  <Area type="monotone" dataKey="savedKg" stroke={CHART_COLORS.safeLine} fill={CHART_COLORS.safeLine} fillOpacity={0.15} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty height={180} message={seriesEmptyText} />
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-headline-sm text-navy">Financial Impact</h2>
            <p className="mb-2 text-body-sm text-muted">Estimated loss vs loss prevented, QAR</p>
            {financialBars.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={financialBars} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
                  <XAxis type="number" tick={AXIS_STYLE} stroke={CHART_COLORS.grid} unit=" QAR" />
                  <YAxis type="category" dataKey="label" tick={AXIS_STYLE} stroke={CHART_COLORS.grid} width={150} />
                  <CrosshairTooltip formatter={(value) => [`QAR ${value}`, 'Amount']} />
                  <Bar dataKey="valueQar" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                    {financialBars.map((b) => (
                      <Cell key={b.label} fill={b.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty height={180} message={analytics.isError ? 'Could not load analytics.' : analytics.isLoading ? 'Loading…' : 'No data yet.'} />
            )}
          </Card>
        </div>
      </div>

      {/* Detail table */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-12 p-4">
        <h2 className="text-headline-sm text-navy">Breakdown Detail</h2>
        <div className="mt-2">
          {detailRows.length === 0 ? (
            <ChartEmpty height={96} message={seriesEmptyText} />
          ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Dimension</Th>
                <Th>Label</Th>
                <Th className="text-right">Lost</Th>
                <Th className="text-right">% of dimension total</Th>
              </tr>
            </Thead>
            <tbody>
              {detailRows
                .slice()
                .sort((a, b) => b.lostKg - a.lostKg)
                .map((row) => (
                  <Tr key={`${row.dimension}-${row.label}`}>
                    <Td>{row.dimension}</Td>
                    <Td>{row.label}</Td>
                    <Td numeric>{row.lostKg} kg</Td>
                    <Td numeric>{((row.lostKg / totalsByDimension[row.dimension]) * 100).toFixed(1)}%</Td>
                  </Tr>
                ))}
            </tbody>
          </Table>
          )}
        </div>
      </Card>
    </>
  )
}
