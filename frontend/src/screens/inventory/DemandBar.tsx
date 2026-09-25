interface DemandBarProps {
  predictedDemandKg: number
  quantityKg: number
}

// Predicted demand as a share of on-hand quantity — plan.md "Decisions" →
// Inventory row extras. Purely a ratio of two backend-supplied numbers.
export default function DemandBar({ predictedDemandKg, quantityKg }: DemandBarProps) {
  const percent = quantityKg > 0 ? Math.min(100, (predictedDemandKg / quantityKg) * 100) : 0
  return (
    <div className="w-16">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
        <div className="h-full rounded-full bg-sky" style={{ width: `${percent}%` }} />
      </div>
      {/* Column header already says "Demand" — no need to repeat it here. */}
      <span className="mt-0.5 block text-label-ui text-muted">{percent.toFixed(0)}%</span>
    </div>
  )
}
