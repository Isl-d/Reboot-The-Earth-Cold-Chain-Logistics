import type { SimTruckOptionDto } from '../dto'
import type { SimTruckOption } from '../types'
import { expectNumber, expectString } from '../validation'

export function adaptSimTruckOption(dto: SimTruckOptionDto): SimTruckOption {
  const resource = 'truck option'
  return {
    truckId: expectString(resource, 'truckId', dto.truckId),
    label: expectString(resource, 'label', dto.label),
    batchId: expectString(resource, 'batchId', dto.batchId),
    product: expectString(resource, 'product', dto.product),
    quantityKg: expectNumber(resource, 'quantityKg', dto.quantityKg),
  }
}
