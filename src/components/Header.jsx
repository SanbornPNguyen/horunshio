import { Link, NavLink } from 'react-router-dom'
import ThemeSelector from './ThemeSelector.jsx'

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
              <ThemeSelector />
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
