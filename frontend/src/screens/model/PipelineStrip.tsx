import { clsx } from '@/design/clsx'

// docs/PIPELINE.md's architecture: Sensors → AI Engine → Decision → Action →
// Food Loss. Only the first two stages are backed by data this screen
// actually fetches (telemetry, thermal exposure/deterioration/spoilage) —
// Decision/Action/Food Loss belong to Optimization/Analytics, so they stay
// dim here rather than claiming a "lit" state we can't back with real data.
const STAGES = ['Sensors', 'AI Engine', 'Decision', 'Action', 'Food Loss']

interface PipelineStripProps {
  /** How many leading stages are backed by data on this screen right now. */
  activeCount: number
}

export default function PipelineStrip({ activeCount }: PipelineStripProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {STAGES.map((stage, i) => (
        <div key={stage} className="flex shrink-0 items-center gap-2">
          <span
            className={clsx(
              'rounded-sm border px-3 py-1 text-label-ui uppercase whitespace-nowrap transition-colors',
              i < activeCount
                ? 'border-sky bg-sky-tint text-sky'
                : 'border-line bg-canvas text-muted',
            )}
          >
            {stage}
          </span>
          {i < STAGES.length - 1 && <span className="text-muted">→</span>}
        </div>
      ))}
    </div>
  )
}
