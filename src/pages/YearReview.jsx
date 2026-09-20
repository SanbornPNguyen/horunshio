import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRunners, getRuns } from '../lib/api.js'
import { processRuns, yearReview, formatTime, formatPace, eventSlug } from '../lib/utils.js'
import Header from '../components/Header.jsx'
import LockedPanel from '../components/LockedPanel.jsx'

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

function Change({ now, before, fmt = v => v }) {
  if (!before) return null
  const d = now - before
  if (Math.abs(d) < 0.05) return <div className="rv-change">same as last year</div>
  return <div className={`rv-change ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? '▲' : '▼'} {fmt(Math.abs(d))} vs last year</div>
}

export default function YearReview() {
  const { slug, year: yearParam } = useParams()
  const year = Number(yearParam)
  const [runner, setRunner] = useState(null)
  const [runs, setRuns] = useState(null)
  const [copied, setCopied] = useState(false)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    let stale = false
    setRuns(null)
    getRunners().then(list => { if (!stale) setRunner(list.find(r => r.slug === slug) || null) })
    getRuns(slug).then(raw => { if (!stale) setRuns(processRuns(raw)) }).catch(err => {
      if (stale) return
      if (err.message === 'Locked') setLocked(true)
      setRuns([])
    })
    return () => { stale = true }
  }, [slug])

  async function share() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: `${runner?.name}'s ${year} in running`, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!runs) return <><Header /><div className="loading">Loading…</div></>
  if (locked) return <><Header /><main className="main"><LockedPanel name={runner?.name} /></main></>

  const years = [...new Set(runs.map(r => r.year))].sort()
  const y = yearReview(runs, year)
  const prevYear = years.filter(v => v < year).pop()
  const nextYear = years.find(v => v > year)
  const maxMonth = Math.max(1, ...y.byMonth)

  if (!y.count) {
    return (
      <>
        <Header />
        <div className="empty-state">
          <p>No races in {yearParam} for this runner.</p>
          <p style={{ marginTop: '12px' }}><Link to={`/r/${slug}`} className="filter-link">← Back to runner</Link></p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="main">
        <div className="srow">
          <Link to={`/r/${slug}`} className="back-link" style={{ marginBottom: 0 }}>← {runner?.name ?? 'Runner'}</Link>
          <div className="ctrls">
            {prevYear && <Link to={`/r/${slug}/${prevYear}`} className="pbtn" style={{ textDecoration: 'none' }}>← {prevYear}</Link>}
            {nextYear && <Link to={`/r/${slug}/${nextYear}`} className="pbtn" style={{ textDecoration: 'none' }}>{nextYear} →</Link>}
            <button className="pbtn on" onClick={share}>{copied ? 'Link copied!' : 'Share'}</button>
          </div>
        </div>

        <div className="rv-hero">
          <div className="rv-year">{year}</div>
          <div className="rv-name">{runner?.name}'s year in running</div>
        </div>

        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-val">{y.count}</div>
            <div className="stat-lbl">Races</div>
            <Change now={y.count} before={y.prevCount} />
          </div>
          <div className="stat-card">
            <div className="stat-val">{y.km.toFixed(1)}<em>km</em></div>
            <div className="stat-lbl">Distance</div>
            <Change now={y.km} before={y.prevKm} fmt={v => `${v.toFixed(1)} km`} />
          </div>
          <div className="stat-card">
            <div className="stat-val">{Math.floor(y.secs / 3600)}<em>h {Math.floor((y.secs % 3600) / 60)}m</em></div>
            <div className="stat-lbl">On Feet</div>
          </div>
          <div className="stat-card">
            <div className="stat-val">{y.prsSet.length}</div>
            <div className="stat-lbl">PR{y.prsSet.length === 1 ? '' : 's'} Set</div>
          </div>
        </div>

        <div className="srow"><span className="stitle">Race Calendar</span></div>
        <div className="rv-months">
          {y.byMonth.map((n, i) => (
            <div key={i} className="rv-month" title={`${n} race${n !== 1 ? 's' : ''}`}>
              <div className="rv-bar-track">
                <div className="rv-bar" style={{ height: `${(n / maxMonth) * 100}%` }} />
              </div>
              <div className="rv-mlabel">{MONTHS[i]}</div>
            </div>
          ))}
        </div>

        <div className="pr-cards" style={{ marginBottom: '28px' }}>
          {y.fastest && (
            <div className="pr-card">
              <div className="pr-card-dist">⚡ Fastest pace</div>
              <div className="pr-card-time">{formatPace(y.fastest.paceKm)}<span className="rv-unit">/km</span></div>
              <div className="pr-card-event">{y.fastest.eventName}</div>
              <div className="pr-card-date">{y.fastest.distKey} · {formatTime(y.fastest.secs)}</div>
            </div>
          )}
          {y.mostImproved && (
            <div className="pr-card">
              <div className="pr-card-dist">📈 Biggest improvement</div>
              <div className="pr-card-time">−{formatPace(y.mostImproved.gain)}<span className="rv-unit">/km</span></div>
              <div className="pr-card-event">{y.mostImproved.run.eventName}</div>
              <div className="pr-card-date">vs {y.mostImproved.run.prev.eventName}</div>
            </div>
          )}
          {y.newDistances.length > 0 && (
            <div className="pr-card">
              <div className="pr-card-dist">🆕 First time at</div>
              <div className="pr-card-time">{y.newDistances.map(r => r.distKey).join(', ')}</div>
              <div className="pr-card-event">{y.newDistances[0].eventName}</div>
            </div>
          )}
        </div>

        <div className="srow"><span className="stitle">Races</span></div>
        <div className="tbl-wrap always">
          <table>
            <tbody>
              {y.runs.map(r => (
                <tr key={r.id} style={{ cursor: 'default' }}>
                  <td>
                    <Link to={`/events/${eventSlug(r.eventName)}`} className="ename runner-link">{r.eventName}</Link>
                    {r.wasPR && r.prev && <span className="pr-badge">PR</span>}
                  </td>
                  <td className="muted">{r.displayDate}</td>
                  <td><span className={`dbadge ${r.distClass}`}>{r.distKey}</span></td>
                  <td className="mono r">{formatTime(r.secs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}
