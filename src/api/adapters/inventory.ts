import type { InventoryBatchDto } from '../dto'
import type { InventoryBatch } from '../types'
import { expectNumber, expectString } from '../validation'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function adaptInventoryBatch(dto: InventoryBatchDto): InventoryBatch {
  const resource = 'inventory batch'
  const expiryDate = expectString(resource, 'expiryDate', dto.expiryDate)
  const daysUntilExpiry = Math.ceil((Date.parse(expiryDate) - Date.now()) / MS_PER_DAY)
  return {
    batchId: expectString(resource, 'batchId', dto.batchId),
    product: expectString(resource, 'product', dto.product),
    locationId: expectString(resource, 'locationId', dto.locationId),
    quantityKg: expectNumber(resource, 'quantityKg', dto.quantityKg),
    expiryDate,
    daysUntilExpiry,
    predictedDemandKg: expectNumber(resource, 'predictedDemandKg', dto.predictedDemandKg),
    expectedExcessKg: expectNumber(resource, 'expectedExcessKg', dto.expectedExcessKg),
    spoilageProbability: expectNumber(resource, 'spoilageProbability', dto.spoilageProbability),
    recommendation: dto.recommendation,
  }
}
