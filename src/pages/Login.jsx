import { useNavigate } from 'react-router-dom'
import { ArrowRight, Shield, Sparkles, Waves } from 'lucide-react'
import { prewarmGuestSession } from '../services/api'

export default function Login() {
  const navigate = useNavigate()

  const enterWorkspace = () => {
    prewarmGuestSession()
    navigate('/investigation-center/scanner')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 28,
        background:
          'radial-gradient(circle at 82% 20%, rgba(37,99,235,0.3), transparent 24%), radial-gradient(circle at 18% 18%, rgba(8,47,73,0.46), transparent 24%), linear-gradient(180deg, #071120 0%, #030712 100%)',
        color: '#eff6ff',
      }}
    >
      <div style={{ width: 'min(1080px, 100%)', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 28 }}>
        <section className="card" style={{ padding: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 34 }}>
            <div style={{ width: 50, height: 50, borderRadius: 16, background: 'linear-gradient(135deg, #2563eb, #0ea5e9)', display: 'grid', placeItems: 'center' }}>
              <Waves size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 12, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#7dd3fc' }}>Trustive AI</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>Open Access</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#7dd3fc', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 16 }}>
            No registration required
          </div>
          <h1 style={{ fontSize: 'clamp(2.6rem, 5vw, 4.4rem)', lineHeight: 1.02, fontWeight: 900, marginBottom: 18 }}>
            Enter the platform
            <br />
            <span className="gradient-text">without an account.</span>
          </h1>
          <p style={{ color: 'rgba(191,219,254,0.74)', lineHeight: 1.8, maxWidth: 560, marginBottom: 26 }}>
            Trustive now creates a free guest workspace automatically. Launch the scanner,
            run scans, analyze messages, review media, and inspect intelligence feeds instantly.
          </p>

          <div style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
            {[
              'Guest token is created automatically',
              'Analysis, scanner, and media workflows are immediately available',
              'No signup wall and no pricing gate',
            ].map((line) => (
              <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Shield size={16} color="#7dd3fc" />
                <span style={{ color: 'rgba(191,219,254,0.76)' }}>{line}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={enterWorkspace} style={{ padding: '16px 26px', fontSize: 15 }}>
            Launch free workspace
            <ArrowRight size={16} />
          </button>
        </section>

        <section className="card" style={{ padding: 32, display: 'grid', alignContent: 'space-between' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 999, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(56,189,248,0.18)', color: '#bae6fd', marginBottom: 20 }}>
              <Sparkles size={15} />
              Blue dark experience
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 14 }}>What changed</h2>
            <p style={{ color: 'rgba(191,219,254,0.72)', lineHeight: 1.8, marginBottom: 20 }}>
              The product now opens directly into a public workspace model. The interface was redesigned around a deeper blue palette with cinematic lighting, tighter chrome, and analyst-first flows.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {[
              ['Analysis', 'AI verdicts, IOC extraction, enrichment pivots'],
              ['Scanner', 'URL, IP, hash, and file triage from one console'],
              ['Media Lab', 'Deepfake, OCR, object hints, and artifact pivots'],
            ].map(([title, copy]) => (
              <div key={title} className="card" style={{ padding: 18, background: 'rgba(8,15,30,0.88)' }}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>
                <div style={{ color: 'rgba(191,219,254,0.68)', lineHeight: 1.6 }}>{copy}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
