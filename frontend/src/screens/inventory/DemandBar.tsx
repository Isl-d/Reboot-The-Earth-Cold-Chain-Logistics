interface DemandBarProps {
  predictedDemandKg: number
  quantityKg: number
}

// Predicted demand as a share of on-hand quantity, shown on each Inventory
// row. Purely a ratio of two backend-supplied numbers. Drawn as a small QAI
// histogram bar: sky fill, 2px ink outline, rounded top, grows up on load.
export default function DemandBar({ predictedDemandKg, quantityKg }: DemandBarProps) {
  const percent = quantityKg > 0 ? Math.min(100, (predictedDemandKg / quantityKg) * 100) : 0
  return (
    <div className="flex items-end gap-2" title={`Predicted demand ${predictedDemandKg} kg of ${quantityKg} kg`}>
      <div className="flex h-8 w-5 items-end border-b-2 border-ink" aria-hidden>
        <div
          className="w-full origin-bottom rounded-t-[3px] border-2 border-b-0 border-ink bg-fill-sky motion-safe:animate-[tt-grow_0.6s_cubic-bezier(.2,.8,.2,1)_both]"
          style={{ height: `${Math.max(percent, 4)}%` }}
        />
      </div>
      {/* Column header already says "Demand", so no need to repeat it here. */}
      <span className="font-mono text-[12px] font-bold tabular-nums">{percent.toFixed(0)}%</span>
    </div>
  )
}
