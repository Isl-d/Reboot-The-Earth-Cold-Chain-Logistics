// Fixed-height placeholder so an empty chart box keeps the same shape as a
// populated one (no collapsed boxes, no bare axis frames).
export default function ChartEmpty({ height, message }: { height: number; message: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-line px-4 text-center"
      style={{ height }}
    >
      <span className="tt-caps text-text-secondary">No data</span>
      <span className="text-body-sm text-text-secondary">{message}</span>
    </div>
  )
}
