export const KMI = 0.621371

export function getDistLabel(km) {
  if (km <= 6) return '5K'
  if (km <= 12) return '10K'
  if (km <= 17) return '15K'
  if (km <= 25) return 'Half'
  return 'Full'
}

export function getDistClass(km) {
  if (km <= 6) return 'd5k'
  if (km <= 12) return 'd10'
  if (km <= 17) return 'd15k'
  if (km <= 25) return 'dhalf'
  return 'dfull'
}

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
      km, mi, secs,
      year: y,
      displayDate: `${String(mo).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`,
      dateObj: new Date(y, mo - 1, d),
      paceKm: secs / km,
      paceMi: secs / mi,
      distLabel: getDistLabel(km),
      distClass: getDistClass(km),
    }
  }).sort((a, b) => a.dateObj - b.dateObj)

  // Build prev-same-distance map
  const prevMap = new Map()
  const lastByDist = {}
  runs.forEach(r => {
    prevMap.set(r.id, lastByDist[r.km] || null)
    lastByDist[r.km] = r
  })

  // PR detection: best (lowest) paceKm per exact km distance
  const prByKm = new Map()
  runs.forEach(r => {
    const existing = prByKm.get(r.km)
    if (!existing || r.paceKm < existing.paceKm) prByKm.set(r.km, r)
  })

  return runs.map(r => ({
    ...r,
    prev: prevMap.get(r.id),
    isPR: prByKm.get(r.km)?.id === r.id,
  }))
}

export function getDelta(run, unit = 'km') {
  if (!run.prev) return null
  const pace = unit === 'mi' ? run.paceMi : run.paceKm
  const prevPace = unit === 'mi' ? run.prev.paceMi : run.prev.paceKm
  const d = pace - prevPace
  const abs = Math.abs(d)
  const dm = Math.floor(abs / 60)
  const ds = Math.round(abs % 60)
  const str = dm > 0 ? `${dm}m ${String(ds).padStart(2, '0')}s` : `${ds}s`
  if (d < -2) return { cls: 'faster', label: `▲ ${str}/${unit} faster` }
  if (d > 2) return { cls: 'slower', label: `▼ ${str}/${unit} slower` }
  return { cls: 'same', label: '± same' }
}

export function computeStats(runs) {
  if (!runs.length) return {
    count: 0, totKm: 0, totH: 0, totM: 0, avgPKm: 0,
    prs: {}, byYear: {}, recentForm: null,
  }

  const totKm = runs.reduce((s, r) => s + r.km, 0)
  const totSecs = runs.reduce((s, r) => s + r.secs, 0)
  const totH = Math.floor(totSecs / 3600)
  const totM = Math.floor((totSecs % 3600) / 60)
  const avgPKm = totSecs / totKm

  // PRs: for each distLabel, find the fastest isPR run
  const prs = {}
  runs.filter(r => r.isPR).forEach(r => {
    if (!prs[r.distLabel] || r.paceKm < prs[r.distLabel].paceKm) {
      prs[r.distLabel] = r
    }
  })

  // Yearly breakdown
  const byYear = {}
  runs.forEach(r => {
    const y = r.year
    if (!byYear[y]) byYear[y] = { count: 0, km: 0, secs: 0 }
    byYear[y].count++
    byYear[y].km += r.km
    byYear[y].secs += r.secs
  })

  // Recent form: compare older half vs newer half for the most common distance.
  // Using same-distance only avoids mixing 10K pace with half-marathon pace.
  let recentForm = null
  const distCount = {}
  runs.forEach(r => { distCount[r.km] = (distCount[r.km] || 0) + 1 })
  const dominantKm = Object.entries(distCount).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (dominantKm) {
    const distRuns = runs
      .filter(r => String(r.km) === dominantKm)
      .sort((a, b) => a.dateObj - b.dateObj)
    if (distRuns.length >= 4) {
      const half = Math.floor(distRuns.length / 2)
      const olderAvg = distRuns.slice(0, half).reduce((s, r) => s + r.paceKm, 0) / half
      const newer = distRuns.slice(half)
      const newerAvg = newer.reduce((s, r) => s + r.paceKm, 0) / newer.length
      const diff = olderAvg - newerAvg  // positive = newer is faster = improving
      const threshold = olderAvg * 0.01  // 1% threshold to call it a trend
      if (diff > threshold) recentForm = 'improving'
      else if (diff < -threshold) recentForm = 'declining'
      else recentForm = 'steady'
    }
  }

  return { count: runs.length, totKm, totH, totM, avgPKm, prs, byYear, recentForm }
}
