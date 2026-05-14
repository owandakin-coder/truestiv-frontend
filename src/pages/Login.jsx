import { useNavigate } from 'react-router-dom'
import { ArrowRight, Globe, Hash, Link2, Radio, Shield, Sparkles } from 'lucide-react'
import { prewarmGuestSession } from '../services/api'

const FEATURES = [
  { icon: Link2,  title: 'Threat Scanner',    copy: 'URL, IP, hash, and domain triage from one AI console' },
  { icon: Shield, title: 'Message Analysis',  copy: 'AI verdicts, IOC extraction, and enrichment pivots' },
  { icon: Globe,  title: 'Geo Threat Map',    copy: 'Live propagation visualization across global infrastructure' },
  { icon: Radio,  title: 'Lookup Center',     copy: 'Deep IP, domain, and email-header pivot workspace' },
  { icon: Hash,   title: 'Threat Intel Hub',  copy: 'Structured briefs, trending IOCs, and community signals' },
  { icon: Sparkles, title: 'Campaign Clusters', copy: 'Attack cluster correlation with timeline and graph view' },
]

export default function Login() {
  const navigate = useNavigate()

  const enterWorkspace = () => {
    prewarmGuestSession()
    navigate('/investigation-center/scanner')
  }

  return (
    <div className="login-root">
      <div className="grid-dots login-dots" />

      <div className="login-inner">
        {/* Left — hero */}
        <div className="login-hero">
          <div className="login-brand">
            <div className="login-brand-mark">
              <Shield size={20} color="#3b82f6" />
            </div>
            <div>
              <div className="login-brand-label">Trustive AI</div>
              <div className="login-brand-sub">Open Access Platform</div>
            </div>
          </div>

          <div className="login-kicker">
            <span className="login-kicker-dot" />
            <span>NO REGISTRATION REQUIRED</span>
          </div>

          <h1 className="login-title">
            Enter the platform<br />
            <span className="login-title-accent">without an account.</span>
          </h1>

          <p className="login-copy">
            Trustive creates a free guest workspace automatically. Launch the scanner,
            analyze threats, and inspect intelligence feeds — instantly.
          </p>

          <ul className="login-checklist">
            {[
              'Guest token created automatically on entry',
              'Full scanner and analysis workflows available',
              'No signup wall, no pricing gate',
            ].map((line) => (
              <li key={line} className="login-check-item">
                <span className="login-check-icon">✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <button className="login-cta" onClick={enterWorkspace} type="button">
            <span>Launch free workspace</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Right — feature grid */}
        <div className="login-features">
          <div className="login-features-hd">
            <span className="login-features-label">Platform capabilities</span>
          </div>
          <div className="login-feature-grid">
            {FEATURES.map(({ icon: FeatureIcon, title, copy }) => (
              <div key={title} className="login-feature-card">
                <div className="login-feature-icon">
                  <FeatureIcon size={16} />
                </div>
                <div>
                  <div className="login-feature-title">{title}</div>
                  <div className="login-feature-copy">{copy}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
