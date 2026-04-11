const BASE = '/api'

// ── In-memory TTL cache ────────────────────────────────────────────────────
const _cache = new Map()
const TTL = 5 * 60 * 1000 // 5 minutes

function cacheGet(key) {
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > TTL) { _cache.delete(key); return null }
  return entry.data
}

function cacheSet(key, data) {
  _cache.set(key, { data, ts: Date.now() })
}

function cacheDel(...prefixes) {
  for (const key of _cache.keys()) {
    if (prefixes.some(p => key.startsWith(p))) _cache.delete(key)
  }
}
// ──────────────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getRunners() {
  const cached = cacheGet('runners')
  if (cached) return cached
  const res = await fetch(`${BASE}/runners`)
  if (!res.ok) throw new Error('Failed to fetch runners')
  const data = await res.json()
  cacheSet('runners', data)
  return data
}

export async function getRuns(slug) {
  const key = `runs:${slug}`
  const cached = cacheGet(key)
  if (cached) return cached
  const res = await fetch(`${BASE}/runs?runner=${encodeURIComponent(slug)}`)
  if (!res.ok) throw new Error('Failed to fetch runs')
  const data = await res.json()
  cacheSet(key, data)
  return data
}

export async function submitRun(data) {
  const res = await fetch(`${BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Submission failed')
  }
  return res.json()
}

export async function adminLogin(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error('Invalid credentials')
  const { token } = await res.json()
  localStorage.setItem('admin_token', token)
  return token
}

export function adminLogout() {
  localStorage.removeItem('admin_token')
}

export async function getPendingSubmissions() {
  const res = await fetch(`${BASE}/admin/submissions`, {
    headers: authHeaders(),
  })
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) throw new Error('Failed to fetch submissions')
  return res.json()
}

export async function reviewSubmission(id, action) {
  const res = await fetch(`${BASE}/admin/submissions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ action }),
  })
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) throw new Error('Failed to update submission')
  cacheDel('runs:') // approved run may now appear in a runner's list
  return res.json()
}

export async function adminAddRun(data) {
  const res = await fetch(`${BASE}/admin/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to add run')
  }
  cacheDel('runs:') // new run affects the runner's list
  return res.json()
}

export async function createRunner(name, slug) {
  const res = await fetch(`${BASE}/admin/runners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name, slug }),
  })
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to create runner')
  }
  cacheDel('runners') // new runner should appear in the selector
  return res.json()
}
