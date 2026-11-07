import type { ButtonHTMLAttributes } from 'react'
import { clsx, FOCUS_RING } from './clsx'

type Variant = 'primary' | 'secondary' | 'destructive'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

// QAI buttons: 3px ink frame with a hard shadow that collapses on press.
// Primary is the maroon fill; secondary is paper; destructive is critical red.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-fill-maroon text-[#fbf9f3]',
  secondary: 'bg-surface text-text-primary hover:bg-elevated',
  destructive: 'bg-fill-critical text-[#fbf9f3]',
}

export default function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        FOCUS_RING,
        'tt-press inline-flex min-h-10 items-center justify-center gap-2 px-4 py-1.5',
        'text-body-md font-bold disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  )
}
