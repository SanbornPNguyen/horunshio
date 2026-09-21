import { useEffect, useState } from 'react'
import { parseTimeStr, formatTime, distIn, STD_DISTANCES } from '../lib/utils.js'
import { useUnit } from '../hooks/useUnit.js'

const QUICK = ['5K', '10K', '5 Mile', '10 Mile', 'Half', 'Marathon']
  .map(label => STD_DISTANCES.find(d => d.label === label))

const EMPTY = { runnerId: '', eventName: '', date: '', km: '', timeStr: '', link: '', status: 'approved' }

// Turn an API run row into form values
export function runToForm(run) {
  return {
    runnerId: String(run.runnerId),
    eventName: run.eventName,
    date: run.date.split('T')[0],
    km: String(parseFloat(run.km)),
    distUnit: 'km', // stored runs are in km; edit in km so nothing gets rounded
    timeStr: formatTime(run.timeSeconds),
    link: run.link || '',
    status: run.status,
  }
}

// Shared by public Submit, admin Add Run and admin Edit.
// onSubmit(payload) should throw to show an error; resolves = success.
export default function RunForm({
  runners, initial, onSubmit, submitLabel, busyLabel,
  requireLink = false, showStatus = false, resetOnSuccess = false, onCancel,
}) {
  const siteUnit = useUnit()
  const [form, setForm] = useState(initial || { ...EMPTY, distUnit: siteUnit })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (runners.length && !form.runnerId) setForm(f => ({ ...f, runnerId: String(runners[0].id) }))
  }, [runners]) // eslint-disable-line react-hooks/exhaustive-deps

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); setError('') }

  async function handleSubmit(e) {
    e.preventDefault()
    const time = form.timeStr.trim()
    if (!/^\d+:\d{2}(:\d{2})?$/.test(time)) {
      setError('Time must be in H:MM:SS or MM:SS format (e.g. 1:26:01)')
      return
    }
    const timeSeconds = parseTimeStr(time)

    setSubmitting(true)
    try {
      await onSubmit({
        runnerId: form.runnerId,
        eventName: form.eventName.trim(),
        date: form.date,
        // DB keeps km with 2 decimals
        km: Math.round((parseFloat(form.km) / distIn(1, form.distUnit)) * 100) / 100,
        timeSeconds,
        link: form.link.trim() || null,
        ...(showStatus && { status: form.status }),
      })
      if (resetOnSuccess) setForm(f => ({ ...EMPTY, runnerId: f.runnerId, distUnit: f.distUnit }))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      {error && <div className="error-msg">{error}</div>}

      <div className={showStatus ? 'field-row' : undefined}>
        <div className="field">
          <label>Runner</label>
          <select value={form.runnerId} onChange={e => set('runnerId', e.target.value)} required>
            {runners.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        {showStatus && (
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        )}
      </div>

      <div className="field">
        <label>Event Name</label>
        <input type="text" maxLength={255} placeholder="e.g. Turkey Trot 2025"
          value={form.eventName} onChange={e => set('eventName', e.target.value)} required />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Date</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div className="field">
          <label>Distance</label>
          <div className="dist-input">
            <input type="number" step="0.01" min="0.1" max={form.distUnit === 'mi' ? 310 : 500}
              placeholder={form.distUnit === 'mi' ? '6.2' : '10.0'}
              value={form.km} onChange={e => set('km', e.target.value)} required />
            <select value={form.distUnit} onChange={e => set('distUnit', e.target.value)} aria-label="Distance unit">
              <option value="km">km</option>
              <option value="mi">mi</option>
            </select>
          </div>
          <div className="dist-quick">
            {QUICK.map(d => (
              <button key={d.label} type="button" className="filter-pill"
                onClick={() => set('km', String(+distIn(d.km, form.distUnit).toFixed(2)))}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="field">
        <label>Finish Time</label>
        <input type="text" placeholder="1:26:01"
          value={form.timeStr} onChange={e => set('timeStr', e.target.value)} required />
        <div className="hint">Format: H:MM:SS (e.g. 1:26:01 or 58:30)</div>
      </div>

      <div className="field">
        <label>
          Link{!requireLink && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> (optional)</span>}
        </label>
        <input type="url" pattern="https?://.*" placeholder="https://www.strava.com/activities/..."
          value={form.link} onChange={e => set('link', e.target.value)} required={requireLink} />
        <div className="hint">Strava, Garmin, or any race result link</div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? busyLabel : submitLabel}
        </button>
        {onCancel && <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}
