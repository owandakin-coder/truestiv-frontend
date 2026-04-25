import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu,
  Search,
  Shield,
  Eye,
  Globe2,
  MapPinned,
  Radar,
  ScanSearch,
  Activity,
  ShieldAlert,
  GitBranch,
  X,
} from 'lucide-react'

const navItems = [
  { label: 'Investigation Center', path: '/investigation-center', icon: ScanSearch },
  { label: 'Timeline', path: '/timeline', icon: Activity },
  { label: 'Threat Map', path: '/propagation', icon: Globe2 },
  { label: 'Lookup Center', path: '/lookup-center', icon: MapPinned },
  { label: 'Community', path: '/community', icon: Radar },
  { label: 'Threat Intel', path: '/threat-intel', icon: ShieldAlert },
  { label: 'Campaigns', path: '/campaign-clusters', icon: GitBranch },
]

function PlatformLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const activeSearchQuery = useMemo(() => {
    if (!location.pathname.startsWith('/search')) return ''
    return new URLSearchParams(location.search).get('q') || ''
  }, [location.pathname, location.search])

  const pageTitle = useMemo(() => {
    const active = navItems.find((item) => location.pathname.startsWith(item.path))
    if (active) return active.label
    if (location.pathname.startsWith('/search')) return 'Search'
    return 'Trustive AI'
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

  useEffect(() => {
    if (location.pathname.startsWith('/search')) {
      setQuery(activeSearchQuery)
      return
    }
    setQuery('')
  }, [activeSearchQuery, location.pathname])

  return (
    <div className="platform-shell">
      <div className="hero-bg" />
      <div className="grid-dots" />

      <nav className="platform-topbar">
        <div className="platform-topbar-brand">
          <div className="platform-topbar-brand-mark">
            <Shield size={18} color="#00E5FF" />
            <Eye size={12} color="#0A0F1A" className="platform-topbar-brand-eye" />
          </div>
          <div className="platform-topbar-brand-copy">
            <div className="platform-topbar-brand-label">TRUSTIVE AI</div>
            <div className="platform-topbar-brand-title">{pageTitle}</div>
          </div>
        </div>

        <button
          type="button"
          className="platform-mobile-toggle"
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className="platform-topbar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `platform-nav-link${isActive ? ' is-active' : ''}`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>

        <div className="platform-topbar-actions">
          <form onSubmit={submitSearch} className="platform-search">
            <input
              className="platform-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search IOC, hash, domain..."
            />
            <button
              type="submit"
              className="platform-search-button"
              aria-label="Search intelligence"
            >
              <Search size={16} />
            </button>
          </form>
        </div>
      </nav>

      <div
        className={`platform-mobile-menu ${mobileMenuOpen ? 'is-open' : ''}`}
      >
        <form onSubmit={submitSearch} className="platform-mobile-search">
          <input
            className="platform-mobile-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search IOC, hash, domain..."
          />
          <button
            type="submit"
            className="platform-mobile-search-button"
          >
            Search
          </button>
        </form>

        <div className="platform-mobile-nav-list">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={`mobile-${item.path}`}
                to={item.path}
                className="platform-mobile-nav-item"
                data-active={active ? 'true' : 'false'}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </div>

      <main className="platform-main">
        <Outlet />
      </main>

      <footer className="platform-footer">
        <div className="platform-footer-inner">
          <div className="platform-footer-brand">
            <span className="platform-footer-name">TRUSTIVE AI</span>
            <span className="platform-footer-copy">Threat scanning, history, and legal guidance in one cleaner workspace.</span>
          </div>
          <div className="platform-footer-links">
            <NavLink to="/privacy" className="platform-footer-link">Privacy Policy</NavLink>
            <NavLink to="/terms" className="platform-footer-link">Terms of Use</NavLink>
            <NavLink to="/disclaimer" className="platform-footer-link">Disclaimer</NavLink>
            <a href="mailto:contact@trustive.ai" className="platform-footer-link">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PlatformLayout
