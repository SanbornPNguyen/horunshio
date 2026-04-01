import { formatPace } from '../lib/utils.js'

export default function StatsHeader({ stats }) {
  const { count, totKm, totH, totM, avgPKm } = stats
  return (
    <>
      {/* Desktop */}
      <div className="hstats">
        <div>
          <div className="hstat-v">{count}</div>
          <div className="hstat-l">Races</div>
        </div>
        <div>
          <div className="hstat-v">{totKm.toFixed(1)}<em>km</em></div>
          <div className="hstat-l">Total dist</div>
        </div>
        <div>
          <div className="hstat-v">{totH}<em>h {totM}m</em></div>
          <div className="hstat-l">Time on feet</div>
        </div>
        <div>
          <div className="hstat-v">{formatPace(avgPKm)}<em>/km</em></div>
          <div className="hstat-l">Avg pace</div>
        </div>
      </div>

      {/* Mobile */}
      <div className="tiles">
        <div className="tile">
          <div className="tile-v">{count}</div>
          <div className="tile-l">Races</div>
        </div>
        <div className="tile">
          <div className="tile-v">{totKm.toFixed(1)}<em>km</em></div>
          <div className="tile-l">Total dist</div>
        </div>
        <div className="tile">
          <div className="tile-v">{totH}<em>h {totM}m</em></div>
          <div className="tile-l">Time on feet</div>
        </div>
        <div className="tile">
          <div className="tile-v">{formatPace(avgPKm)}<em>/km</em></div>
          <div className="tile-l">Avg pace</div>
        </div>
      </div>
    </>
  )
}
