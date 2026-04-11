import { formatTime, formatPace, getDelta } from '../lib/utils.js'

export default function MobileCards({ runs, selIdx, onSelect, unit = 'km' }) {
  const sorted = [...runs].sort((a, b) => b.dateObj - a.dateObj)

  return (
    <div className="log-cards">
      {sorted.map((run, i) => {
        const idx = runs.indexOf(run)
        const delta = getDelta(run, unit)
        const pace = unit === 'mi' ? run.paceMi : run.paceKm
        return (
          <div
            key={run.id}
            className={`lcard${idx === selIdx ? ' active' : ''}`}
            style={{ animationDelay: `${i * 30}ms` }}
            onClick={() => onSelect(idx)}
          >
            <div className="lcard-top">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="lcard-name">
                  {run.isPR && <span className="pr-star" title="Personal Record">★ </span>}
                  {run.eventName}
                </div>
                <div className="lcard-date">{run.displayDate} · {run.year}</div>
              </div>
              <span className={`dbadge ${run.distClass}`}>{run.distLabel}</span>
            </div>
            <div className="lcard-body">
              <div>
                <div className="lm-l">Time</div>
                <div className="lm-v" style={{ fontSize: '12px' }}>{formatTime(run.secs)}</div>
              </div>
              <div>
                <div className="lm-l">Pace /{unit}</div>
                <div className="lm-v">{formatPace(pace)}</div>
              </div>
              <div>
                <div className="lm-l">vs Prev</div>
                {delta
                  ? <span className={`delta ${delta.cls}`} style={{ fontSize: '11px', padding: '2px 7px' }}>{delta.label}</span>
                  : <span style={{ color: 'var(--ink3)', fontSize: '12px' }}>—</span>
                }
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
