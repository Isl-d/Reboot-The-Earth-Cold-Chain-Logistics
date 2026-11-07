import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  useActions,
  useAutoPilot,
  useDeterioration,
  useEvaluateOptimization,
  useExecuteAction,
  useOptimizationCandidates,
  useSimTruckOptions,
  useSimulationState,
} from '@/api/hooks'
import {
  ActionChip,
  Box,
  Breakdown,
  Button,
  InfoTip,
  ProvenanceBadge,
  Select,
  StatusChip,
  Stepper,
  type BreakdownRow,
} from '@/design'
import { clsx } from '@/design/clsx'
import type { OptimizationNavState } from '@/lib/navigation'

const TH = 'whitespace-nowrap'
const TD = 'px-3 py-2.5 align-middle'
const NUM = 'whitespace-nowrap text-right font-mono tabular-nums'

function qar(value: number): string {
  return `QAR ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export default function OptimizationScreen() {
  // Arriving from a row action elsewhere (e.g. Inventory's "Evaluate
  // options") pins both the truck AND that row's own batch — Optimization
  // would otherwise fall back to the selected truck's default batch, which
  // is a different item than the one that was just evaluated.
  const navState = useLocation().state as OptimizationNavState | null

  const trucksQuery = useSimTruckOptions()
  const [truckId, setTruckId] = useState(navState?.truckId ?? '')
  const [batchIdOverride, setBatchIdOverride] = useState(navState?.batchId)

  useEffect(() => {
    if (!truckId && trucksQuery.data && trucksQuery.data.length > 0) {
      setTruckId(trucksQuery.data[0].truckId)
    }
  }, [trucksQuery.data, truckId])

  const selectedTruck = trucksQuery.data?.find((t) => t.truckId === truckId)
  const batchId = batchIdOverride ?? selectedTruck?.batchId ?? ''
  // The truck's default cargo info doesn't apply when viewing a different
  // (overridden) batch — e.g. arriving from Inventory's "Evaluate options".
  const batchInfo = batchIdOverride
    ? navState && { product: navState.product, quantityKg: navState.quantityKg }
    : selectedTruck && { product: selectedTruck.product, quantityKg: selectedTruck.quantityKg }

  const simState = useSimulationState(truckId)
  const running = simState.data?.running ?? false
  const deterioration = useDeterioration(truckId, running)

  const optimization = useOptimizationCandidates(truckId, batchId)
  const evaluate = useEvaluateOptimization()

  // Actions: turn the recommendation into a recorded, auditable operation.
  const actionsQuery = useActions(truckId, Boolean(truckId))
  const executeAction = useExecuteAction()
  const autoPilot = useAutoPilot()

  const selected = optimization.data?.selectedCandidate
  const remainingSafeMinutes = deterioration.data ? deterioration.data.remainingShelfLifeHours * 60 : undefined
  // The constraint check must use the batch actually being shown, not the
  // truck's default cargo — the same distinction batchInfo already makes.
  const quantityKg = batchInfo?.quantityKg

  const constraints = selected
    ? [
        {
          label: 'ETA ≤ remaining safe time',
          ok: remainingSafeMinutes !== undefined ? selected.etaMinutes <= remainingSafeMinutes : undefined,
          detail:
            remainingSafeMinutes !== undefined
              ? `${selected.etaMinutes} min ≤ ${remainingSafeMinutes.toFixed(0)} min`
              : `${selected.etaMinutes} min (remaining safe time unavailable)`,
        },
        {
          label: 'Quantity ≤ capacity',
          ok:
            quantityKg !== undefined && selected.capacityKg !== undefined
              ? quantityKg <= selected.capacityKg
              : undefined,
          detail:
            selected.capacityKg !== undefined
              ? quantityKg !== undefined
                ? `${quantityKg} kg ≤ ${selected.capacityKg} kg`
                : `${selected.capacityKg} kg capacity`
              : 'Capacity not reported',
        },
        {
          label: 'Storage temperature compatible',
          ok: selected.temperatureCompatible,
          detail:
            selected.temperatureCompatible === undefined
              ? 'Compatibility not reported'
              : selected.temperatureCompatible
              ? 'Compatible'
              : 'Not compatible',
        },
        {
          label: 'Route feasible',
          ok: selected.feasible,
          detail: selected.feasible ? 'Feasible' : 'Not feasible',
        },
      ]
    : []

  // Built from the same `constraints` checks above (not re-derived) so this
  // text can never claim something the checklist itself shows as unmet —
  // the mock/backend can select an infeasible candidate when NONE of them
  // are feasible, and that case must read honestly, not as a success story.
  const metLabels = constraints.filter((c) => c.ok === true).map((c) => c.label)
  const unmetLabels = constraints.filter((c) => c.ok === false).map((c) => c.label)
  const allFeasible = constraints.length > 0 && constraints.every((c) => c.ok !== false)

  const candidates = optimization.data?.candidates ?? []
  const showObjective = candidates.some((c) => c.objective !== undefined)

  // The selected option's cost terms, exactly as the backend returned them.
  // Terms the backend did not send are left out rather than guessed.
  const costRows: BreakdownRow[] = selected
    ? [
        { code: 'TC', label: 'Transport cost', value: qar(selected.transportCost) },
        ...(selected.foodLossCost !== undefined
          ? [{ code: 'FL', label: 'Food-loss cost', value: qar(selected.foodLossCost), sign: '+ ' }]
          : []),
        ...(selected.delayCost !== undefined
          ? [{ code: 'DC', label: 'Delay cost', value: qar(selected.delayCost), sign: '+ ' }]
          : []),
      ]
    : []

  return (
    <>
      {/* Truck + batch */}
      <Box
        title="Truck and batch"
        meta="backend · optimize"
        className="col-span-4 tablet:col-span-8 desktop:col-span-12"
        bodyClassName="flex flex-wrap items-center gap-3 p-4"
      >
        <Select
          aria-label="Truck"
          className="w-full tablet:w-64"
          value={truckId}
          onChange={(e) => {
            setTruckId(e.target.value)
            setBatchIdOverride(undefined)
          }}
          options={trucksQuery.data?.map((t) => ({ value: t.truckId, label: t.label })) ?? [{ value: '', label: 'Loading…' }]}
        />
        {batchInfo && (
          <span className="flex flex-wrap items-center gap-2">
            <span className="tt-chip">{batchId}</span>
            <span className="text-body-md font-bold">{batchInfo.product}</span>
            <span className="font-mono text-body-sm text-text-secondary">{batchInfo.quantityKg} kg</span>
          </span>
        )}
        <Button
          variant="secondary"
          className="w-full tablet:ml-auto tablet:w-auto"
          disabled={!truckId || !batchId || evaluate.isPending}
          onClick={() => evaluate.mutate({ truckId, batchId })}
        >
          {evaluate.isPending ? 'Evaluating…' : 'Re-evaluate'}
        </Button>
        {evaluate.data && (
          <p className="w-full font-mono text-[12px] text-text-secondary">
            Re-evaluated on demand · objective{' '}
            <span className="font-bold text-text-primary">{evaluate.data.objectiveValue.toFixed(2)}</span>
            {evaluate.data.selectedWarehouseId ? ` · selected ${evaluate.data.selectedWarehouseId}` : ''}
          </p>
        )}
        {evaluate.isError && <p className="w-full text-body-sm font-bold text-risk-critical">Re-evaluate failed. Try again.</p>}
      </Box>

      {/* Candidates */}
      <Box
        title={
          <span className="inline-flex items-center gap-2">
            Candidate destinations
            <InfoTip title="Candidate destinations">
              Every warehouse the optimizer considered, with its ETA, capacity, temperature compatibility and expected
              loss. Feasible rows meet all constraints; the selected row minimises transport + food-loss + delay cost.
            </InfoTip>
          </span>
        }
        meta={candidates.length > 0 ? `${candidates.length} candidates` : 'no data'}
        className="col-span-4 overflow-visible tablet:col-span-8 desktop:col-span-12"
      >
        {!optimization.data ? (
          <p className="p-4 text-body-sm text-text-secondary">Select a truck to see candidate warehouses.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-body-md">
              <thead className="tt-thead">
                <tr>
                  <th className={TH}>Warehouse</th>
                  <th className={clsx(TH, 'text-right')}>ETA</th>
                  <th className={clsx(TH, 'text-right')}>Capacity</th>
                  <th className={TH}>Temp ok</th>
                  <th className={clsx(TH, 'text-right')}>Exp. loss</th>
                  <th className={clsx(TH, 'text-right')}>Transport</th>
                  {showObjective && <th className={clsx(TH, 'text-right')}>Objective</th>}
                  <th className={TH}>Feasible</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr
                    key={c.warehouseId}
                    className={clsx(
                      'border-b-2 border-line last:border-b-0',
                      c.selected ? 'bg-fill-lime font-bold text-on-fill' : 'hover:bg-elevated',
                      !c.feasible && !c.selected && 'text-text-secondary',
                    )}
                  >
                    <td className={TD}>
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <span className="font-mono">{c.warehouseId}</span>
                        {c.name && <span className="hidden font-normal tablet:inline">{c.name}</span>}
                        {c.selected && (
                          <span className="inline-flex items-center gap-1 rounded-md border-2 border-on-fill bg-surface px-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-primary">
                            <ProvenanceBadge kind="recommended" compact />
                            Recommended
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={clsx(TD, NUM)}>{c.etaMinutes} min</td>
                    <td className={clsx(TD, NUM)}>{c.capacityKg !== undefined ? `${c.capacityKg} kg` : '—'}</td>
                    <td className={TD}>
                      {c.temperatureCompatible === undefined ? (
                        <StatusChip tier="offline" label="N/A" />
                      ) : (
                        <StatusChip tier={c.temperatureCompatible ? 'safe' : 'critical'} label={c.temperatureCompatible ? 'Yes' : 'No'} />
                      )}
                    </td>
                    <td className={clsx(TD, NUM)}>{c.expectedLossPercent.toFixed(1)}%</td>
                    <td className={clsx(TD, NUM)}>{qar(c.transportCost)}</td>
                    {showObjective && <td className={clsx(TD, NUM)}>{c.objective !== undefined ? c.objective.toFixed(2) : '—'}</td>}
                    <td className={TD}>
                      <StatusChip tier={c.feasible ? 'safe' : 'critical'} label={c.feasible ? 'Feasible' : 'Not feasible'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Box>

      {/* Recommended route + cost terms */}
      {selected && selectedTruck && (
        <Box
          title={`Recommended: ${selected.warehouseId}`}
          tone="lime"
          meta={<ProvenanceBadge kind="recommended" />}
          className="col-span-4 tablet:col-span-8 desktop:col-span-5"
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-4">
            <span className="tt-caps text-text-secondary">Route</span>
            <ActionChip action="TRANSFER" />
          </div>
          <div className="px-4 pb-4 pt-3">
            <Stepper originLabel={selectedTruck.truckId} destinationLabel={selected.warehouseId} etaMinutes={selected.etaMinutes} />
          </div>
          <div className="border-t-[3px] border-ink">
            <Breakdown
              rows={costRows}
              total={{ code: 'J', label: 'Objective (min)', value: optimization.data!.objectiveValue.toFixed(2) }}
            />
          </div>
        </Box>
      )}

      {/* Objective + constraints */}
      {selected && (
        <Box
          title="Objective and constraints"
          meta={`${metLabels.length}/${constraints.length} met`}
          className="col-span-4 tablet:col-span-8 desktop:col-span-7"
          bodyClassName="p-4"
        >
          <pre className="tt-pre m-0 whitespace-pre-wrap">min  transport cost + food-loss cost + delay cost</pre>

          <ul className="mt-3">
            {constraints.map((c) => (
              <li
                key={c.label}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b-2 border-line py-2 last:border-b-0"
              >
                <span className="text-body-md font-bold">{c.label}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-text-secondary">{c.detail}</span>
                  <StatusChip
                    tier={c.ok === undefined ? 'offline' : c.ok ? 'safe' : 'critical'}
                    label={c.ok === undefined ? 'Unknown' : c.ok ? 'Met' : 'Not met'}
                  />
                </span>
              </li>
            ))}
          </ul>

          <div
            className={clsx(
              'mt-3 rounded-md border-[3px] border-ink p-3 text-on-fill',
              allFeasible ? 'bg-fill-lime' : 'bg-fill-coral',
            )}
          >
            <span className="tt-caps block">
              {allFeasible ? `Why ${selected.warehouseId} is feasible` : `Why ${selected.warehouseId} was picked anyway`}
            </span>
            {allFeasible ? (
              <p className="mt-1 text-body-sm">
                {selected.warehouseId} meets every constraint: {metLabels.join(', ')}.
              </p>
            ) : (
              <p className="mt-1 text-body-sm">
                No candidate met every constraint. {selected.warehouseId} was still the best-scoring option, despite
                failing: <b>{unmetLabels.join(', ')}</b>
                {metLabels.length > 0 && <> (it does meet: {metLabels.join(', ')})</>}.
              </p>
            )}
          </div>
        </Box>
      )}

      {/* Execution: where intelligence acts, not just advises */}
      {selected && (
        <Box
          title="Execution"
          tone="ink"
          meta={<ProvenanceBadge kind="recommended" />}
          className="col-span-4 tablet:col-span-8 desktop:col-span-12"
        >
          <div className="p-4">
            <p className="text-body-sm text-text-secondary">
              The recommendation becomes an action: dispatched, recorded and auditable. Auto-pilot executes the
              engine&apos;s own recommendation when risk is HIGH or CRITICAL.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                disabled={!truckId || !allFeasible || executeAction.isPending}
                onClick={() =>
                  executeAction.mutate({
                    truckId,
                    batchId,
                    action: 'DIVERT',
                    destinationId: selected.warehouseId,
                    source: 'operator',
                  })
                }
              >
                {executeAction.isPending ? 'Executing…' : `Execute DIVERT → ${selected.warehouseId}`}
              </Button>
              <Button
                variant="secondary"
                disabled={!truckId || executeAction.isPending}
                onClick={() => executeAction.mutate({ truckId, action: 'ACKNOWLEDGE', source: 'operator' })}
              >
                Acknowledge incidents
              </Button>
              <Button variant="secondary" disabled={!truckId || autoPilot.isPending} onClick={() => autoPilot.mutate(truckId)}>
                {autoPilot.isPending ? 'Running…' : 'Auto-pilot: execute recommendation'}
              </Button>
            </div>

            {(executeAction.data || autoPilot.data) && (
              <div className="mt-3 flex flex-col gap-1.5">
                {executeAction.data && (
                  <p className="rounded-md border-2 border-ink bg-fill-lime px-3 py-1.5 font-mono text-[12px] font-bold text-on-fill">
                    Executed {executeAction.data.action}
                    {executeAction.data.destinationId ? ` → ${executeAction.data.destinationId}` : ''} · {executeAction.data.id}
                  </p>
                )}
                {autoPilot.data && (
                  <p className="font-mono text-[12px] text-text-secondary">
                    Auto-pilot: {autoPilot.data.executed ? `executed ${autoPilot.data.action}` : autoPilot.data.reason}
                  </p>
                )}
              </div>
            )}
          </div>

          {actionsQuery.data && actionsQuery.data.length > 0 && (
            <div className="overflow-x-auto border-t-[3px] border-ink">
              <table className="w-full min-w-[520px] border-collapse text-body-md">
                <thead className="tt-thead">
                  <tr>
                    <th>Recent actions</th>
                    <th>Type</th>
                    <th>Source</th>
                    <th className="text-right">When</th>
                  </tr>
                </thead>
                <tbody>
                  {actionsQuery.data.slice(0, 5).map((a) => (
                    <tr key={a.id} className="border-b-2 border-line last:border-b-0 hover:bg-elevated">
                      <td className={clsx(TD, 'font-bold')}>
                        {a.action}
                        {a.destinationId ? ` → ${a.destinationId}` : ''}
                      </td>
                      <td className={TD}>
                        <ActionChip action={a.action} />
                      </td>
                      <td className={clsx(TD, 'font-mono text-[12px] uppercase')}>{a.source}</td>
                      <td className={clsx(TD, NUM, 'text-[12px] text-text-secondary')}>{a.createdAt ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Box>
      )}
    </>
  )
}
