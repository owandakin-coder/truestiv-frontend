import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/analysis', label: 'Analysis' },
  { to: '/scanner', label: 'Scanner' },
  { to: '/media-lab', label: 'Media Lab' },
  { to: '/propagation', label: 'Geo Map' },
  { to: '/community', label: 'Community' },
  { to: '/threat-intel', label: 'Threat Intel' },
  { to: '/notifications', label: 'Alerts' },
  { to: '/admin', label: 'Admin' },
  { to: '/developer', label: 'Developer' },
  { to: '/settings', label: 'Settings' },
]

function NavigationLink({ to, label, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `platform-nav-link${isActive ? ' active' : ''}`
      }
    >
      {label}
    </NavLink>
  )
}

export default function PlatformLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="platform-shell">
      <aside className={`platform-sidebar${menuOpen ? ' open' : ''}`}>
        <div className="platform-brand">
          <div className="platform-brand-mark">T</div>
          <div>
            <h1>Trustive AI</h1>
            <p>Security operations workspace</p>
          </div>
        </div>

        <nav className="platform-nav">
          {navItems.map((item) => (
            <NavigationLink
              key={item.to}
              to={item.to}
              label={item.label}
              onNavigate={() => setMenuOpen(false)}
            />
          ))}
        </nav>
      </aside>

      <div className="platform-main">
        <header className="platform-header">
          <button
            type="button"
            className="platform-menu-button"
            onClick={() => setMenuOpen((value) => !value)}
          >
            Menu
          </button>
          <div>
            <p className="platform-eyebrow">Threat intelligence cockpit</p>
            <h2>Operate faster across analysis, intel, and response</h2>
          </div>
        </header>

        <main className="platform-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
