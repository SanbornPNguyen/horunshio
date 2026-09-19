const STATUSES = ['approved', 'pending', 'rejected']

export function readBody(req) {
  return (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}
}

// Postgres error code; drizzle wraps driver errors in `cause`
export function pgCode(err) {
  return err?.cause?.code ?? err?.code
}

// Validates a run payload from any client. Returns { run } or { error }.
export function parseRun(body, { requireLink = false, allowStatus = false } = {}) {
  const runnerId = Number(body.runnerId)
  const eventName = typeof body.eventName === 'string' ? body.eventName.trim() : ''
  const date = typeof body.date === 'string' ? body.date : ''
  const km = Number(body.km)
  const timeSeconds = Number(body.timeSeconds)
  const link = typeof body.link === 'string' ? body.link.trim() : ''

  if (!Number.isInteger(runnerId) || runnerId < 1) return { error: 'Pick a runner' }
  if (!eventName || eventName.length > 255) return { error: 'Event name must be 1–255 characters' }

  const d = new Date(`${date}T00:00:00Z`)
  const tomorrow = Date.now() + 86400000
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(d) || d.toISOString().slice(0, 10) !== date
      || d.getUTCFullYear() < 1970 || d.getTime() > tomorrow) {
    return { error: 'Date must be a real date, not in the future' }
  }
  if (!(km >= 0.1 && km <= 500)) return { error: 'Distance must be between 0.1 and 500 km' }
  if (!Number.isInteger(timeSeconds) || timeSeconds < 60 || timeSeconds > 7 * 86400) {
    return { error: 'Finish time looks wrong' }
  }
  if (link && (link.length > 2000 || !/^https?:\/\//i.test(link))) {
    return { error: 'Link must start with http:// or https://' }
  }
  if (requireLink && !link) return { error: 'A link to the result is required' }

  const run = { runnerId, eventName, date, km: String(km), timeSeconds, link: link || null }
  if (allowStatus && body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return { error: 'Invalid status' }
    run.status = body.status
  }
  return { run }
}
