import { useEffect, useState } from 'react'

// Reveals text a few words at a time with a blinking caret, like the QAI
// assessment panel. Display only: the text itself comes from the backend.
export default function TypedText({ text, wordsPerTick = 3, tickMs = 45 }: { text: string; wordsPerTick?: number; tickMs?: number }) {
  const words = text.split(' ')
  const [shown, setShown] = useState(0)

  useEffect(() => {
    setShown(0)
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(words.length)
      return
    }
    const id = window.setInterval(() => {
      setShown((n) => {
        const next = Math.min(words.length, n + wordsPerTick)
        if (next >= words.length) window.clearInterval(id)
        return next
      })
    }, tickMs)
    return () => window.clearInterval(id)
    // Restart only when the text itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  return (
    <>
      {words.slice(0, shown).join(' ')}
      {shown < words.length && (
        <>
          {' '}
          <span className="tt-caret" aria-hidden="true" />
        </>
      )}
    </>
  )
}
