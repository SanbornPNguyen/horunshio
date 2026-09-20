import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPendingSubmissions, reviewSubmission, createRunner, getRunners, adminLogout, adminAddRun,
  adminGetRuns, adminUpdateRun, adminDeleteRun, adminSetRunnerLock,
} from '../lib/api.js'
import { formatTime, formatPace, formatDate, safeUrl, KMI } from '../lib/utils.js'
import Header from '../components/Header.jsx'
import RunForm, { runToForm } from '../components/RunForm.jsx'

export default function AdminDashboard() {
  const navigate = useNavigate()
  // ?tab=runners deep-links a tab
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'add-run')
  const [submissions, setSubmissions] = useState([])
  const [runners, setRunners] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState({})
  const [newRunner, setNewRunner] = useState({ name: '', slug: '' })
  const [runnerError, setRunnerError] = useState('')
  const [lockingId, setLockingId] = useState(null)
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

  async function handleLock(runner) {
    setLockingId(runner.id)
    setRunnerError('')
    try {
      const updated = await adminSetRunnerLock(runner.id, !runner.locked)
      setRunners(rs => rs.map(r => (r.id === runner.id ? updated : r)))
    } catch (err) {
      if (err.message === 'Unauthorized') navigate('/admin')
      setRunnerError(err.message)
    } finally {
      setLockingId(null)
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
      <Header>
        <button className="logout-btn" onClick={handleLogout}>Sign out</button>
      </Header>

      <div className="admin-page">
        <h2>Admin Dashboard</h2>
        <p className="subtitle">Add, edit and review runs, and manage runners.</p>

        <div className="admin-tabs">
          <button className={`admin-tab${tab === 'add-run' ? ' active' : ''}`} onClick={() => setTab('add-run')}>
            Add Run
          </button>
          <button className={`admin-tab${tab === 'submissions' ? ' active' : ''}`} onClick={() => setTab('submissions')}>
            Pending {submissions.length > 0 && `(${submissions.length})`}
          </button>
          <button className={`admin-tab${tab === 'runs' ? ' active' : ''}`} onClick={() => setTab('runs')}>
            All Runs
          </button>
          <button className={`admin-tab${tab === 'runners' ? ' active' : ''}`} onClick={() => setTab('runners')}>
            Runners
          </button>
        </div>

        {loading && <div className="loading">Loading…</div>}

        {!loading && tab === 'add-run' && (
          <AddRun runners={runners} onUnauthorized={() => navigate('/admin')} />
        )}

        {!loading && tab === 'runs' && (
          <RunsManager runners={runners} onUnauthorized={() => navigate('/admin')} />
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
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>
                    {r.name}{r.locked && <span className="badge-rejected" style={{ marginLeft: '8px' }}>🔒 Locked</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink3)', marginTop: '2px' }}>/{r.slug}</div>
                </div>
                <button
                  className={r.locked ? 'btn-approve' : 'btn-secondary'}
                  disabled={lockingId === r.id}
                  onClick={() => handleLock(r)}
                  title={r.locked ? 'Show these stats publicly again' : 'Hide this runner\'s stats from the public site'}
                >
                  {lockingId === r.id ? '…' : r.locked ? 'Unlock stats' : 'Lock stats'}
                </button>
              </div>
            ))}

            <div className="add-runner-form">
              <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink2)', marginBottom: '12px' }}>
                Add New Runner
              </div>
              {runnerError && <div className="error-msg">{runnerError}</div>}
              {runnerSuccess && <div style={successStyle}>{runnerSuccess}</div>}
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

const successStyle = { background: 'var(--greenbg)', color: 'var(--green)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }

function AddRun({ runners, onUnauthorized }) {
  const [success, setSuccess] = useState('')

  async function handleSubmit(data) {
    setSuccess('')
    try {
      await adminAddRun(data)
      setSuccess(`"${data.eventName}" added successfully!`)
    } catch (err) {
      if (err.message === 'Unauthorized') onUnauthorized()
      throw err
    }
  }

  return (
    <div style={{ maxWidth: '560px' }}>
      {success && <div style={successStyle}>{success}</div>}
      <RunForm runners={runners} onSubmit={handleSubmit} submitLabel="Add Run" busyLabel="Adding…" resetOnSuccess />
    </div>
  )
}

function RunsManager({ runners, onUnauthorized }) {
  const [runnerId, setRunnerId] = useState(runners[0] ? String(runners[0].id) : '')
  const [runs, setRuns] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!runnerId) return
    let stale = false
    setRuns(null)
    setError('')
    adminGetRuns(runnerId)
      .then(list => { if (!stale) setRuns(list) })
      .catch(err => { if (err.message === 'Unauthorized') onUnauthorized(); else setError(err.message) })
    return () => { stale = true }
  }, [runnerId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(id, data) {
    try {
      const updated = await adminUpdateRun(id, data)
      // Moved to another runner? Drop it from this list.
      setRuns(rs => String(updated.runnerId) === runnerId
        ? rs.map(r => r.id === id ? updated : r)
        : rs.filter(r => r.id !== id))
      setEditingId(null)
    } catch (err) {
      if (err.message === 'Unauthorized') onUnauthorized()
      throw err
    }
  }

  async function handleDelete(run) {
    if (!confirm(`Delete "${run.eventName}" (${formatDate(run.date)})? This can't be undone.`)) return
    try {
      await adminDeleteRun(run.id)
      setRuns(rs => rs.filter(r => r.id !== run.id))
    } catch (err) {
      if (err.message === 'Unauthorized') onUnauthorized()
      setError(err.message)
    }
  }

  return (
    <>
      <div className="field" style={{ maxWidth: '280px' }}>
        <label>Runner</label>
        <select value={runnerId} onChange={e => { setRunnerId(e.target.value); setEditingId(null) }}>
          {runners.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {!runs && !error && <div className="loading">Loading…</div>}
      {runs?.length === 0 && <div className="empty-state" style={{ padding: '40px 0' }}><p>No runs for this runner.</p></div>}

      {runs?.map(run => editingId === run.id ? (
        <div key={run.id} style={{ marginBottom: '12px' }}>
          <RunForm
            runners={runners}
            initial={runToForm(run)}
            showStatus
            submitLabel="Save"
            busyLabel="Saving…"
            onSubmit={data => handleSave(run.id, data)}
            onCancel={() => setEditingId(null)}
          />
        </div>
      ) : (
        <div key={run.id} className="submission-card">
          <div className="submission-header">
            <div>
              <div className="submission-name">{run.eventName}</div>
              <div className="submission-runner">
                {formatDate(run.date)} · {parseFloat(run.km)}km · {formatTime(run.timeSeconds)}
              </div>
            </div>
            <span className={`badge-${run.status}`}>{run.status}</span>
          </div>
          {safeUrl(run.link) && (
            <div className="submission-link">
              <a href={safeUrl(run.link)} target="_blank" rel="noopener noreferrer">🔗 {run.link}</a>
            </div>
          )}
          <div className="submission-actions">
            <button className="btn-secondary" onClick={() => setEditingId(run.id)}>Edit</button>
            <button className="btn-reject" onClick={() => handleDelete(run)}>Delete</button>
          </div>
        </div>
      ))}
    </>
  )
}

function SubmissionCard({ sub, reviewing, onReview }) {
  const km = parseFloat(sub.km)
  const mi = km * KMI
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
          {safeUrl(sub.link)
            ? <a href={safeUrl(sub.link)} target="_blank" rel="noopener noreferrer">🔗 {sub.link}</a>
            : <span style={{ fontSize: '12px', color: 'var(--red)' }}>⚠ Unsafe link (not http/https): {sub.link}</span>}
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
