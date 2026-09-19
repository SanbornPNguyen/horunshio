import { formatPace, KMI } from '../lib/utils.js'

const FORM = {
  improving: { cls: 'form-improving', icon: '↑', label: 'Improving' },
  declining: { cls: 'form-declining', icon: '↓', label: 'Declining' },
  steady:    { cls: 'form-steady',    icon: '→', label: 'Steady'    },
}

export default function StatsHeader({ stats, unit = 'km' }) {
  const { count, totKm, totH, totM, avgPKm, recentForm } = stats
  const form = recentForm ? FORM[recentForm] : null

  const dist = unit === 'mi' ? totKm * KMI : totKm
  const distDisplay = dist >= 1000 ? `${(dist / 1000).toFixed(1)}k` : dist.toFixed(1)
  const avgPace = unit === 'mi' ? avgPKm / KMI : avgPKm

  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-val">{count}</div>
        <div className="stat-lbl">Races</div>
      </div>
      <div className="stat-card">
        <div className="stat-val">{distDisplay}<em>{unit}</em></div>
        <div className="stat-lbl">Distance</div>
      </div>
      <div className="stat-card">
        <div className="stat-val">{totH}<em>h {totM}m</em></div>
        <div className="stat-lbl">On Feet</div>
      </div>
      <div className="stat-card">
        <div className="stat-val">{formatPace(avgPace)}<em>/{unit}</em></div>
        <div className="stat-lbl">Avg Pace</div>
      </div>
      {form && (
        <div className={`stat-card stat-form ${form.cls}`}>
          <div className="stat-val">{form.icon}</div>
          <div className="stat-lbl">{form.label}</div>
        </div>
      )}
    </div>
  )
}
