import { formatTime, formatPace, getDelta } from '../lib/utils.js'

export default function RacePanel({ runs, selIdx, onClose, onNavigate }) {
  if (selIdx === null || selIdx === undefined) return <div className="race-panel" />

  const run = runs[selIdx]
  if (!run) return <div className="race-panel" />

  const delta = getDelta(run)

  return (
    <div className="race-panel show">
      <div>
        <div className="rp-name">{run.eventName}</div>
        <div className="rp-date">{run.displayDate} · {run.km}km</div>
        <div className="rp-metrics">
          <div className="rp-m">
            <div className="rp-mv">{formatTime(run.secs)}</div>
            <div className="rp-ml">Time</div>
          </div>
          <div className="rp-m">
            <div className="rp-mv">{formatPace(run.paceKm)}</div>
            <div className="rp-ml">min/km</div>
          </div>
          <div className="rp-m">
            <div className="rp-mv">{formatPace(run.paceMi)}</div>
            <div className="rp-ml">min/mi</div>
          </div>
          {delta && (
            <span className={`rp-delta ${delta.cls}`}>{delta.label}</span>
          )}
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
