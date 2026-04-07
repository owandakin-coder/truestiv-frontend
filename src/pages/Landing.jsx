import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Globe, Image, ScanSearch, Shield, Waves } from 'lucide-react'
import { ensureGuestSession } from '../services/api'

const features = [
  { icon: Shield, title: 'AI message defense', copy: 'Analyze email, SMS, and WhatsApp content with instant verdicts and threat context.' },
  { icon: ScanSearch, title: 'Live scanner console', copy: 'Pivot across URL, IP, hash, and media artifacts from one workspace.' },
  { icon: Globe, title: 'Threat visibility', copy: 'Blend community intelligence, geo pivots, and source-aware enrichment in one flow.' },
  { icon: Image, title: 'Media forensics', copy: 'Run OCR, object hints, and deepfake scoring in the same analyst surface.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const stats = useMemo(
    () => [
      { value: 'Open', label: 'Access Model' },
      { value: 'Free', label: 'Registration Barrier' },
      { value: '6h', label: 'Feed Refresh' },
      { value: '1 Hub', label: 'Unified Workspace' },
    ],
    []
  )

  const enterWorkspace = async () => {
    await ensureGuestSession()
    navigate('/analysis')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 78% 20%, rgba(37,99,235,0.34), transparent 20%), radial-gradient(circle at 80% 30%, rgba(14,165,233,0.22), transparent 28%), radial-gradient(circle at 24% 18%, rgba(8,47,73,0.58), transparent 26%), linear-gradient(180deg, #071120 0%, #030712 100%)',
        color: '#eff6ff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="grid-dots" style={{ position: 'absolute', inset: 0, opacity: 0.6 }} />

      <div
        style={{
          position: 'absolute',
          right: -180,
          top: -120,
          width: 760,
          height: 760,
          borderRadius: '50%',
          border: '1px solid rgba(56,189,248,0.08)',
          boxShadow:
            '0 0 0 70px rgba(14,165,233,0.03), 0 0 0 140px rgba(37,99,235,0.03), 0 0 0 210px rgba(14,165,233,0.02)',
          pointerEvents: 'none',
        }}
      />

      <nav
        className="landing-topbar"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '22px 36px',
          background: 'rgba(3,7,18,0.72)',
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(148,163,184,0.12)',
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
            <div style={{ fontSize: 16, fontWeight: 900 }}>Blue Defense Platform</div>
          </div>
        </div>

        <div className="landing-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/login')}>Open Access</button>
          <button className="btn btn-primary" onClick={enterWorkspace}>Launch Workspace</button>
        </div>
      </nav>

      <section
        className="landing-hero-grid"
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          gap: 32,
          alignItems: 'center',
          padding: '72px 36px 44px',
          maxWidth: 1360,
          margin: '0 auto',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              borderRadius: 999,
              background: 'rgba(37,99,235,0.12)',
              border: '1px solid rgba(56,189,248,0.22)',
              color: '#bae6fd',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 22,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#38bdf8', boxShadow: '0 0 16px rgba(56,189,248,0.9)' }} />
            Public Cyber Defense Workspace
          </div>

          <h1 style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)', lineHeight: 1, fontWeight: 900, marginBottom: 20 }}>
            Comprehensive protection.
            <br />
            <span className="gradient-text">Blue dark. Open by default.</span>
          </h1>

          <p style={{ maxWidth: 620, fontSize: 17, lineHeight: 1.8, color: 'rgba(191,219,254,0.78)', marginBottom: 34 }}>
            Trustive AI is now built for instant use. No signup wall, no pricing gate, no friction.
            Open the workspace and start analyzing messages, scanning infrastructure, reviewing media,
            and pulling community intelligence right away.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 38 }}>
            <button className="btn btn-primary" onClick={enterWorkspace} style={{ padding: '15px 28px', fontSize: 15 }}>
              Launch Free Workspace <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/analysis')} style={{ padding: '15px 28px', fontSize: 15 }}>
              Explore Analysis
            </button>
          </div>

          <div className="landing-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            {stats.map((item) => (
              <div key={item.label} className="card" style={{ padding: 18 }}>
                <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>{item.value}</div>
                <div style={{ color: 'rgba(191,219,254,0.62)', fontSize: 13 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: '9% 10% auto auto',
              width: 96,
              height: 96,
              borderRadius: 24,
              background: 'linear-gradient(135deg, rgba(37,99,235,0.22), rgba(14,165,233,0.18))',
              border: '1px solid rgba(125,211,252,0.24)',
              backdropFilter: 'blur(18px)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 24px 50px rgba(2,8,23,0.36)',
            }}
          >
            <Shield size={30} color="#7dd3fc" />
          </div>

          <div className="card" style={{ padding: 22, borderRadius: 30, boxShadow: '0 34px 80px rgba(2,8,23,0.46)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#7dd3fc', marginBottom: 6 }}>Mission Control</div>
                <h3 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Trustive Defense Center</h3>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 999, background: 'rgba(16,185,129,0.14)', color: '#6ee7b7', fontWeight: 800 }}>
                Live
              </div>
            </div>

            <div className="landing-control-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="card" style={{ padding: 18, background: 'rgba(9,17,31,0.9)' }}>
                <div style={{ color: '#93c5fd', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 8 }}>Verdict Split</div>
                <div style={{ fontSize: 36, fontWeight: 900 }}>78%</div>
                <div style={{ color: 'rgba(191,219,254,0.66)', marginTop: 8 }}>Malicious and suspicious detections this cycle.</div>
              </div>
              <div className="card" style={{ padding: 18, background: 'rgba(9,17,31,0.9)' }}>
                <div style={{ color: '#93c5fd', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 8 }}>Active Pivots</div>
                <div style={{ fontSize: 36, fontWeight: 900 }}>12</div>
                <div style={{ color: 'rgba(191,219,254,0.66)', marginTop: 8 }}>Scanner, media, geo, and community pivots ready.</div>
              </div>
            </div>

            <div className="card" style={{ padding: 18, background: 'rgba(9,17,31,0.9)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Activity size={18} color="#38bdf8" />
                <span style={{ fontWeight: 800 }}>Threat activity curve</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, alignItems: 'end', minHeight: 170 }}>
                {[42, 68, 58, 94, 72, 106, 88].map((height, index) => (
                  <div key={index} style={{ display: 'grid', gap: 8 }}>
                    <div
                      style={{
                        height,
                        borderRadius: 20,
                        background: 'linear-gradient(180deg, rgba(14,165,233,0.95), rgba(29,78,216,0.62))',
                        boxShadow: '0 16px 28px rgba(14,165,233,0.12)',
                      }}
                    />
                    <div style={{ textAlign: 'center', color: 'rgba(191,219,254,0.52)', fontSize: 12 }}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-mini-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
              {[
                { icon: Radar, label: 'Live analysis', copy: 'Open' },
                { icon: Sparkles, label: 'Media review', copy: 'Ready' },
                { icon: Globe, label: 'Intel feeds', copy: 'Synced' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="card" style={{ padding: 16, background: 'rgba(9,17,31,0.9)' }}>
                    <Icon size={18} color="#7dd3fc" />
                    <div style={{ fontWeight: 800, marginTop: 12, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ color: 'rgba(191,219,254,0.62)', fontSize: 13 }}>{item.copy}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1360, margin: '0 auto', padding: '0 36px 72px' }}>
        <div className="landing-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18 }}>
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article key={feature.title} className="card" style={{ padding: 24 }}>
                <div style={{ width: 54, height: 54, borderRadius: 18, background: 'rgba(37,99,235,0.16)', border: '1px solid rgba(56,189,248,0.18)', display: 'grid', placeItems: 'center', marginBottom: 18 }}>
                  <Icon size={22} color="#7dd3fc" />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>{feature.title}</h3>
                <p style={{ color: 'rgba(191,219,254,0.72)', lineHeight: 1.7 }}>{feature.copy}</p>
              </article>
            )
          })}
        </div>
      </section>

      <style>{`
        @media (max-width: 1120px) {
          .landing-topbar {
            padding: 18px 20px !important;
          }

          .landing-hero-grid,
          .landing-feature-grid {
            grid-template-columns: 1fr !important;
          }

          .landing-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 820px) {
          .landing-topbar {
            align-items: stretch !important;
            gap: 14px !important;
          }

          .landing-topbar-actions {
            width: 100%;
            justify-content: space-between;
          }

          .landing-control-grid,
          .landing-mini-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .landing-stats-grid,
          .landing-feature-grid {
            grid-template-columns: 1fr !important;
          }

          .landing-topbar-actions {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  )
}
