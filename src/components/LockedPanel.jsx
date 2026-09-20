// Easter egg: an admin can lock a runner's stats. The server withholds the
// races entirely, so the blurred shapes behind this are placeholders — there
// are no real numbers on the page to dig out.
export default function LockedPanel({ name }) {
  return (
    <div className="locked-wrap">
      <div className="locked-blur" aria-hidden="true">
        <div className="stats-bar">
          {['12', '148.6', '23', '9:14'].map((v, i) => (
            <div key={i} className="stat-card">
              <div className="stat-val">{v}</div>
              <div className="stat-lbl">••••••</div>
            </div>
          ))}
        </div>
        <div className="pr-cards">
          {[0, 1].map(i => (
            <div key={i} className="pr-card">
              <div className="pr-card-dist">★ ••••</div>
              <div className="pr-card-time">0:00:00</div>
              <div className="pr-card-pace">0:00 <span>/km</span></div>
              <div className="pr-card-event">•••••• ••••• ••••</div>
            </div>
          ))}
        </div>
        <div className="chart-card"><div className="chart-wrap" /></div>
      </div>

      <div className="locked-overlay">
        <div className="locked-card">
          <div className="locked-icon">🔒</div>
          <div className="locked-title">Locked</div>
          <p className="locked-text">
            {name ? `${name}'s` : 'These'} stats are private.
          </p>
          <div className="locked-sub">Contact management for access.</div>
        </div>
      </div>
    </div>
  )
}
