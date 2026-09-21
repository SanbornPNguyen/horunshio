import { useSyncExternalStore } from 'react'

// Site-wide km/mi preference. One toggle (in the Header) drives every page,
// and the choice is remembered like the theme.
const KEY = 'unit'
const listeners = new Set()

function read() {
  try { return localStorage.getItem(KEY) === 'mi' ? 'mi' : 'km' } catch { return 'km' }
}

let current = read()

export function setUnit(unit) {
  current = unit
  try { localStorage.setItem(KEY, unit) } catch { /* private mode: keep in memory */ }
  listeners.forEach(fn => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useUnit() {
  return useSyncExternalStore(subscribe, () => current)
}
