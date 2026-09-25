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
  Button,
  Card,
  ProvenanceBadge,
  Select,
  StatusChip,
  Stepper,
  Table,
  Td,
  Th,
  Thead,
  Tr,
} from '@/design'
import type { OptimizationNavState } from '@/lib/navigation'

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

  return (
    <>
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-12 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-label-ui uppercase text-muted">Truck</span>
          <Select
            className="w-64"
            value={truckId}
            onChange={(e) => {
              setTruckId(e.target.value)
              setBatchIdOverride(undefined)
            }}
            options={trucksQuery.data?.map((t) => ({ value: t.truckId, label: t.label })) ?? [{ value: '', label: 'Loading…' }]}
          />
          {batchInfo && (
            <span className="text-body-sm text-muted">
              {batchId} — {batchInfo.product} ({batchInfo.quantityKg} kg)
            </span>
          )}
          <Button
            variant="secondary"
            className="ml-auto"
            disabled={!truckId || !batchId}
            onClick={() => evaluate.mutate({ truckId, batchId })}
          >
            Re-evaluate
          </Button>
        </div>
      </Card>

      {/* Candidates */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-12 p-4">
        <h2 className="text-headline-sm text-navy">Candidate Destinations</h2>
        {!optimization.data ? (
          <p className="mt-3 text-body-sm text-muted">Select a truck to see candidate warehouses.</p>
        ) : (
          <div className="mt-3">
            <Table>
              <Thead>
                <tr>
                  <Th>Warehouse</Th>
                  <Th className="text-right">ETA</Th>
                  <Th className="text-right">Capacity</Th>
                  <Th>Temp Compatible</Th>
                  <Th className="text-right">Expected Loss</Th>
                  <Th className="text-right">Transport Cost</Th>
                  <Th>Feasible</Th>
                </tr>
              </Thead>
              <tbody>
                {optimization.data.candidates.map((c) => (
                  <Tr key={c.warehouseId} statusTier={!c.feasible ? 'critical' : c.selected ? 'safe' : undefined}>
                    <Td>
                      <span className="flex items-center gap-2">
                        {c.warehouseId}
                        {c.selected && <ProvenanceBadge kind="recommended" compact />}
                      </span>
                    </Td>
                    <Td numeric>{c.etaMinutes} min</Td>
                    <Td numeric>{c.capacityKg !== undefined ? `${c.capacityKg} kg` : '—'}</Td>
                    <Td>
                      {c.temperatureCompatible === undefined ? (
                        <StatusChip tier="offline" label="N/A" />
                      ) : (
                        <StatusChip tier={c.temperatureCompatible ? 'safe' : 'critical'} label={c.temperatureCompatible ? 'Yes' : 'No'} />
                      )}
                    </Td>
                    <Td numeric>{c.expectedLossPercent.toFixed(1)}%</Td>
                    <Td numeric>QAR {c.transportCost.toLocaleString()}</Td>
                    <Td>
                      <StatusChip tier={c.feasible ? 'safe' : 'critical'} label={c.feasible ? 'Feasible' : 'Not feasible'} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* Route */}
      {selected && selectedTruck && (
        <Card className="col-span-4 tablet:col-span-8 desktop:col-span-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm text-navy">Selected Route</h2>
            <ActionChip action="TRANSFER" />
          </div>
          <div className="mt-4">
            <Stepper originLabel={selectedTruck.truckId} destinationLabel={selected.warehouseId} etaMinutes={selected.etaMinutes} />
          </div>
          <p className="mt-4 text-body-sm text-muted">
            Selected by optimization engine to minimize transport cost, food-loss cost, and delay cost.
          </p>
        </Card>
      )}

      {/* Objective + constraints */}
      {selected && (
        <Card className="col-span-4 tablet:col-span-8 desktop:col-span-8 p-4">
          <h2 className="text-headline-sm text-navy">Mathematical Objective</h2>
          <p className="mt-1 font-mono text-body-md text-navy">min transport cost + food-loss cost + delay cost</p>
          <p className="mt-1 text-body-sm text-muted">
            Objective value: <span className="font-mono tabular-nums text-navy">{optimization.data!.objectiveValue.toFixed(2)}</span>
          </p>

          <h3 className="mt-4 text-label-ui uppercase text-muted">Constraints</h3>
          <ul className="mt-2 space-y-2">
            {constraints.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
                <span className="text-body-sm text-navy">{c.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-body-sm text-muted">{c.detail}</span>
                  <StatusChip
                    tier={c.ok === undefined ? 'offline' : c.ok ? 'safe' : 'critical'}
                    label={c.ok === undefined ? 'Unknown' : c.ok ? 'Met' : 'Not met'}
                  />
                </span>
              </li>
            ))}
          </ul>

          <h3 className="mt-4 text-label-ui uppercase text-muted">
            {allFeasible ? `Why ${selected.warehouseId} is feasible` : `Why ${selected.warehouseId} was selected anyway`}
          </h3>
          {allFeasible ? (
            <p className="mt-1 text-body-sm text-navy">
              {selected.warehouseId} meets every constraint: {metLabels.join(', ')}.
            </p>
          ) : (
            <p className="mt-1 text-body-sm text-navy">
              No candidate met every constraint. {selected.warehouseId} was still the optimizer's best-scoring option,
              despite failing: <span className="text-status-critical-fg">{unmetLabels.join(', ')}</span>
              {metLabels.length > 0 && <> (it does meet: {metLabels.join(', ')})</>}.
            </p>
          )}
        </Card>
      )}

      {/* Execution — where intelligence acts, not just advises */}
      {selected && (
        <Card className="col-span-4 tablet:col-span-8 desktop:col-span-12 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm text-navy">Execution</h2>
            <ProvenanceBadge kind="recommended" />
          </div>
          <p className="mt-1 text-body-sm text-muted">
            The optimizer&apos;s recommendation becomes an action: dispatched, recorded and auditable.
            Auto-pilot executes the engine&apos;s own recommendation when risk is HIGH or CRITICAL.
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
            <Button
              variant="secondary"
              disabled={!truckId || autoPilot.isPending}
              onClick={() => autoPilot.mutate(truckId)}
            >
              {autoPilot.isPending ? 'Running…' : 'Auto-pilot: execute recommendation'}
            </Button>
          </div>

          {executeAction.data && (
            <p className="mt-3 text-body-sm text-navy">
              Executed <span className="font-mono">{executeAction.data.action}</span>
              {executeAction.data.destinationId ? ` → ${executeAction.data.destinationId}` : ''} ({executeAction.data.id})
            </p>
          )}
          {autoPilot.data && (
            <p className="mt-3 text-body-sm text-muted">
              Auto-pilot:{' '}
              {autoPilot.data.executed
                ? `executed ${autoPilot.data.action}`
                : autoPilot.data.reason}
            </p>
          )}

          {actionsQuery.data && actionsQuery.data.length > 0 && (
            <>
              <h3 className="mt-4 text-label-ui uppercase text-muted">Recent actions</h3>
              <ul className="mt-2 space-y-1">
                {actionsQuery.data.slice(0, 5).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-body-sm last:border-b-0"
                  >
                    <span className="text-navy">
                      {a.action}
                      {a.destinationId ? ` → ${a.destinationId}` : ''}
                    </span>
                    <span className="flex items-center gap-2 text-muted">
                      <ActionChip action={a.action} />
                      <span>{a.source}</span>
                      <span className="font-mono">{a.createdAt ?? ''}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
    </>
  )
}
