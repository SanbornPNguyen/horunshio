const BASE = '/api'

function authHeaders() {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getRunners() {
  const res = await fetch(`${BASE}/runners`)
  if (!res.ok) throw new Error('Failed to fetch runners')
  return res.json()
}

export async function getRuns(slug) {
  const res = await fetch(`${BASE}/runs?runner=${encodeURIComponent(slug)}`)
  if (!res.ok) throw new Error('Failed to fetch runs')
  return res.json()
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
  return res.json()
}
