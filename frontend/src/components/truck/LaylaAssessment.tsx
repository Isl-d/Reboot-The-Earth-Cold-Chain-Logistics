import type { ReactNode } from 'react'
import { Box, TypedText } from '../../design'

interface Props {
  /** Backend explanation text. Null or empty shows `empty`. */
  text?: string | null
  /** Extra chips for the header bar, e.g. "Frontier model". */
  chips?: ReactNode
  /** Mono line under the text naming the model / source. */
  source?: ReactNode
  /** Shown when there is no text yet. */
  empty?: ReactNode
  /** Controls (e.g. the Explain button) and anything else under the text. */
  children?: ReactNode
  className?: string
}

// The QAI assessment panel: lilac header, ~18px prose typed out, then a mono
// source line. LAYLA only explains numbers the backend already computed.
export default function LaylaAssessment({ text, chips, source, empty, children, className }: Props) {
  return (
    <Box
      className={className}
      tone="lilac"
      title="LAYLA's assessment"
      meta={
        <>
          {chips}
          <span className="tt-chip">AI-explained</span>
        </>
      }
      bodyClassName="flex flex-col gap-3 p-4"
    >
      {text ? (
        <p className="m-0 max-w-[72ch] text-[17px] leading-[1.55] text-text-primary tablet:text-[18px]">
          <TypedText text={text} />
        </p>
      ) : (
        empty && <div className="text-body-md text-text-secondary">{empty}</div>
      )}
      {children}
      {source && (
        <div className="border-t-2 border-line pt-2 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
          {source}
        </div>
      )}
    </Box>
  )
}
