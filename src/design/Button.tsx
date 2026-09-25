import type { ButtonHTMLAttributes } from 'react'
import { clsx } from './clsx'

type Variant = 'primary' | 'secondary' | 'destructive'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

// DESIGN.md → Components → Buttons
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-light active:bg-navy-dark',
  secondary: 'bg-sky-tint text-[#0284C7] border border-[#BAE6FD] hover:bg-[#CFEBFC]',
  destructive: 'bg-status-critical text-white hover:bg-[#DC2626] active:bg-[#B91C1C]',
}

export default function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'focus-halo inline-flex items-center justify-center gap-2 rounded px-4 py-2',
        'text-body-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  )
}
