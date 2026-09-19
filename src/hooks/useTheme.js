import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme') || 'default'
    document.documentElement.setAttribute('data-theme', saved)
    return saved
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return [theme, setTheme]
}

// Current theme's CSS variables for canvas drawing (Chart.js can't read CSS).
// Re-reads whenever <html data-theme> changes.
const VARS = ['orange', 'ink', 'ink2', 'ink3', 'surface', 'border', 'border2', 'hdr-bg', 'cmp-b']

function readVars() {
  const cs = getComputedStyle(document.documentElement)
  return Object.fromEntries(VARS.map(v => [v, cs.getPropertyValue(`--${v}`).trim()]))
}

export function useThemeColors() {
  const [colors, setColors] = useState(readVars)
  useEffect(() => {
    const obs = new MutationObserver(() => setColors(readVars()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return colors
}

// '#F25C1E' + 0.1 -> 'rgba(242,92,30,0.1)'
export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}
