import { Link, NavLink } from 'react-router-dom'
import ThemeSelector from './ThemeSelector.jsx'
import { useUnit, setUnit } from '../hooks/useUnit.js'

function UnitToggle() {
  const unit = useUnit()
  return (
    <div className="unit-toggle" role="group" aria-label="Distance units">
      {['km', 'mi'].map(u => (
        <button key={u} className={unit === u ? 'on' : ''} aria-pressed={unit === u} onClick={() => setUnit(u)}>
          {u}
        </button>
      ))}
    </div>
  )
}

// Pass children to replace the default nav (admin pages).
export default function Header({ children }) {
  return (
    <header className="hdr">
      <div className="hdr-in">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1 className="logo">Ho<span>Run</span>Shio</h1>
        </Link>
        <nav className="nav-links">
          {children ?? (
            <>
              <NavLink to="/events" className="nav-link">Events</NavLink>
              <NavLink to="/predict" className="nav-link">Predict</NavLink>
              <Link to="/submit" className="nav-link primary">Submit a Run</Link>
              <Link to="/admin" className="nav-link">Admin</Link>
              <UnitToggle />
              <ThemeSelector />
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
