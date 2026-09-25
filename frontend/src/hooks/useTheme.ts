import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'

// One theme for the whole app. A module-level store (not per-component state)
// so every caller — the sidebar toggle, the shell — always agrees.
function readStoredTheme(): Theme {
  try {
    return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

let current: Theme = readStoredTheme()
document.documentElement.setAttribute('data-theme', current)

const listeners = new Set<() => void>()

function setTheme(next: Theme) {
  current = next
  document.documentElement.setAttribute('data-theme', next)
  try {
    localStorage.setItem('theme', next)
  } catch {
    // Storage blocked (private window): the theme still applies for this session.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current)
  const toggleTheme = () => setTheme(current === 'dark' ? 'light' : 'dark')
  return { theme, toggleTheme }
}
