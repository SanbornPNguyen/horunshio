import { useState } from 'react'
import { formatTime, formatPace, getDelta } from '../lib/utils.js'

function Highlight({ text, query }) {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-mark">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function RaceTable({ runs, selIdx, onSelect, unit = 'km' }) {
  const [sortCol, setSortCol] = useState('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [search, setSearch] = useState('')

  function handleSort(col) {
    if (sortCol === col) setSortAsc(a => !a)
    else { setSortCol(col); setSortAsc(col === 'eventName' || col === 'date') }
  }

  const sorted = [...runs].sort((a, b) => {
    let va = sortCol === 'date' ? a.dateObj : a[sortCol]
    let vb = sortCol === 'date' ? b.dateObj : b[sortCol]
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase() }
    if (va < vb) return sortAsc ? -1 : 1
    if (va > vb) return sortAsc ? 1 : -1
    return 0
  })

  const displayed = search.trim()
    ? sorted.filter(r => r.eventName.toLowerCase().includes(search.toLowerCase()))
    : sorted

  function arrow(col) {
    if (sortCol !== col) return '↕'
    return sortAsc ? '↑' : '↓'
  }

  const paceCol = unit === 'mi' ? 'paceMi' : 'paceKm'

  return (
    <>
      <div className="log-header">
        <div className="srow" style={{ marginBottom: 0 }}>
          <span className="stitle">Race Log</span>
          <span style={{ fontSize: '12px', color: 'var(--ink3)' }}>
            {displayed.length}{displayed.length !== runs.length ? ` of ${runs.length}` : ''} races
            {sortCol !== 'date' && ' · click header to sort'}
          </span>
        </div>
        <input
          className="search-input"
          placeholder="Search races…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              {[
                { col: 'eventName', label: 'Event',           right: false },
                { col: 'date',      label: 'Date',            right: false },
                { col: 'km',        label: 'Dist',            right: false },
                { col: 'secs',      label: 'Time',            right: true  },
                { col: paceCol,     label: `Pace /${unit}`,   right: true  },
              ].map(({ col, label, right }) => (
                <th
                  key={col}
                  className={`${right ? 'r' : ''}${sortCol === col ? ' sorted' : ''}`}
                  onClick={() => handleSort(col)}
                >
                  {label} <span className="sa">{arrow(col)}</span>
                </th>
              ))}
              <th className="r">vs Prev Same Dist</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((run, i) => {
              const idx = runs.indexOf(run)
              const delta = getDelta(run, unit)
              const pace = unit === 'mi' ? run.paceMi : run.paceKm
              return (
                <tr
                  key={run.id}
                  className={idx === selIdx ? 'active' : ''}
                  style={{ animationDelay: `${i * 20}ms` }}
                  onClick={() => onSelect(idx)}
                >
                  <td>
                    <span className="ename">
                      {run.isPR && <span className="pr-star" title="Personal Record">★</span>}
                      <Highlight text={run.eventName} query={search} />
                    </span>
                  </td>
                  <td className="muted">{run.displayDate}</td>
                  <td>
                    <span className={`dbadge ${run.distClass}`}>{run.distLabel}</span>
                  </td>
                  <td className="mono r">{formatTime(run.secs)}</td>
                  <td className="mono r">{formatPace(pace)}</td>
                  <td className="r">
                    {delta
                      ? <span className={`delta ${delta.cls}`}>{delta.label}</span>
                      : <span className="delta none">—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
