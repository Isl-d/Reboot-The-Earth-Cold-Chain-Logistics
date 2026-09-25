import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEvaluateOptimization, useInventory } from '@/api/hooks'
import type { InventoryBatch } from '@/api/types'
import { ActionChip, Button, Card, FilterChip, FilterGroup, FilterPanel, Table, Td, Th, Thead, Tr } from '@/design'
import type { OptimizationNavState } from '@/lib/navigation'
import { riskLabelFromProbability, riskTierFromProbability } from '@/lib/risk'
import { filterBySelection, useMultiSelect } from '@/lib/useMultiSelect'
import DemandBar from './DemandBar'

function uniqueValues<T>(items: T[], field: (item: T) => string): string[] {
  return [...new Set(items.map(field))].sort()
}

export default function InventoryScreen() {
  const inventory = useInventory()
  const evaluate = useEvaluateOptimization()
  const navigate = useNavigate()
  // The mutation object is shared (one request at a time), but rows are
  // independent — evaluate.isPending alone would disable every row's
  // button while any single row's request is in flight.
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null)

  const locationFilter = useMultiSelect()
  const productFilter = useMultiSelect()
  const recommendationFilter = useMultiSelect()
  const riskFilter = useMultiSelect()

  const rows = inventory.data ?? []

  const filteredRows = useMemo(() => {
    let result = rows
    result = filterBySelection(result, (r) => r.locationId, locationFilter.selected)
    result = filterBySelection(result, (r) => r.product, productFilter.selected)
    result = filterBySelection(result, (r) => r.recommendation, recommendationFilter.selected)
    result = filterBySelection(result, (r) => riskTierFromProbability(r.spoilageProbability), riskFilter.selected)
    return result
  }, [rows, locationFilter.selected, productFilter.selected, recommendationFilter.selected, riskFilter.selected])

  const locations = uniqueValues(rows, (r) => r.locationId)
  const products = uniqueValues(rows, (r) => r.product)
  const recommendations = uniqueValues(rows, (r) => r.recommendation)
  const riskTiers = uniqueValues(rows, (r) => riskTierFromProbability(r.spoilageProbability))

  const activeChips = [
    ...[...locationFilter.selected].map((l) => ({ label: `Location: ${l}`, remove: () => locationFilter.remove(l) })),
    ...[...productFilter.selected].map((l) => ({ label: `Product: ${l}`, remove: () => productFilter.remove(l) })),
    ...[...recommendationFilter.selected].map((l) => ({ label: `Action: ${l}`, remove: () => recommendationFilter.remove(l) })),
    ...[...riskFilter.selected].map((l) => ({ label: `Risk: ${l}`, remove: () => riskFilter.remove(l) })),
  ]

  function handleEvaluate(row: InventoryBatch) {
    if (!row.truckId) return
    const truckId = row.truckId
    setPendingBatchId(row.batchId)
    evaluate.mutate(
      { truckId, batchId: row.batchId },
      {
        onSettled: () => setPendingBatchId(null),
        onSuccess: () => {
          const state: OptimizationNavState = { truckId, batchId: row.batchId, product: row.product, quantityKg: row.quantityKg }
          navigate('/optimization', { state })
        },
      },
    )
  }

  return (
    <>
      <div className="col-span-4 tablet:col-span-8 desktop:col-span-3">
        <FilterPanel>
          <FilterGroup title="Location">
            {locations.map((l) => (
              <label key={l} className="flex items-center gap-2 text-body-sm">
                <input type="checkbox" checked={locationFilter.selected.has(l)} onChange={() => locationFilter.toggle(l)} />
                {l}
              </label>
            ))}
          </FilterGroup>
          <FilterGroup title="Product">
            {products.map((p) => (
              <label key={p} className="flex items-center gap-2 text-body-sm">
                <input type="checkbox" checked={productFilter.selected.has(p)} onChange={() => productFilter.toggle(p)} />
                {p}
              </label>
            ))}
          </FilterGroup>
          <FilterGroup title="Recommendation">
            {recommendations.map((r) => (
              <label key={r} className="flex items-center gap-2 text-body-sm">
                <input
                  type="checkbox"
                  checked={recommendationFilter.selected.has(r)}
                  onChange={() => recommendationFilter.toggle(r)}
                />
                {r}
              </label>
            ))}
          </FilterGroup>
          <FilterGroup title="Risk">
            {riskTiers.map((t) => (
              <label key={t} className="flex items-center gap-2 text-body-sm capitalize">
                <input type="checkbox" checked={riskFilter.selected.has(t)} onChange={() => riskFilter.toggle(t)} />
                {t}
              </label>
            ))}
          </FilterGroup>
        </FilterPanel>
        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <FilterChip key={chip.label} label={chip.label} onRemove={chip.remove} />
            ))}
          </div>
        )}
      </div>

      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-9 p-4">
        <h2 className="text-headline-sm text-navy">Inventory</h2>
        <div className="mt-3">
          <Table>
            <Thead>
              <tr>
                <Th>Batch</Th>
                <Th>Product</Th>
                <Th>Location</Th>
                <Th className="text-right">Quantity</Th>
                <Th className="text-right">Expiry</Th>
                <Th>Demand</Th>
                <Th className="text-right">Excess</Th>
                <Th className="text-right">Risk</Th>
                <Th>Action</Th>
                <Th />
              </tr>
            </Thead>
            <tbody>
              {filteredRows.map((row) => (
                <Tr key={row.batchId} statusTier={riskTierFromProbability(row.spoilageProbability)}>
                  <Td>{row.batchId}</Td>
                  <Td>{row.product}</Td>
                  <Td>{row.locationId}</Td>
                  <Td numeric>{row.quantityKg} kg</Td>
                  <Td numeric>
                    {row.expiryDate}
                    <span className="ml-1 text-muted">
                      ({row.daysUntilExpiry <= 0 ? 'expired' : `${row.daysUntilExpiry}d left`})
                    </span>
                  </Td>
                  <Td>
                    <DemandBar predictedDemandKg={row.predictedDemandKg} quantityKg={row.quantityKg} />
                  </Td>
                  <Td numeric>{row.expectedExcessKg} kg</Td>
                  <Td numeric title={riskLabelFromProbability(row.spoilageProbability)}>
                    {(row.spoilageProbability * 100).toFixed(0)}%
                  </Td>
                  <Td>
                    <ActionChip action={row.recommendation} />
                  </Td>
                  <Td>
                    <Button
                      variant="secondary"
                      className="whitespace-nowrap"
                      disabled={!row.truckId || pendingBatchId === row.batchId}
                      title={row.truckId ? undefined : 'No truck currently associated with this batch'}
                      onClick={() => handleEvaluate(row)}
                    >
                      Evaluate
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {filteredRows.length === 0 && <p className="mt-4 text-body-sm text-muted">No batches match the current filters.</p>}
        </div>
      </Card>
    </>
  )
}
