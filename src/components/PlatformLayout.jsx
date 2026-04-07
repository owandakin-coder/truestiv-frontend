import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Code2,
  Globe2,
  ImageIcon,
  LayoutDashboard,
  Menu,
  Moon,
  Radar,
  ScanSearch,
  Settings,
  ShieldAlert,
  Sun,
  X,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

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
];

const sharedCardStyle = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 24,
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(18px)',
  boxShadow: '0 24px 70px rgba(0,0,0,0.28)',
};

function PlatformLayout() {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const surfaceColor = theme === 'dark' ? '#050507' : '#f8fafc';
  const panelColor =
    theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)';
  const borderColor =
    theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
  const textColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const mutedColor = theme === 'dark' ? 'rgba(226,232,240,0.72)' : '#475569';

  const pageTitle = useMemo(() => {
    const active = navItems.find((item) => location.pathname.startsWith(item.path));
    return active?.label || 'Trustive AI';
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: surfaceColor,
        color: textColor,
      }}
    >
      <div className="hero-bg" />
      <div className="grid-dots" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '290px minmax(0, 1fr)',
          minHeight: '100vh',
        }}
      >
        <aside
          style={{
            position: 'fixed',
            inset: 0,
            width: 290,
            padding: 24,
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
            zIndex: 40,
            background: theme === 'dark' ? 'rgba(5,5,7,0.94)' : 'rgba(248,250,252,0.96)',
          }}
          className="platform-sidebar"
        >
          <div
            style={{
              ...sharedCardStyle,
              background: panelColor,
              border: `1px solid ${borderColor}`,
              padding: 20,
              display: 'grid',
              gap: 18,
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: '#ff9a62',
                    marginBottom: 8,
                  }}
                >
                  Trustive AI
                </div>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Security Console</h1>
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  border: `1px solid ${borderColor}`,
                  background: 'transparent',
                  color: textColor,
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 20,
                background:
                  'linear-gradient(135deg, rgba(255,107,53,0.18), rgba(245,158,11,0.08))',
                border: '1px solid rgba(255,107,53,0.24)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Analyst Workspace</div>
              <div style={{ color: mutedColor, lineHeight: 1.6, fontSize: 14 }}>
                Monitor threats, run investigations, and pivot into media intelligence from one place.
              </div>
            </div>

            <nav style={{ display: 'grid', gap: 10 }}>
              {navItems.map((item) => {
                const Icon = item.icon;
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
                      background: isActive
                        ? 'linear-gradient(135deg, #ff6b35, #ff914d)'
                        : 'transparent',
                      border: isActive
                        ? '1px solid rgba(255,107,53,0.5)'
                        : `1px solid ${borderColor}`,
                      boxShadow: isActive ? '0 18px 40px rgba(255,107,53,0.28)' : 'none',
                      fontWeight: 700,
                    })}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div style={{ marginTop: 'auto', display: 'grid', gap: 12 }}>
              <button
                type="button"
                onClick={toggleTheme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '14px 16px',
                  borderRadius: 999,
                  border: `1px solid ${borderColor}`,
                  background: 'transparent',
                  color: textColor,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '14px 16px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,107,53,0.24)',
                  background: 'rgba(255,107,53,0.1)',
                  color: '#ffb089',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <div className="platform-sidebar-spacer" />

        <main style={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ padding: 20 }}>
            <header
              style={{
                ...sharedCardStyle,
                background: panelColor,
                border: `1px solid ${borderColor}`,
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
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open navigation"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    border: `1px solid ${borderColor}`,
                    background: 'transparent',
                    color: textColor,
                    cursor: 'pointer',
                  }}
                >
                  <Menu size={18} />
                </button>

                <div>
                  <div
                    style={{
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.24em',
                      color: '#ff9a62',
                      marginBottom: 6,
                    }}
                  >
                    Operations
                  </div>
                  <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{pageTitle}</h2>
                </div>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 999,
                  background: 'rgba(255,107,53,0.12)',
                  border: '1px solid rgba(255,107,53,0.24)',
                  color: '#ffb089',
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: '#ff6b35',
                    boxShadow: '0 0 18px rgba(255,107,53,0.8)',
                  }}
                />
                Threat visibility online
              </div>
            </header>

            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        .platform-sidebar {
          display: block;
        }

        .platform-sidebar-spacer {
          width: 290px;
        }

        @media (min-width: 1025px) {
          .platform-sidebar {
            transform: translateX(0) !important;
          }
        }

        @media (max-width: 1024px) {
          .platform-sidebar-spacer {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default PlatformLayout;
