import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllRuns } from '../lib/api.js'
import { formatTime } from '../lib/utils.js'
import { processAll, groupEvents } from '../lib/events.js'
import Header from '../components/Header.jsx'

export default function Events() {
  const navigate = useNavigate()
  const [events, setEvents] = useState(null)
  const [search, setSearch] = useState('')
  const [groupOnly, setGroupOnly] = useState(false)

  useEffect(() => {
    getAllRuns().then(raw => setEvents(groupEvents(processAll(raw)))).catch(err => {
      console.error(err)
      setEvents([])
    })
  }, [])

  const shown = (events || []).filter(e =>
    (!groupOnly || e.runners > 1) && e.name.toLowerCase().includes(search.toLowerCase().trim()))

  return (
    <>
      <Header />
      <main className="main">
        <div className="log-header">
          <div className="srow" style={{ marginBottom: 0 }}>
            <span className="stitle">Events</span>
            <button className={`pbtn${groupOnly ? ' on' : ''}`} onClick={() => setGroupOnly(g => !g)}>
              Group races only
            </button>
          </div>
          <input className="search-input" placeholder="Search events…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {!events && <div className="loading">Loading…</div>}
        {events && shown.length === 0 && <div className="empty-state"><p>No events found.</p></div>}

        {shown.length > 0 && (
          <div className="tbl-wrap always">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th className="r">Runners</th>
                  <th>Fastest</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(e => (
                  <tr key={e.slug} onClick={() => navigate(`/events/${e.slug}`)}>
                    <td><span className="ename">{e.name}</span></td>
                    <td className="muted">{e.date.toLocaleDateString('en-US')}</td>
                    <td className="r mono">{e.runners}</td>
                    <td>
                      {e.winner.runnerName}{' '}
                      <span className="muted mono" style={{ fontSize: '12px' }}>{formatTime(e.winner.secs)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
