import type { ButtonHTMLAttributes } from 'react'
import { clsx, FOCUS_RING } from './clsx'

type Variant = 'primary' | 'secondary' | 'destructive'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

// DESIGN.md → Components: Signal Cyan is the only primary fill; secondary is
// the surface tone with cyan text; destructive is Critical Rose with
// Tactical Slate text.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-primary text-on-accent hover:bg-primary-dim',
  secondary: 'bg-surface text-primary border border-border hover:bg-elevated',
  destructive: 'bg-risk-critical text-on-accent hover:opacity-90',
}

export default function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        FOCUS_RING,
        'inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2',
        'text-label-ui uppercase font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  )
}
