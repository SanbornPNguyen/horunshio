import { formatTime, formatPace, getDelta } from '../lib/utils.js'

export default function MobileCards({ runs, selIdx, onSelect }) {
  const sorted = [...runs].sort((a, b) => b.dateObj - a.dateObj)

  return (
    <div className="log-cards">
      {sorted.map((run, i) => {
        const idx = runs.indexOf(run)
        const delta = getDelta(run)
        const isHalf = run.km > 15
        return (
          <div
            key={run.id}
            className={`lcard${idx === selIdx ? ' active' : ''}`}
            style={{ animationDelay: `${i * 30}ms` }}
            onClick={() => onSelect(idx)}
          >
            <div className="lcard-top">
              <div>
                <div className="lcard-name">{run.eventName}</div>
                <div className="lcard-date">{run.displayDate}</div>
              </div>
              <span className={`dbadge ${isHalf ? 'dhalf' : 'd10'}`}>{isHalf ? '21.1' : '10'}km</span>
            </div>
            <div className="lcard-body">
              <div>
                <div className="lm-l">Time</div>
                <div className="lm-v" style={{ fontSize: '12px' }}>{formatTime(run.secs)}</div>
              </div>
              <div>
                <div className="lm-l">Pace /km</div>
                <div className="lm-v">{formatPace(run.paceKm)}</div>
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
