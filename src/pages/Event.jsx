import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAllRuns } from '../lib/api.js'
import { formatTime, formatPace, paceOf, sortDistKeys, safeUrl } from '../lib/utils.js'
import { useUnit } from '../hooks/useUnit.js'

import { processAll } from '../lib/events.js'
import Header from '../components/Header.jsx'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Event() {
  const { event } = useParams()
  const [entries, setEntries] = useState(null)
  const unit = useUnit()

  useEffect(() => {
    setEntries(null)
    getAllRuns().then(raw => setEntries(processAll(raw).filter(r => r.slug === event))).catch(err => {
      console.error(err)
      setEntries([])
    })
  }, [event])

  if (!entries) return <><Header /><div className="loading">Loading…</div></>
  if (!entries.length) {
    return (
      <>
        <Header />
        <div className="empty-state">
          <p>Event not found.</p>
          <p style={{ marginTop: '12px' }}><Link to="/events" className="filter-link">← All events</Link></p>
        </div>
      </>
    )
  }

  // One event name can cover several distances (a 5K and a 10K) — rank each separately
  const groups = {}
  entries.forEach(r => { (groups[r.distKey] ??= []).push(r) })
  const distKeys = sortDistKeys(Object.keys(groups))
  const multiDate = new Set(entries.map(r => r.displayDate)).size > 1

  return (
    <>
      <Header />
      <main className="main">
        <Link to="/events" className="back-link">← All events</Link>
        <div className="srow">
          <div>
            <h2 className="page-title">{entries[0].eventName}</h2>
            <div className="page-sub">
              {multiDate ? 'Multiple dates' : entries[0].displayDate} · {entries.length} finisher{entries.length !== 1 && 's'}
            </div>
          </div>
        </div>

        {distKeys.map(dist => {
          const ranked = [...groups[dist]].sort((a, b) => a.secs - b.secs)
          const lead = ranked[0].secs
          return (
            <section key={dist} style={{ marginBottom: '28px' }}>
              {distKeys.length > 1 && <div className="stitle" style={{ marginBottom: '10px' }}>{dist}</div>}
              <div className="tbl-wrap always">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Runner</th>
                      {multiDate && <th>Date</th>}
                      <th className="r">Time</th>
                      <th className="r">Pace /{unit}</th>
                      <th className="r">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((r, i) => (
                      <tr key={r.id} style={{ cursor: 'default' }}>
                        <td className="mono">{MEDALS[i] || i + 1}</td>
                        <td>
                          <Link to={`/r/${r.runnerSlug}`} className="ename runner-link">{r.runnerName}</Link>
                          {r.wasPR && r.prev && <span className="pr-badge">PR</span>}
                          {safeUrl(r.link) && (
                            <a href={safeUrl(r.link)} target="_blank" rel="noopener noreferrer" className="result-link">result ↗</a>
                          )}
                        </td>
                        {multiDate && <td className="muted">{r.displayDate}</td>}
                        <td className="mono r">{formatTime(r.secs)}</td>
                        <td className="mono r">{formatPace(paceOf(r, unit))}</td>
                        <td className="mono r muted">{i === 0 ? '—' : `+${formatTime(r.secs - lead)}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </main>
    </>
  )
}
