import { useState } from 'react'
import { formatTime, formatPace, getDelta } from '../lib/utils.js'

export default function RaceTable({ runs, selIdx, onSelect }) {
  const [sortCol, setSortCol] = useState('date')
  const [sortAsc, setSortAsc] = useState(false)

  function handleSort(col) {
    if (sortCol === col) {
      setSortAsc(a => !a)
    } else {
      setSortCol(col)
      setSortAsc(col === 'name' || col === 'date')
    }
  }

  const sorted = [...runs].sort((a, b) => {
    let va = sortCol === 'date' ? a.dateObj : a[sortCol]
    let vb = sortCol === 'date' ? b.dateObj : b[sortCol]
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase() }
    if (va < vb) return sortAsc ? -1 : 1
    if (va > vb) return sortAsc ? 1 : -1
    return 0
  })

  function arrow(col) {
    if (sortCol !== col) return '↕'
    return sortAsc ? '↑' : '↓'
  }

  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            {[
              { col: 'name', label: 'Event', right: false },
              { col: 'date', label: 'Date', right: false },
              { col: 'km', label: 'Dist', right: false },
              { col: 'secs', label: 'Time', right: true },
              { col: 'paceKm', label: 'Pace /km', right: true },
              { col: 'paceMi', label: 'Pace /mi', right: true },
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
          {sorted.map((run, i) => {
            const idx = runs.indexOf(run)
            const delta = getDelta(run)
            const isHalf = run.km > 15
            return (
              <tr
                key={run.id}
                className={idx === selIdx ? 'active' : ''}
                style={{ animationDelay: `${i * 25}ms` }}
                onClick={() => onSelect(idx)}
              >
                <td className="ename">{run.eventName}</td>
                <td className="muted">{run.displayDate}</td>
                <td>
                  <span className={`dbadge ${isHalf ? 'dhalf' : 'd10'}`}>
                    {isHalf ? '21.1km' : '10km'}
                  </span>
                </td>
                <td className="mono r">{formatTime(run.secs)}</td>
                <td className="mono r">{formatPace(run.paceKm)}</td>
                <td className="mono r">{formatPace(run.paceMi)}</td>
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
  )
}
