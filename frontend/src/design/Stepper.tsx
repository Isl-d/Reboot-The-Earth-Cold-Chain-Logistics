// Origin → destination stepper with ETA — plan.md "Decisions" → Optimization
// trip visual (no map; maps are Person 1's scope).

interface StepperProps {
  originLabel: string
  destinationLabel: string
  etaMinutes: number
}

export default function Stepper({ originLabel, destinationLabel, etaMinutes }: StepperProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <span className="h-3 w-3 rounded-full border-2 border-navy bg-card" aria-hidden />
        <span className="mt-1 text-body-sm text-navy">{originLabel}</span>
      </div>
      <div className="flex flex-1 flex-col items-center">
        <div className="h-px w-full border-t-2 border-dashed border-line" aria-hidden />
        <span className="mt-1 font-mono text-label-ui tabular-nums text-muted">{etaMinutes} min</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="h-3 w-3 rounded-full bg-sky" aria-hidden />
        <span className="mt-1 text-body-sm text-navy">{destinationLabel}</span>
      </div>
    </div>
  )
}
