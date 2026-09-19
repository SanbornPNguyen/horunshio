import { processRuns, eventSlug } from './utils.js'

// All approved runs (from getAllRuns) -> processed runs with runner info,
// processed per runner so PR flags and "vs prev" are correct.
export function processAll(allRuns) {
  const byRunner = new Map()
  allRuns.forEach(r => {
    if (!byRunner.has(r.runnerSlug)) byRunner.set(r.runnerSlug, [])
    byRunner.get(r.runnerSlug).push(r)
  })
  return [...byRunner.values()].flatMap(processRuns).map(r => ({ ...r, slug: eventSlug(r.eventName) }))
}

// Group processed runs into events, newest first
export function groupEvents(runs) {
  const map = new Map()
  runs.forEach(r => {
    if (!map.has(r.slug)) map.set(r.slug, { slug: r.slug, name: r.eventName, entries: [] })
    map.get(r.slug).entries.push(r)
  })
  return [...map.values()].map(e => {
    const byTime = [...e.entries].sort((a, b) => a.secs - b.secs)
    const date = e.entries.reduce((d, r) => (r.dateObj < d ? r.dateObj : d), e.entries[0].dateObj)
    return { ...e, date, winner: byTime[0], runners: new Set(e.entries.map(r => r.runnerSlug)).size }
  }).sort((a, b) => b.date - a.date)
}
