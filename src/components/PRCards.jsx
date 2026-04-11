import { formatTime, formatPace } from '../lib/utils.js'

const DIST_ORDER = ['5K', '10K', '15K', 'Half', 'Full']

export default function PRCards({ prs }) {
  const entries = DIST_ORDER.filter(d => prs[d])
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
                {formatPace(run.paceKm)} <span>/km</span>
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
