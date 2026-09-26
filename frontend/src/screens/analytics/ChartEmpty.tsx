// Fixed-height placeholder so an empty chart card keeps the same shape as a
// populated one (no collapsed cards, no bare axis frames).
export default function ChartEmpty({ height, message }: { height: number; message: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-md border border-dashed border-line px-4 text-center text-body-sm text-muted"
      style={{ height }}
    >
      {message}
    </div>
  )
}
