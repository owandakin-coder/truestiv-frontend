import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Globe2,
  ImageIcon,
  Moon,
  Radar,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  Sun,
  Waves,
} from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { resetGuestSession } from '../services/api'

const navItems = [
  { label: 'Analysis', path: '/analysis', icon: ShieldAlert },
  { label: 'Scanner', path: '/scanner', icon: ScanSearch },
  { label: 'Media Lab', path: '/media-lab', icon: ImageIcon },
  { label: 'Threat Map', path: '/propagation', icon: Globe2 },
  { label: 'Community', path: '/community', icon: Radar },
  { label: 'Threat Intel', path: '/threat-intel', icon: ShieldAlert },
]

function PlatformLayout() {
  const { theme, toggleTheme } = useTheme()
  const [resetting, setResetting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const surfaceColor = theme === 'dark' ? '#030712' : '#f8fafc'
  const panelColor = theme === 'dark' ? 'rgba(3,7,18,0.72)' : 'rgba(255,255,255,0.9)'
  const borderColor = theme === 'dark' ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)'
  const textColor = theme === 'dark' ? '#eff6ff' : '#0f172a'
  const mutedColor = theme === 'dark' ? 'rgba(191,219,254,0.72)' : '#475569'

  const pageTitle = useMemo(() => {
    const active = navItems.find((item) => location.pathname.startsWith(item.path))
    return active?.label || 'Trustive AI'
  }, [location.pathname])

  const startFreshSession = async () => {
    setResetting(true)
    try {
      await resetGuestSession()
      navigate('/analysis')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: surfaceColor, color: textColor }}>
      <div className="hero-bg" />
      <div className="grid-dots" />

      <nav
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 42,
              borderRadius: 999,
              border: `1px solid ${borderColor}`,
              background: 'transparent',
              color: textColor,
              cursor: 'pointer',
            }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            onClick={startFreshSession}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 16px',
              borderRadius: 999,
              border: '1px solid rgba(56,189,248,0.22)',
              background: 'rgba(37,99,235,0.12)',
              color: '#bae6fd',
              cursor: resetting ? 'wait' : 'pointer',
              fontWeight: 800,
            }}
          >
            <RefreshCw size={16} style={resetting ? { animation: 'spin 0.8s linear infinite' } : undefined} />
            <span>{resetting ? 'Refreshing...' : 'New guest session'}</span>
          </button>
        </div>
      </nav>

      <main style={{ position: 'relative', zIndex: 1, padding: '28px 32px 40px' }}>
        <Outlet />
      </main>

      <style>{`
        @media (max-width: 1120px) {
          nav {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  )
}

export default PlatformLayout
