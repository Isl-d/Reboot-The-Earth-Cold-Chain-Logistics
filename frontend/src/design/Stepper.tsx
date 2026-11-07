// Origin → destination stepper with ETA — the Optimization trip visual
// (no map; maps are Person 1's scope).

interface StepperProps {
  originLabel: string
  destinationLabel: string
  etaMinutes: number
}

export default function Stepper({ originLabel, destinationLabel, etaMinutes }: StepperProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center">
        <span className="h-3.5 w-3.5 rounded-full border-[3px] border-ink bg-card" aria-hidden />
        <span className="mt-1 text-body-sm text-navy">{originLabel}</span>
      </div>
      <div className="flex flex-1 flex-col items-center">
        <div className="h-px w-full border-t-[3px] border-dashed border-ink" aria-hidden />
        <span className="mt-1 font-mono text-label-ui tabular-nums text-muted">{etaMinutes} min</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="h-3.5 w-3.5 rounded-full border-[3px] border-ink bg-fill-lime" aria-hidden />
        <span className="mt-1 text-body-sm text-navy">{destinationLabel}</span>
      </div>
    </div>
  )
}
