import type { Config } from 'tailwindcss'

/*
  Every value below is copied from docs/DESIGN.md (the prose sections,
  which win over the YAML front-matter per plan.md's "Decisions" table).
  Do not add or invent colors, sizes, or radii here — extend DESIGN.md
  first if something is missing, then mirror it here.
*/
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Core Brand & Structural Chrome
        navy: {
          DEFAULT: '#0F172A', // Primary Navy
          dark: '#0A192F', // active state
          light: '#1E293B', // hover state
        },
        sky: {
          DEFAULT: '#0EA5E9', // Cool Cold-Chain Accent / focus outline
          cyan: '#06B6D4',
          light: '#38BDF8',
          tint: '#E0F2FE', // active rows, chilled zones, selected states
        },
        // Neutral Foundation
        canvas: '#F8FAFC',
        surface: '#FFFFFF',
        line: '#E2E8F0', // Surface Level 0 border
        'line-strong': '#CBD5E1', // Surface Level 1 border / input border
        'line-heavy': '#94A3B8', // Surface Level 2 border
        muted: '#64748B',
        // Telemetry Status Semantics
        status: {
          safe: { DEFAULT: '#10B981', tint: '#ECFDF5', border: '#A7F3D0', fg: '#065F46' },
          warning: { DEFAULT: '#F59E0B', tint: '#FFFBEB', border: '#FDE68A', fg: '#92400E' },
          critical: { DEFAULT: '#EF4444', tint: '#FEF2F2', border: '#FECACA', fg: '#991B1B' },
          offline: { DEFAULT: '#64748B', tint: '#F1F5F9', border: '#CBD5E1', fg: '#334155' },
        },
        // Data Provenance Badge Semantics
        provenance: {
          measured: { dot: '#4F46E5', fill: '#EEF2FF', border: '#C7D2FE', fg: '#3730A3' },
          calculated: { dot: '#7C3AED', fill: '#F5F3FF', border: '#DDD6FE', fg: '#5B21B6' },
          predicted: { dot: '#0284C7', fill: '#F0F9FF', border: '#BAE6FD', fg: '#075985' },
          recommended: { dot: '#059669', fill: '#ECFDF5', border: '#A7F3D0', fg: '#065F46' },
          finance: { dot: '#D97706', fill: '#FFFBEB', border: '#FDE68A', fg: '#92400E' },
        },
      },
      fontSize: {
        'headline-xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.025em', fontWeight: '700' }],
        'headline-lg': ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-md': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-sm': ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-md': ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        'body-sm': ['0.75rem', { lineHeight: '1.125rem', fontWeight: '400' }],
        'telemetry-xl': ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.03em', fontWeight: '600' }],
        'telemetry-md': ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '-0.02em', fontWeight: '500' }],
        'label-code': ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.04em', fontWeight: '500' }],
        'label-ui': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      boxShadow: {
        level1: '0 2px 4px -1px rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        level2: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.03)',
        level3: '0 20px 25px -5px rgba(15, 23, 42, 0.15)',
        'focus-halo': '0 0 0 2px #FFFFFF, 0 0 0 4px #0EA5E9',
      },
      screens: {
        tablet: '768px',
        desktop: '1280px',
      },
      keyframes: {
        indeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
      },
      animation: {
        // Simulation screen's "still running" progress bar — no fixed total
        // duration to compute a real percentage against, so this signals
        // activity rather than completion.
        indeterminate: 'indeterminate 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
