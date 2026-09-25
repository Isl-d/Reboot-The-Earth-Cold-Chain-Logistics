// Actions: the point where intelligence acts, not just advises.
import { apiClient } from './client'
import { endpoints } from './endpoints'

export interface ExecutedAction {
  id: string
  truckId: string | null
  batchId: string | null
  action: string
  destinationId: string | null
  status: string
  source: string
  detail: Record<string, unknown>
  createdAt: string | null
}

export interface ActionInput {
  truckId?: string
  batchId?: string
  action: string
  destinationId?: string
  source?: string
}

export async function executeAction(input: ActionInput): Promise<ExecutedAction> {
  return (await apiClient.post<ExecutedAction>(endpoints.actionsExecute, input)).data
}

export async function runAutoPilot(
  truckId: string,
): Promise<{ executed: boolean; reason: string; action: string | null; result?: ExecutedAction }> {
  return (await apiClient.post(endpoints.actionAuto(truckId), {})).data
}

export async function listActions(truckId?: string): Promise<ExecutedAction[]> {
  const params = truckId ? { truckId } : undefined
  return (await apiClient.get<{ actions: ExecutedAction[] }>(endpoints.actions, { params })).data.actions
}