import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu,
  Search,
  Globe2,
  MapPinned,
  Radar,
  ScanSearch,
  Activity,
  ShieldAlert,
  GitBranch,
  Waves,
  X,
} from 'lucide-react'
import { useTheme } from './ThemeProvider'

const navItems = [
  { label: 'Investigation Center', path: '/investigation-center', icon: ScanSearch },
  { label: 'Timeline', path: '/timeline', icon: Activity },
  { label: 'Threat Map', path: '/propagation', icon: Globe2 },
  { label: 'Lookup Center', path: '/lookup-center', icon: MapPinned },
  { label: 'Community', path: '/community', icon: Radar },
  { label: 'Threat Intel', path: '/threat-intel', icon: ShieldAlert },
  { label: 'Campaigns', path: '/campaign-clusters', icon: GitBranch },
  { label: 'Search', path: '/search', icon: Search },
]

function PlatformLayout() {
  const { theme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const surfaceColor = theme === 'dark' ? '#030712' : '#f8fafc'
  const panelColor = theme === 'dark' ? 'rgba(3,7,18,0.72)' : 'rgba(255,255,255,0.9)'
  const borderColor = theme === 'dark' ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)'
  const textColor = theme === 'dark' ? '#eff6ff' : '#0f172a'
  const mutedColor = theme === 'dark' ? 'rgba(191,219,254,0.72)' : '#475569'

  const pageTitle = useMemo(() => {
    const active = navItems.find((item) => location.pathname.startsWith(item.path))
    return active?.label || 'Trustive AI'
  }, [location.pathname])

  const submitSearch = (event) => {
    event.preventDefault()
    const normalized = query.trim()
    if (!normalized) return
    setMobileMenuOpen(false)
    navigate(`/search?q=${encodeURIComponent(normalized)}`)
  }

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div style={{ minHeight: '100vh', background: surfaceColor, color: textColor }}>
      <div className="hero-bg" />
      <div className="grid-dots" />

      <nav
        className="platform-topbar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          padding: '18px 32px',
          background: panelColor,
          borderBottom: `1px solid ${borderColor}`,
          backdropFilter: 'blur(18px)',
          boxShadow: '0 16px 40px rgba(2,8,23,0.18)',
        }}
      >
        <div className="platform-topbar-brand" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 16px 36px rgba(37,99,235,0.32)',
            }}
          >
            <Waves size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#7dd3fc' }}>Trustive AI</div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{pageTitle}</div>
          </div>
        </div>

        <button
          type="button"
          className="platform-mobile-toggle"
          onClick={() => setMobileMenuOpen((current) => !current)}
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 14,
            border: `1px solid ${borderColor}`,
            background: 'rgba(37,99,235,0.1)',
            color: '#dbeafe',
            cursor: 'pointer',
          }}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className="platform-topbar-nav" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 999,
                  textDecoration: 'none',
                  color: isActive ? '#fff' : textColor,
                  background: isActive ? 'linear-gradient(135deg, #2563eb, #0ea5e9)' : 'transparent',
                  border: isActive ? '1px solid rgba(56,189,248,0.35)' : `1px solid ${borderColor}`,
                  boxShadow: isActive ? '0 14px 32px rgba(14,165,233,0.18)' : 'none',
                  fontWeight: 700,
                  fontSize: 14,
                })}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>

        <div className="platform-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <form onSubmit={submitSearch} className="platform-search" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search IOC, hash, domain..."
              style={{
                width: 220,
                maxWidth: '100%',
                padding: '10px 14px',
                borderRadius: 999,
                border: `1px solid ${borderColor}`,
                background: 'rgba(15,23,42,0.58)',
                color: textColor,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 42,
                borderRadius: 999,
                border: `1px solid ${borderColor}`,
                background: 'rgba(37,99,235,0.12)',
                color: '#bae6fd',
                cursor: 'pointer',
              }}
              aria-label="Search intelligence"
            >
              <Search size={16} />
            </button>
          </form>
        </div>
      </nav>

      <div
        className={`platform-mobile-menu ${mobileMenuOpen ? 'is-open' : ''}`}
        style={{
          position: 'sticky',
          top: 79,
          zIndex: 19,
          display: mobileMenuOpen ? 'none' : 'none',
          margin: '0 12px',
          padding: '14px',
          borderRadius: 22,
          background: 'rgba(3,7,18,0.94)',
          border: `1px solid ${borderColor}`,
          backdropFilter: 'blur(18px)',
          boxShadow: '0 20px 50px rgba(2,8,23,0.28)',
        }}
      >
        <form onSubmit={submitSearch} className="platform-mobile-search" style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search IOC, hash, domain..."
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 16,
              border: `1px solid ${borderColor}`,
              background: 'rgba(15,23,42,0.82)',
              color: textColor,
              outline: 'none',
              fontSize: 15,
            }}
          />
          <button
            type="submit"
            style={{
              border: 'none',
              borderRadius: 16,
              padding: '12px 16px',
              fontWeight: 800,
              color: '#fff',
              background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
            }}
          >
            Search
          </button>
        </form>

        <div className="platform-mobile-nav-list" style={{ display: 'grid', gap: 10 }}>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={`mobile-${item.path}`}
                to={item.path}
                className="platform-mobile-nav-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 16,
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 15,
                  color: active ? '#fff' : textColor,
                  background: active ? 'linear-gradient(135deg, #2563eb, #0ea5e9)' : 'rgba(255,255,255,0.03)',
                  border: active ? '1px solid rgba(56,189,248,0.35)' : `1px solid ${borderColor}`,
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </div>

      <main className="platform-main" style={{ position: 'relative', zIndex: 1, padding: '28px 32px 40px' }}>
        <Outlet />
      </main>

      <style>{`
        @media (max-width: 1120px) {
          .platform-topbar {
            padding: 16px 20px;
            align-items: stretch;
          }

          .platform-topbar-nav {
            justify-content: flex-start;
          }

          .platform-search input {
            width: 180px !important;
          }
        }

        @media (max-width: 900px) {
          .platform-topbar {
            gap: 14px;
            flex-wrap: nowrap;
            align-items: center;
          }

          .platform-topbar-nav {
            display: none !important;
          }

          .platform-topbar-actions {
            margin-left: auto;
            width: auto;
            flex: 1;
            justify-content: flex-end;
          }

          .platform-main {
            padding: 18px 14px 28px !important;
          }

          .platform-search {
            display: none !important;
          }

          .platform-mobile-toggle {
            display: inline-flex !important;
            flex-shrink: 0;
          }

          .platform-mobile-menu.is-open {
            display: block !important;
          }
        }

        @media (max-width: 640px) {
          .platform-topbar-brand {
            min-width: 0;
          }

          .platform-topbar-brand > div:last-child div:first-child {
            font-size: 10px !important;
            letter-spacing: 0.16em !important;
          }

          .platform-topbar-brand > div:last-child div:last-child {
            font-size: 14px !important;
          }

          .platform-topbar-actions {
            width: auto;
          }

          .platform-topbar {
            padding: 14px 12px;
          }

          .platform-mobile-menu {
            margin: 0 10px;
            padding: 12px;
          }
        }
      `}</style>
    </div>
  )
}

export default PlatformLayout
