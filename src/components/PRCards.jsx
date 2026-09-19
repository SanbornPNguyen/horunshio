import { formatTime, formatPace, sortDistKeys } from '../lib/utils.js'

export default function PRCards({ prs, unit = 'km' }) {
  const entries = sortDistKeys(Object.keys(prs))
  if (!entries.length) return null

  return (
    <div className="pr-section">
      <div className="srow" style={{ marginBottom: '12px' }}>
        <span className="stitle">Personal Records</span>
      </div>
      <div className="pr-cards">
        {entries.map(dist => {
          const run = prs[dist]
          return (
            <div key={dist} className="pr-card">
              <div className="pr-card-dist">★ {dist}</div>
              <div className="pr-card-time">{formatTime(run.secs)}</div>
              <div className="pr-card-pace">
                {formatPace(unit === 'mi' ? run.paceMi : run.paceKm)} <span>/{unit}</span>
              </div>
              <div className="pr-card-event" title={run.eventName}>
                {run.eventName}
              </div>
              <div className="pr-card-date">{run.displayDate}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
