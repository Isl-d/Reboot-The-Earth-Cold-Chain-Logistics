import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useFoodLossAnalytics, useFoodLossSeries } from '@/api/hooks'
import type { FoodLossBreakdownItem } from '@/api/types'
import {
  AXIS_LINE,
  AXIS_STYLE,
  Box,
  CHART_COLORS,
  CrosshairTooltip,
  FilterChip,
  FilterGroup,
  KpiCard,
  ProvenanceBadge,
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
      : 'No loss recorded yet. Run a scenario to populate.'
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
  // series (docs/API_CONTRACT.md doesn't define one) — derived only from
  // backend-supplied numbers already fetched, never invented: per-day saved
  // food is predicted minus actual loss (where prevention worked), and the
  // financial chart is the two backend scalars placed side by side.
  const savedOverTime = (series.data?.overTime ?? []).map((p) => ({
    dateMs: p.dateMs,
    savedKg: Math.max(0, p.predictedLostKg - p.lostKg),
  }))
  const financialBars = analytics.data
    ? [
        { label: 'Lost', valueQar: analytics.data.estimatedFinancialLoss, color: 'var(--color-fill-coral)' },
        { label: 'Prevented', valueQar: analytics.data.estimatedFinancialLossPrevented, color: 'var(--color-fill-lime)' },
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


  const filterGroups = [
    { title: 'Product', items: series.data?.byProduct ?? [], filter: productFilter },
    { title: 'Warehouse', items: series.data?.byWarehouse ?? [], filter: warehouseFilter },
    { title: 'Cause', items: series.data?.byCause ?? [], filter: causeFilter },
  ]

  const breakdowns = [
    { title: 'Loss by cause', data: byCause },
    { title: 'Loss by product', data: byProduct },
    { title: 'Loss by warehouse', data: byWarehouse },
  ]

  const dateAxis = {
    dataKey: 'dateMs',
    type: 'number' as const,
    domain: ['dataMin', 'dataMax'] as [string, string],
    tickFormatter: formatDate,
    tick: AXIS_STYLE,
    axisLine: AXIS_LINE,
    tickLine: false,
    minTickGap: 32,
  }

  const fmt = (n: number | undefined) => (n !== undefined ? n.toLocaleString() : '—')
  const a = analytics.data

  return (
    <>
      {/* KPIs: mass flows (5) then rates and money (4). Coral is loss, lime is saved; Lost stays paper so its red trend reads. */}
      <div className="col-span-4 grid grid-cols-2 gap-3 tablet:col-span-8 tablet:grid-cols-3 desktop:col-span-12 desktop:grid-cols-5">
        <KpiCard label="Transported" value={fmt(a?.transportedKg)} unit="kg" provenance="calculated" />
        <KpiCard label="At risk" value={fmt(a?.atRiskKg)} unit="kg" provenance="calculated" />
        <KpiCard
          label="Lost"
          value={fmt(a?.lostKg)}
          unit="kg"
          provenance="calculated"
          trend={series.data?.overTime.map((p) => p.lostKg)}
          trendTier="critical"
        />
        <KpiCard label="Saved" tone="lime" value={fmt(a?.savedKg)} unit="kg" provenance="calculated" />
        <KpiCard label="CO₂ avoided" value={fmt(a?.co2AvoidedKg)} unit="kg" provenance="calculated" />
      </div>
      <div className="col-span-4 grid grid-cols-2 gap-3 tablet:col-span-8 desktop:col-span-12 desktop:grid-cols-4">
        <KpiCard label="Loss rate" tone="coral" value={a ? a.lossRatePercent.toFixed(2) : '—'} unit="%" provenance="calculated" />
        <KpiCard label="Prevented loss" tone="lime" value={a ? a.preventedLossPercent.toFixed(2) : '—'} unit="%" provenance="calculated" />
        <KpiCard label="Financial loss" value={fmt(a?.estimatedFinancialLoss)} unit="QAR" provenance="finance" />
        <KpiCard label="Loss prevented" value={fmt(a?.estimatedFinancialLossPrevented)} unit="QAR" provenance="finance" />
      </div>

      {/* Filters */}
      <div className="col-span-4 flex flex-col gap-3 tablet:col-span-8 desktop:col-span-3 desktop:self-start">
        <Box title="Filters" meta={activeChips.length > 0 ? `${activeChips.length} active` : 'all'} bodyClassName="p-4">
          {filterGroups.map((g) => (
            <FilterGroup key={g.title} title={g.title}>
              {g.items.length === 0 && <p className="text-body-sm text-text-secondary">{filterEmptyText}</p>}
              {g.items.map((item) => (
                <label key={item.label} className="flex items-center gap-2 text-body-sm">
                  <input type="checkbox" checked={g.filter.selected.has(item.label)} onChange={() => g.filter.toggle(item.label)} />
                  {item.label}
                </label>
              ))}
            </FilterGroup>
          ))}
        </Box>
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <FilterChip key={chip.label} label={chip.label} onRemove={chip.remove} />
            ))}
          </div>
        )}
      </div>

      <div className="col-span-4 grid grid-cols-1 gap-4 tablet:col-span-8 desktop:col-span-9">
        {/* Food loss over time: predicted vs actual */}
        <Box
          title="Food loss over time"
          tone="coral"
          meta={
            <>
              <span className="hidden tablet:inline">predicted vs actual · kg</span>
              <ProvenanceBadge kind="calculated" compact />
            </>
          }
          bodyClassName="p-4"
        >
          {series.data && series.data.overTime.length > 0 ? (
            <>
              <div className="mb-2 flex flex-wrap gap-4">
                <span className="tt-caps flex items-center gap-1.5">
                  <span className="h-0 w-5 border-t-[3px] border-dashed" style={{ borderColor: CHART_COLORS.predicted }} aria-hidden />
                  Predicted
                </span>
                <span className="tt-caps flex items-center gap-1.5">
                  <span className="h-3 w-4 rounded-[3px] border-2 border-ink bg-fill-coral" aria-hidden />
                  Actual
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={series.data.overTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="2 4" vertical={false} />
                  <XAxis {...dateAxis} ticks={series.data.overTime.map((p) => p.dateMs)} />
                  <YAxis tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false} unit=" kg" width={64} />
                  <CrosshairTooltip labelFormatter={(ms) => formatDate(Number(ms))} />
                  <Area
                    type="monotone"
                    dataKey="lostKg"
                    name="Actual"
                    stroke={CHART_COLORS.ink}
                    strokeWidth={2}
                    fill="var(--color-fill-coral)"
                    fillOpacity={0.85}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedLostKg"
                    name="Predicted"
                    stroke={CHART_COLORS.predicted}
                    strokeWidth={2.5}
                    fill="none"
                    strokeDasharray="6 4"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </>
          ) : (
            <ChartEmpty height={220} message={seriesEmptyText} />
          )}
        </Box>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
          {breakdowns.map((b) => (
            <Box key={b.title} title={b.title} meta="kg lost" small bodyClassName="p-3">
              <BreakdownBarChart data={b.data} emptyMessage={seriesEmptyText} color="var(--color-fill-coral)" />
            </Box>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          <Box title="Food saved over time" tone="lime" meta="predicted minus actual" bodyClassName="p-4">
            {savedOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={savedOverTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="2 4" vertical={false} />
                  <XAxis {...dateAxis} ticks={savedOverTime.map((p) => p.dateMs)} />
                  <YAxis tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false} unit=" kg" width={64} />
                  <CrosshairTooltip labelFormatter={(ms) => formatDate(Number(ms))} formatter={(value) => [`${value} kg`, 'Saved']} />
                  <Area
                    type="monotone"
                    dataKey="savedKg"
                    stroke={CHART_COLORS.ink}
                    strokeWidth={2}
                    fill="var(--color-fill-lime)"
                    fillOpacity={0.9}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty height={180} message={seriesEmptyText} />
            )}
          </Box>

          <Box
            title="Financial impact"
            tone="sun"
            meta={
              <>
                QAR <ProvenanceBadge kind="finance" compact />
              </>
            }
            bodyClassName="p-4"
          >
            {financialBars.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={financialBars} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false} />
                  <YAxis tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false} width={64} />
                  <CrosshairTooltip
                    cursor={{ fill: 'var(--color-elevated)' }}
                    formatter={(value) => [`QAR ${Number(value).toLocaleString()}`, 'Amount']}
                  />
                  <Bar dataKey="valueQar" stroke={CHART_COLORS.ink} strokeWidth={2} radius={[4, 4, 0, 0]} animationDuration={700}>
                    {financialBars.map((b) => (
                      <Cell key={b.label} fill={b.color} />
                    ))}
                    <LabelList
                      dataKey="valueQar"
                      position="top"
                      formatter={(v: unknown) => Number(v).toLocaleString()}
                      style={{ ...AXIS_STYLE, fill: 'var(--color-text-primary)' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty
                height={180}
                message={analytics.isError ? 'Could not load analytics.' : analytics.isLoading ? 'Loading…' : 'No data yet.'}
              />
            )}
          </Box>
        </div>
      </div>

      {/* Detail table */}
      <Box title="Breakdown detail" meta={`${detailRows.length} rows`} className="col-span-4 tablet:col-span-8 desktop:col-span-12">
        {detailRows.length === 0 ? (
          <div className="p-4">
            <ChartEmpty height={96} message={seriesEmptyText} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-body-md">
              <thead className="tt-thead">
                <tr>
                  <th>Dimension</th>
                  <th>Label</th>
                  <th className="text-right">Lost</th>
                  <th className="text-right">Share of dimension</th>
                </tr>
              </thead>
              <tbody>
                {detailRows
                  .slice()
                  .sort((x, y) => y.lostKg - x.lostKg)
                  .map((row) => {
                    const share = (row.lostKg / totalsByDimension[row.dimension]) * 100
                    return (
                      <tr key={`${row.dimension}-${row.label}`} className="border-b-2 border-line last:border-b-0 hover:bg-elevated">
                        <td className="px-3 py-2">
                          <span className="tt-chip">{row.dimension}</span>
                        </td>
                        <td className="px-3 py-2 font-bold">{row.label}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">{row.lostKg} kg</td>
                        <td className="px-3 py-2">
                          <span className="flex items-center justify-end gap-2">
                            <span className="hidden h-3 w-24 overflow-hidden rounded-[3px] border-2 border-ink bg-elevated tablet:block" aria-hidden>
                              <span className="block h-full bg-fill-coral" style={{ width: `${share}%` }} />
                            </span>
                            <span className="w-14 text-right font-mono tabular-nums">{share.toFixed(1)}%</span>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Box>
    </>
  )
}
