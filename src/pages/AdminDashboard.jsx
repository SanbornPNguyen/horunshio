import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPendingSubmissions, reviewSubmission, createRunner, getRunners, adminLogout, adminAddRun } from '../lib/api.js'
import { formatTime, formatPace, formatDate, parseTimeStr } from '../lib/utils.js'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('add-run')
  const [submissions, setSubmissions] = useState([])
  const [runners, setRunners] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState({})
  const [newRunner, setNewRunner] = useState({ name: '', slug: '' })
  const [runnerError, setRunnerError] = useState('')
  const [runnerSuccess, setRunnerSuccess] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { navigate('/admin'); return }

    Promise.all([
      getPendingSubmissions(),
      getRunners(),
    ]).then(([subs, rList]) => {
      setSubmissions(subs)
      setRunners(rList)
      setLoading(false)
    }).catch(err => {
      if (err.message === 'Unauthorized') navigate('/admin')
      setLoading(false)
    })
  }, [navigate])

  async function handleReview(id, action) {
    setReviewing(r => ({ ...r, [id]: action }))
    try {
      await reviewSubmission(id, action)
      setSubmissions(s => s.filter(x => x.id !== id))
    } catch (err) {
      if (err.message === 'Unauthorized') navigate('/admin')
      alert('Error: ' + err.message)
    } finally {
      setReviewing(r => { const n = { ...r }; delete n[id]; return n })
    }
  }

  async function handleCreateRunner(e) {
    e.preventDefault()
    setRunnerError('')
    setRunnerSuccess('')
    try {
      const runner = await createRunner(newRunner.name.trim(), newRunner.slug.trim())
      setRunners(r => [...r, runner])
      setNewRunner({ name: '', slug: '' })
      setRunnerSuccess(`Runner "${runner.name}" created!`)
    } catch (err) {
      setRunnerError(err.message)
    }
  }

  function handleLogout() {
    adminLogout()
    navigate('/admin')
  }

  function autoSlug(name) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <h1 className="logo">Ho<span>Run</span>Shio</h1>
          <div className="nav-links">
            <button className="logout-btn" onClick={handleLogout}>Sign out</button>
          </div>
        </div>
      </header>

      <div className="admin-page">
        <h2>Admin Dashboard</h2>
        <p className="subtitle">Add runs, review submissions, and manage runners.</p>

        <div className="admin-tabs">
          <button className={`admin-tab${tab === 'add-run' ? ' active' : ''}`} onClick={() => setTab('add-run')}>
            Add Run
          </button>
          <button className={`admin-tab${tab === 'submissions' ? ' active' : ''}`} onClick={() => setTab('submissions')}>
            Pending {submissions.length > 0 && `(${submissions.length})`}
          </button>
          <button className={`admin-tab${tab === 'runners' ? ' active' : ''}`} onClick={() => setTab('runners')}>
            Runners
          </button>
        </div>

        {loading && <div className="loading">Loading…</div>}

        {!loading && tab === 'add-run' && (
          <AddRunForm runners={runners} onAdded={() => {}} onUnauthorized={() => navigate('/admin')} />
        )}

        {!loading && tab === 'submissions' && (
          <>
            {submissions.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p>No pending submissions.</p>
              </div>
            ) : (
              submissions.map(sub => (
                <SubmissionCard
                  key={sub.id}
                  sub={sub}
                  reviewing={reviewing[sub.id]}
                  onReview={handleReview}
                />
              ))
            )}
          </>
        )}

        {!loading && tab === 'runners' && (
          <>
            <div className="section-header">
              <h3>All Runners</h3>
            </div>
            {runners.map(r => (
              <div key={r.id} className="submission-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{r.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--ink3)', marginTop: '2px' }}>/{r.slug}</div>
                </div>
              </div>
            ))}

            <div className="add-runner-form">
              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink2)', marginBottom: '12px' }}>
                Add New Runner
              </div>
              {runnerError && <div className="error-msg">{runnerError}</div>}
              {runnerSuccess && <div style={{ background: 'var(--greenbg)', color: 'var(--green)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>{runnerSuccess}</div>}
              <form onSubmit={handleCreateRunner}>
                <div className="field-row">
                  <div className="field" style={{ margin: 0 }}>
                    <label>Name</label>
                    <input
                      type="text"
                      placeholder="Jane Smith"
                      value={newRunner.name}
                      onChange={e => { setNewRunner({ name: e.target.value, slug: autoSlug(e.target.value) }); setRunnerError('') }}
                      required
                    />
                  </div>
                  <button className="btn-sm" type="submit" style={{ alignSelf: 'flex-end', marginBottom: '0' }}>Add</button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function AddRunForm({ runners, onAdded, onUnauthorized }) {
  const emptyForm = { runnerId: '', eventName: '', date: '', km: '', timeStr: '', link: '' }
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (runners.length && !form.runnerId) {
      setForm(f => ({ ...f, runnerId: String(runners[0].id) }))
    }
  }, [runners]) // eslint-disable-line react-hooks/exhaustive-deps

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); setError('') }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!/^\d+:\d{2}(:\d{2})?$/.test(form.timeStr.trim())) {
      setError('Time must be in H:MM:SS or MM:SS format (e.g. 1:26:01)')
      return
    }

    const timeSeconds = parseTimeStr(form.timeStr.trim())
    if (!timeSeconds || timeSeconds <= 0) { setError('Invalid time value'); return }

    setSubmitting(true)
    try {
      await adminAddRun({
        runnerId: form.runnerId,
        eventName: form.eventName.trim(),
        date: form.date,
        km: parseFloat(form.km),
        timeSeconds,
        link: form.link.trim() || null,
      })
      setSuccess(`"${form.eventName.trim()}" added successfully!`)
      setForm(f => ({ ...emptyForm, runnerId: f.runnerId }))
      onAdded()
    } catch (err) {
      if (err.message === 'Unauthorized') onUnauthorized()
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit} style={{ maxWidth: '560px' }}>
      {error && <div className="error-msg">{error}</div>}
      {success && <div style={{ background: 'var(--greenbg)', color: 'var(--green)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>{success}</div>}

      <div className="field">
        <label>Runner</label>
        <select value={form.runnerId} onChange={e => set('runnerId', e.target.value)} required>
          {runners.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div className="field">
        <label>Event Name</label>
        <input
          type="text"
          placeholder="e.g. Turkey Trot 2025"
          value={form.eventName}
          onChange={e => set('eventName', e.target.value)}
          required
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Date</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div className="field">
          <label>Distance (km)</label>
          <input
            type="number"
            step="0.01"
            min="0.1"
            placeholder="10.0"
            value={form.km}
            onChange={e => set('km', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="field">
        <label>Finish Time</label>
        <input
          type="text"
          placeholder="1:26:01"
          value={form.timeStr}
          onChange={e => set('timeStr', e.target.value)}
          required
        />
        <div className="hint">Format: H:MM:SS (e.g. 1:26:01 or 58:30)</div>
      </div>

      <div className="field">
        <label>Link <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
        <input
          type="url"
          placeholder="https://www.strava.com/activities/..."
          value={form.link}
          onChange={e => set('link', e.target.value)}
        />
      </div>

      <button className="btn-primary" type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add Run'}
      </button>
    </form>
  )
}

function SubmissionCard({ sub, reviewing, onReview }) {
  const km = parseFloat(sub.km)
  const mi = km * 0.621371
  const paceKm = sub.timeSeconds / km
  const paceMi = sub.timeSeconds / mi

  return (
    <div className="submission-card">
      <div className="submission-header">
        <div>
          <div className="submission-name">{sub.eventName}</div>
          <div className="submission-runner">{sub.runnerName}</div>
        </div>
        <span className="badge-pending">Pending</span>
      </div>

      <div className="submission-meta">
        <span>📅 {formatDate(sub.date)}</span>
        <span>📏 {km}km</span>
        <span>⏱ {formatTime(sub.timeSeconds)}</span>
        <span>🏃 {formatPace(paceKm)}/km · {formatPace(paceMi)}/mi</span>
      </div>

      {sub.link && (
        <div className="submission-link" style={{ marginBottom: '8px' }}>
          <a href={sub.link} target="_blank" rel="noopener noreferrer">🔗 {sub.link}</a>
        </div>
      )}

      <div style={{ fontSize: '11px', color: 'var(--ink3)', marginBottom: '10px' }}>
        Submitted {new Date(sub.submittedAt).toLocaleString()}
      </div>

      <div className="submission-actions">
        <button className="btn-approve" disabled={!!reviewing} onClick={() => onReview(sub.id, 'approve')}>
          {reviewing === 'approve' ? 'Approving…' : '✓ Approve'}
        </button>
        <button className="btn-reject" disabled={!!reviewing} onClick={() => onReview(sub.id, 'reject')}>
          {reviewing === 'reject' ? 'Rejecting…' : '✕ Reject'}
        </button>
      </div>
    </div>
  )
}
