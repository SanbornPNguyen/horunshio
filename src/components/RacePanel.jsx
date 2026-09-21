import { Link } from 'react-router-dom'
import { formatTime, formatPace, paceOf, fmtDist, getDelta, safeUrl, eventSlug } from '../lib/utils.js'
import { useUnit } from '../hooks/useUnit.js'


export default function RacePanel({ runs, selIdx, onClose, onNavigate }) {
  const unit = useUnit()
  if (selIdx === null || selIdx === undefined) return <div className="race-panel" />

  const run = runs[selIdx]
  if (!run) return <div className="race-panel" />

  const delta = getDelta(run, unit)
  const pace = paceOf(run, unit)
  const distStr = fmtDist(run.km, unit)

  return (
    <div className="race-panel show">
      <div>
        <div className="rp-name">{run.eventName}</div>
        <div className="rp-date">{run.displayDate} · {distStr}</div>
        <div className="rp-metrics">
          <div className="rp-m">
            <div className="rp-mv">{formatTime(run.secs)}</div>
            <div className="rp-ml">Time</div>
          </div>
          <div className="rp-m">
            <div className="rp-mv">{formatPace(pace)}</div>
            <div className="rp-ml">Pace /{unit}</div>
          </div>
          {delta && (
            <span className={`rp-delta ${delta.cls}`}>{delta.label}</span>
          )}
        </div>
        <div className="rp-links">
          {safeUrl(run.link) && (
            <a href={safeUrl(run.link)} target="_blank" rel="noopener noreferrer">View result ↗</a>
          )}
          <Link to={`/events/${eventSlug(run.eventName)}`}>Event leaderboard →</Link>
        </div>
      </div>
      <div className="rp-right">
        <button className="rp-close" onClick={onClose}>✕</button>
        <div className="rp-nav">
          <button className="rp-nb" disabled={selIdx === 0} onClick={() => onNavigate(selIdx - 1)}>←</button>
          <button className="rp-nb" disabled={selIdx === runs.length - 1} onClick={() => onNavigate(selIdx + 1)}>→</button>
        </div>
      </div>
    </div>
  )
}
