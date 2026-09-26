import { Fragment, type CSSProperties } from 'react'
import type { RevealFrom } from './Reveal'

// A line of text whose words fly in one after another. It animates whenever
// `show` turns true, so a parent decides the moment: on scroll into view, or
// when a journey chapter becomes active. Screen readers get the plain string.
export default function SplitWords({
  text,
  show,
  from = 'below',
  delay = 0,
  step = 55,
}: {
  text: string
  show: boolean
  from?: RevealFrom
  delay?: number
  step?: number
}) {
  const words = text.split(' ')
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden data-from={from} className={`split ${show ? 'is-visible' : ''}`}>
        {words.map((w, i) => (
          <Fragment key={i}>
            {/* Inline-block so it can move; the space sits outside or it collapses. */}
            <span className="split-word" style={{ '--d': `${delay + i * step}ms` } as CSSProperties}>
              {w}
            </span>
            {i < words.length - 1 && ' '}
          </Fragment>
        ))}
      </span>
    </>
  )
}
