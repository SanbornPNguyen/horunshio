import { useEffect, useState } from 'react'
import { getRunners, getRuns } from '../lib/api.js'
import {
  processRuns, computeStats, predictTime, formatTime, formatPace, STD_DISTANCES, KMI,
} from '../lib/utils.js'
import Header from '../components/Header.jsx'

// Race whose performance predicts the fastest 10K — i.e. the best race,
// normalised for distance. Looks at the last 12 months of racing first.
function bestBase(runs, exponent) {
  if (!runs.length) return null
  const latest = runs[runs.length - 1].dateObj
  const cutoff = new Date(latest.getFullYear() - 1, latest.getMonth(), latest.getDate())
  const recent = runs.filter(r => r.dateObj >= cutoff)
  const pool = recent.length ? recent : runs
  return pool.reduce((best, r) =>
    predictTime(r.secs, r.km, 10, exponent) < predictTime(best.secs, best.km, 10, exponent) ? r : best)
}

export default function Predict() {
  const [runners, setRunners] = useState([])
  const [slug, setSlug] = useState('')
  const [runs, setRuns] = useState(null)
  const [baseId, setBaseId] = useState('auto')
  const [exponent, setExponent] = useState(1.06)
  const [unit, setUnit] = useState('km')
  const [custom, setCustom] = useState('')

  useEffect(() => {
    getRunners().then(list => {
      setRunners(list)
      if (list.length) setSlug(list[0].slug)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!slug) return
    let stale = false
    setRuns(null)
    setBaseId('auto')
    getRuns(slug).then(raw => { if (!stale) setRuns(processRuns(raw)) }).catch(() => setRuns([]))
    return () => { stale = true }
  }, [slug])

  const base = !runs ? null
    : baseId === 'auto' ? bestBase(runs, exponent)
    : runs.find(r => String(r.id) === baseId)
  const prs = runs ? computeStats(runs).prs : {}

  // Custom distance is typed in the selected unit
  const customKm = parseFloat(custom) > 0 ? (unit === 'mi' ? parseFloat(custom) / KMI : parseFloat(custom)) : null
  const targets = [
    ...STD_DISTANCES,
    ...(customKm ? [{ label: `${custom} ${unit}`, km: customKm, custom: true }] : []),
  ]

  const fmtDist = km => unit === 'mi' ? `${(km * KMI).toFixed(2)} mi` : `${+km.toFixed(2)} km`

  return (
    <>
      <Header />
      <main className="main">
        <div className="srow">
          <div>
            <h2 className="page-title">Race Predictor</h2>
            <div className="page-sub">Estimates finish times at other distances from a race you've run (Riegel formula).</div>
          </div>
          <div className="ugrp">
            <button className={`ubtn${unit === 'km' ? ' on' : ''}`} onClick={() => setUnit('km')}>km</button>
            <button className={`ubtn${unit === 'mi' ? ' on' : ''}`} onClick={() => setUnit('mi')}>mi</button>
          </div>
        </div>

        <div className="form-card pred-controls">
          <div className="field">
            <label>Runner</label>
            <select value={slug} onChange={e => setSlug(e.target.value)}>
              {runners.map(r => <option key={r.slug} value={r.slug}>{r.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Based on</label>
            <select value={baseId} onChange={e => setBaseId(e.target.value)} disabled={!runs?.length}>
              <option value="auto">Best recent race (auto)</option>
              {[...(runs || [])].reverse().map(r => (
                <option key={r.id} value={r.id}>{r.eventName} · {formatTime(r.secs)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Endurance factor: {exponent.toFixed(2)}</label>
            <input type="range" min="1.01" max="1.15" step="0.01" value={exponent}
              onChange={e => setExponent(parseFloat(e.target.value))} style={{ padding: 0 }} />
            <div className="hint">1.06 is standard. Lower if you hold pace well over long distances, higher if you fade.</div>
          </div>
          <div className="field">
            <label>Custom distance ({unit})</label>
            <input type="number" min="0.1" step="0.1" placeholder={unit === 'mi' ? 'e.g. 4' : 'e.g. 8'}
              value={custom} onChange={e => setCustom(e.target.value)} />
          </div>
        </div>

        {!runs && slug && <div className="loading">Loading…</div>}
        {runs?.length === 0 && <div className="empty-state"><p>No races yet for this runner.</p></div>}

        {base && (
          <>
            <p className="pred-base">
              Based on <strong>{base.eventName}</strong> ({base.displayDate}): {fmtDist(base.km)} in {formatTime(base.secs)}
            </p>
            <div className="pred-grid">
              {targets.map(t => {
                const secs = predictTime(base.secs, base.km, t.km, exponent)
                const pace = unit === 'mi' ? secs / (t.km * KMI) : secs / t.km
                const pr = !t.custom && prs[t.label]
                const diff = pr ? secs - pr.secs : null
                const far = Math.max(t.km / base.km, base.km / t.km) > 4
                return (
                  <div key={t.label} className={`pr-card${t.custom ? ' pred-custom' : ''}`}>
                    <div className="pr-card-dist">{t.label}</div>
                    <div className="pr-card-time">{formatTime(secs)}</div>
                    <div className="pr-card-pace">{formatPace(pace)} <span>/{unit}</span></div>
                    {pr && (
                      <div className="pr-card-event">
                        PR {formatTime(pr.secs)}
                        {Math.abs(diff) >= 5 && (
                          <span className={`pred-diff ${diff < 0 ? 'faster' : 'slower'}`}>
                            {diff < 0 ? `${formatTime(-diff)} faster` : `${formatTime(diff)} slower`}
                          </span>
                        )}
                      </div>
                    )}
                    {far && <div className="pr-card-date">Rough — far from the base distance</div>}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </>
  )
}
