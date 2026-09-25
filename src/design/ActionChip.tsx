import { clsx } from './clsx'
import type { BackendAction, SpecAction } from './types'

// The 5 actions from docs/PERSON_2_FRONTEND_INTELLIGENCE.md §5, styled with
// the Recommended provenance treatment. Any other backend action falls back
// to a generic slate style (plan.md "Decisions" → Actions).
const SPEC_ACTION_LABEL: Record<SpecAction, string> = {
  CONTINUE: 'Continue',
  TRANSFER: 'Transfer',
  DISCOUNT: 'Discount',
  PRIORITIZE_SALE: 'Prioritize Sale',
  REDISTRIBUTE: 'Redistribute',
}

function isSpecAction(action: BackendAction): action is SpecAction {
  return action in SPEC_ACTION_LABEL
}

function toTitleCase(action: string): string {
  return action
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

interface ActionChipProps {
  action: BackendAction
  className?: string
}

export default function ActionChip({ action, className }: ActionChipProps) {
  const known = isSpecAction(action)
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-label-ui',
        known
          ? 'bg-provenance-recommended-fill border-provenance-recommended-border text-provenance-recommended-fg'
          : 'bg-status-offline-tint border-status-offline-border text-status-offline-fg',
        className,
      )}
    >
      {known ? SPEC_ACTION_LABEL[action] : toTitleCase(action)}
    </span>
  )
}
