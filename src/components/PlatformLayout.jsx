import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Code2,
  Globe2,
  ImageIcon,
  LayoutDashboard,
  Menu,
  Moon,
  Radar,
  RefreshCw,
  ScanSearch,
  Settings,
  ShieldAlert,
  Sun,
  X,
} from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { resetGuestSession } from '../services/api'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Analysis', path: '/analysis', icon: ShieldAlert },
  { label: 'Scanner', path: '/scanner', icon: ScanSearch },
  { label: 'Media Lab', path: '/media-lab', icon: ImageIcon },
  { label: 'Threat Map', path: '/propagation', icon: Globe2 },
  { label: 'Community', path: '/community', icon: Radar },
  { label: 'Threat Intel', path: '/threat-intel', icon: ShieldAlert },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Developer', path: '/developer', icon: Code2 },
  { label: 'Settings', path: '/settings', icon: Settings },
]

function PlatformLayout() {
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const surfaceColor = theme === 'dark' ? '#030712' : '#f8fafc'
  const panelColor = theme === 'dark' ? 'rgba(7,15,30,0.82)' : 'rgba(255,255,255,0.92)'
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
      navigate('/dashboard')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: surfaceColor, color: textColor }}>
      <div className="hero-bg" />
      <div className="grid-dots" />

      <div style={{ display: 'grid', gridTemplateColumns: '292px minmax(0, 1fr)', minHeight: '100vh' }}>
        <aside
          className="platform-sidebar"
          style={{
            position: 'fixed',
            inset: 0,
            width: 292,
            padding: 22,
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
            zIndex: 40,
            background: theme === 'dark' ? 'rgba(3,7,18,0.96)' : 'rgba(248,250,252,0.98)',
          }}
        >
          <div
            style={{
              border: `1px solid ${borderColor}`,
              borderRadius: 28,
              background: panelColor,
              backdropFilter: 'blur(18px)',
              boxShadow: '0 24px 70px rgba(2,8,23,0.42)',
              padding: 20,
              display: 'grid',
              gap: 18,
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#7dd3fc', marginBottom: 10 }}>
                  Trustive AI
                </div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Defense Console</h1>
              </div>
              <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 22,
                background:
                  'radial-gradient(circle at 20% 20%, rgba(37,99,235,0.26), transparent 42%), linear-gradient(135deg, rgba(15,23,42,0.9), rgba(7,15,30,0.7))',
                border: '1px solid rgba(56,189,248,0.18)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Open Access Workspace</div>
              <div style={{ color: mutedColor, lineHeight: 1.6, fontSize: 14 }}>
                Launch scanning, analysis, media review, and intelligence pivots instantly with a free guest session.
              </div>
            </div>

            <nav style={{ display: 'grid', gap: 10 }}>
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: 18,
                      textDecoration: 'none',
                      color: isActive ? '#fff' : textColor,
                      background: isActive ? 'linear-gradient(135deg, #2563eb, #0ea5e9)' : 'transparent',
                      border: isActive ? '1px solid rgba(56,189,248,0.35)' : `1px solid ${borderColor}`,
                      boxShadow: isActive ? '0 18px 40px rgba(14,165,233,0.22)' : 'none',
                      fontWeight: 700,
                    })}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>

            <div style={{ marginTop: 'auto', display: 'grid', gap: 12 }}>
              <button type="button" onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 16px', borderRadius: 999, border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, cursor: 'pointer', fontWeight: 700 }}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
              </button>

              <button
                type="button"
                onClick={startFreshSession}
                style={{
                  padding: '14px 16px',
                  borderRadius: 999,
                  border: '1px solid rgba(56,189,248,0.22)',
                  background: 'rgba(37,99,235,0.12)',
                  color: '#bae6fd',
                  cursor: resetting ? 'wait' : 'pointer',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <RefreshCw size={16} style={resetting ? { animation: 'spin 0.8s linear infinite' } : undefined} />
                <span>{resetting ? 'Refreshing...' : 'New guest session'}</span>
              </button>
            </div>
          </div>
        </aside>

        <div className="platform-sidebar-spacer" />

        <main style={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ padding: 20 }}>
            <header
              style={{
                border: `1px solid ${borderColor}`,
                borderRadius: 24,
                background: panelColor,
                backdropFilter: 'blur(18px)',
                boxShadow: '0 24px 70px rgba(2,8,23,0.24)',
                padding: 18,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation" style={{ width: 44, height: 44, borderRadius: 999, border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Menu size={18} />
                </button>
                <div>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.24em', color: '#7dd3fc', marginBottom: 6 }}>
                    Open Platform
                  </div>
                  <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>{pageTitle}</h2>
                </div>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 999, background: 'rgba(37,99,235,0.14)', border: '1px solid rgba(56,189,248,0.22)', color: '#bae6fd', fontWeight: 700 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: '#38bdf8', boxShadow: '0 0 18px rgba(56,189,248,0.8)' }} />
                Free access enabled
              </div>
            </header>

            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        .platform-sidebar { display: block; }
        .platform-sidebar-spacer { width: 292px; }
        @media (min-width: 1025px) { .platform-sidebar { transform: translateX(0) !important; } }
        @media (max-width: 1024px) { .platform-sidebar-spacer { display: none; } }
      `}</style>
    </div>
  )
}

export default PlatformLayout
