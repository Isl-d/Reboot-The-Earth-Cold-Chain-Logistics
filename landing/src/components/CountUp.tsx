import { useEffect, useRef, useState } from 'react'

// Counts every number in a string up from zero the first time it scrolls into
// view ("8–10%" → both 8 and 10 count). Screen readers get the final text.
export default function CountUp({ value, duration = 1400 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [p, setP] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setP(1)
      return
    }
    let raf = 0
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        setP(1 - Math.pow(1 - t, 3))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [duration])

  const shown = value.replace(/\d[\d,]*(\.\d+)?/g, (n) => {
    const decimals = n.split('.')[1]?.length ?? 0
    const current = Number(n.replace(/,/g, '')) * p
    return n.includes(',')
      ? current.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : current.toFixed(decimals)
  })

  return (
    <span ref={ref} aria-label={value}>
      <span aria-hidden>{shown}</span>
    </span>
  )
}
