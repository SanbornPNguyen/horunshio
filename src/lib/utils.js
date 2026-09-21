export const KMI = 0.621371

export function getDistClass(km) {
  if (km <= 6) return 'd5k'
  if (km <= 12) return 'd10'
  if (km <= 17) return 'd15k'
  if (km <= 25) return 'dhalf'
  return 'dfull'
}

// Standard race distances in km. A race within 3% of one snaps to the
// nearest, so 10.0 / 10.02 km, or 6.2 mi entered as 9.98 km, all count as 10K.
// Nearest (not first) match matters: 8K and 5 Mile are only 0.6% apart.
export const STD_DISTANCES = [
  { label: '1 Mile', km: 1.609344 },
  { label: '5K', km: 5 },
  { label: '8K', km: 8 },
  { label: '5 Mile', km: 8.04672 },
  { label: '10K', km: 10 },
  { label: '15K', km: 15 },
  { label: '10 Mile', km: 16.09344 },
  { label: 'Half', km: 21.0975 },
  { label: 'Marathon', km: 42.195 },
]

export function distKey(km) {
  let best = null, bestErr = 0.03
  for (const d of STD_DISTANCES) {
    const err = Math.abs(km - d.km) / d.km
    if (err <= bestErr) { best = d; bestErr = err }
  }
  return best ? best.label : `${Math.round(km * 10) / 10}km`
}

// "Turkey Trot 2025" -> "turkey-trot-2025"; groups the same event across runners
export function eventSlug(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Only let http(s) links through to href — blocks javascript: and friends
export function safeUrl(url) {
  return /^https?:\/\//i.test(url || '') ? url : null
}

// Riegel: T2 = T1 * (D2 / D1) ^ exponent
export function predictTime(secs, fromKm, toKm, exponent = 1.06) {
  return secs * Math.pow(toKm / fromKm, exponent)
}

// Chart axis/tooltip formatter. Values are minutes (pace) or hours (duration).
export function chartFormatter(mode, unit) {
  if (mode === 'pace') {
    return v => {
      const m = Math.floor(v), s = Math.round((v - m) * 60)
      return `${m}:${String(s).padStart(2, '0')} /${unit}`
    }
  }
  return v => formatTime(Math.round(v * 3600))
}

// ── Units ───────────────────────────────────────────────────────────────
// Everything is stored in km and sec/km; convert only at display time.

export const distIn = (km, unit) => unit === 'mi' ? km * KMI : km
export const paceIn = (secPerKm, unit) => unit === 'mi' ? secPerKm / KMI : secPerKm
export const paceOf = (run, unit) => paceIn(run.paceKm, unit)

// Distance: "10 km", "21.1 km", "6.2 mi"
export function fmtDist(km, unit, digits = 1) {
  return `${+distIn(km, unit).toFixed(digits)} ${unit}`
}

// Format seconds to "M:SS" pace
export function formatPace(s) {
  const m = Math.floor(s / 60)
  const sc = Math.round(s % 60)
  return `${m}:${String(sc).padStart(2, '0')}`
}

// Format seconds to "H:MM:SS", or "M:SS" under an hour
export function formatTime(s) {
  s = Math.round(s)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sc = s % 60
  return h
    ? `${h}:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`
    : `${m}:${String(sc).padStart(2, '0')}`
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
  return t.split(':').map(Number).reduce((total, part) => total * 60 + part, 0)
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
      distLabel: distKey(km),
      distClass: getDistClass(km),
    }
  }).sort((a, b) => a.dateObj - b.dateObj)

  // Walk chronologically: previous race at the same distance, and whether
  // each race beat everything before it at that distance (a PR when run).
  const prevMap = new Map()
  const lastByDist = {}
  const bestByDist = {}
  const wasPR = new Set()
  runs.forEach(r => {
    const k = distKey(r.km)
    prevMap.set(r.id, lastByDist[k] || null)
    lastByDist[k] = r
    if (!bestByDist[k] || r.paceKm < bestByDist[k].paceKm) {
      bestByDist[k] = r
      wasPR.add(r.id)
    }
  })

  return runs.map(r => ({
    ...r,
    distKey: distKey(r.km),
    prev: prevMap.get(r.id),
    wasPR: wasPR.has(r.id),
    isPR: bestByDist[distKey(r.km)].id === r.id,
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

  // PRs keyed by standard distance ("10K", "Half", ...)
  const prs = {}
  runs.filter(r => r.isPR).forEach(r => { prs[r.distKey] = r })

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
  runs.forEach(r => { distCount[r.distKey] = (distCount[r.distKey] || 0) + 1 })
  const dominant = Object.entries(distCount).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (dominant) {
    const distRuns = runs
      .filter(r => r.distKey === dominant)
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

// Order PR/distance keys: standard distances first, then odd ones by length
export function sortDistKeys(keys) {
  const std = STD_DISTANCES.map(d => d.label)
  return [...keys].sort((a, b) => {
    const ia = std.indexOf(a), ib = std.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return parseFloat(a) - parseFloat(b)
  })
}

// Summary of one year for a runner. `runs` must come from processRuns.
export function yearReview(runs, year) {
  const yr = runs.filter(r => r.year === year)
  const prev = runs.filter(r => r.year === year - 1)
  const sum = (list, f) => list.reduce((s, r) => s + f(r), 0)

  // Biggest same-distance pace drop vs the previous race at that distance
  const improvements = yr.filter(r => r.prev).map(r => ({ run: r, gain: r.prev.paceKm - r.paceKm }))
  const mostImproved = improvements.sort((a, b) => b.gain - a.gain)[0]

  const byMonth = Array(12).fill(0)
  yr.forEach(r => { byMonth[r.dateObj.getMonth()]++ })

  return {
    year,
    runs: yr,
    count: yr.length,
    km: sum(yr, r => r.km),
    secs: sum(yr, r => r.secs),
    prsSet: yr.filter(r => r.wasPR && r.prev),
    newDistances: yr.filter(r => !r.prev),
    fastest: [...yr].sort((a, b) => a.paceKm - b.paceKm)[0] || null,
    mostImproved: mostImproved?.gain > 0 ? mostImproved : null,
    byMonth,
    prevCount: prev.length,
    prevKm: sum(prev, r => r.km),
  }
}
