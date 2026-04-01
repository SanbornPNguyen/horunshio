import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRunners, submitRun } from '../lib/api.js'
import { parseTimeStr } from '../lib/utils.js'

export default function Submit() {
  const [runners, setRunners] = useState([])
  const [form, setForm] = useState({
    runnerId: '',
    eventName: '',
    date: '',
    km: '',
    timeStr: '',
    link: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getRunners().then(list => {
      setRunners(list)
      if (list.length) setForm(f => ({ ...f, runnerId: String(list[0].id) }))
    }).catch(console.error)
  }, [])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Validate time format
    if (!/^\d+:\d{2}(:\d{2})?$/.test(form.timeStr.trim())) {
      setError('Time must be in H:MM:SS or MM:SS format (e.g. 1:26:01)')
      return
    }

    const timeSeconds = parseTimeStr(form.timeStr.trim())
    if (!timeSeconds || timeSeconds <= 0) {
      setError('Invalid time value')
      return
    }

    setSubmitting(true)
    try {
      await submitRun({
        runnerId: form.runnerId,
        eventName: form.eventName.trim(),
        date: form.date,
        km: parseFloat(form.km),
        timeSeconds,
        link: form.link.trim() || undefined,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h1 className="logo">Ho<span>Run</span>Shio</h1>
          </Link>
          <div className="nav-links">
            <Link to="/" className="nav-link">← Back</Link>
          </div>
        </div>
      </header>

      <div className="form-page">
        <h2>Submit a Run</h2>
        <p className="subtitle">Submitted runs will be reviewed before appearing on the site.</p>

        {submitted ? (
          <div className="success-msg">
            <h3>Submitted!</h3>
            <p>Your run has been sent for review. It will appear on the site once approved.</p>
            <button className="btn-primary" style={{ marginTop: '20px', maxWidth: '200px' }} onClick={() => { setSubmitted(false); setForm(f => ({ ...f, eventName: '', date: '', km: '', timeStr: '', link: '' })) }}>
              Submit another
            </button>
          </div>
        ) : (
          <form className="form-card" onSubmit={handleSubmit}>
            {error && <div className="error-msg">{error}</div>}

            <div className="field">
              <label>Runner</label>
              <select value={form.runnerId} onChange={e => set('runnerId', e.target.value)} required>
                {runners.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
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
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                  required
                />
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
              <div className="hint">Strava, Garmin, or any race result link</div>
            </div>

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Run'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
