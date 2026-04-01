export const KMI = 0.621371

// Format seconds to "M:SS" pace
export function formatPace(s) {
  const m = Math.floor(s / 60)
  const sc = Math.round(s % 60)
  return `${m}:${String(sc).padStart(2, '0')}`
}

// Format seconds to "H:MM:SS"
export function formatTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sc = Math.round(s % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`
}

// Parse "YYYY-MM-DD" to a display string "MM/DD/YYYY" without timezone shift
export function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${m}/${d}/${y}`
}

// Convert "MM/DD/YYYY" to "YYYY-MM-DD" for the API
export function toISODate(d) {
  const [m, day, y] = d.split('/')
  return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// Parse "H:MM:SS" or "MM:SS" to total seconds
export function parseTimeStr(t) {
  const p = t.split(':').map(Number)
  return p[0] * 3600 + p[1] * 60 + (p[2] || 0)
}

// Process raw run rows from the API into enriched run objects
export function processRuns(rawRuns) {
  const runs = rawRuns.map(r => {
    const km = parseFloat(r.km)
    const mi = km * KMI
    const secs = r.timeSeconds
    const [y, mo, d] = r.date.split('T')[0].split('-').map(Number)
    return {
      ...r,
      km,
      mi,
      secs,
      displayDate: `${String(mo).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`,
      dateObj: new Date(y, mo - 1, d),
      paceKm: secs / km,
      paceMi: secs / mi,
    }
  }).sort((a, b) => a.dateObj - b.dateObj)

  // Build prev-same-distance map
  const prevMap = new Map()
  const lastByDist = {}
  runs.forEach(r => {
    prevMap.set(r.id, lastByDist[r.km] || null)
    lastByDist[r.km] = r
  })

  return runs.map(r => ({ ...r, prev: prevMap.get(r.id) }))
}

export function getDelta(run) {
  if (!run.prev) return null
  const d = run.paceKm - run.prev.paceKm
  const abs = Math.abs(d)
  const dm = Math.floor(abs / 60)
  const ds = Math.round(abs % 60)
  const str = dm > 0 ? `${dm}m ${String(ds).padStart(2, '0')}s` : `${ds}s`
  if (d < -2) return { cls: 'faster', label: `▲ ${str}/km faster` }
  if (d > 2) return { cls: 'slower', label: `▼ ${str}/km slower` }
  return { cls: 'same', label: '± same' }
}

export function computeStats(runs) {
  if (!runs.length) return { count: 0, totKm: 0, totH: 0, totM: 0, avgPKm: 0 }
  const totKm = runs.reduce((s, r) => s + r.km, 0)
  const totSecs = runs.reduce((s, r) => s + r.secs, 0)
  const totH = Math.floor(totSecs / 3600)
  const totM = Math.floor((totSecs % 3600) / 60)
  const avgPKm = totSecs / totKm
  return { count: runs.length, totKm, totH, totM, avgPKm }
}
