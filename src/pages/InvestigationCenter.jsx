import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileImage, ScanSearch, ShieldAlert } from 'lucide-react'

import { useTheme } from '../components/ThemeProvider'
import Analysis from './Analysis'
import MediaLab from './MediaLab'
import Scanner from './Scanner'

const investigationTabs = [
  {
    id: 'analysis',
    label: 'Message Analysis',
    icon: ShieldAlert,
    title: 'Analyze suspicious messages, then pivot into IOC context.',
    copy: 'Email, SMS, and WhatsApp verdicting stay in the same public workspace as scanner and media tooling.',
  },
  {
    id: 'scanner',
    label: 'Scanner',
    icon: ScanSearch,
    title: 'Run URL, IP, HASH, file, and bulk IOC scans from one pane.',
    copy: 'This is the primary public entry point for fast reputation checks and immediate promotion into the intelligence flow.',
  },
  {
    id: 'media-lab',
    label: 'Media Lab',
    icon: FileImage,
    title: 'Inspect suspicious images, video, and audio without leaving the investigation surface.',
    copy: 'Deepfake scoring, OCR extraction, and artifact pivots now live alongside message and IOC analysis.',
  },
]

function paletteFor(theme) {
  const dark = theme !== 'light'
  return {
    text: dark ? '#eff6ff' : '#0f172a',
    muted: dark ? 'rgba(191,219,254,0.72)' : '#475569',
    border: dark ? '1px solid rgba(148,163,184,0.14)' : '1px solid rgba(15,23,42,0.08)',
    card: dark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    blue: '#38bdf8',
  }
}

export default function InvestigationCenter() {
  const { theme } = useTheme()
  const palette = useMemo(() => paletteFor(theme), [theme])
  const { mode = 'scanner' } = useParams()
  const navigate = useNavigate()

  const activeTab = investigationTabs.find((item) => item.id === mode) || investigationTabs[1]

  return (
    <section className="intel-shell">
      <div className="intel-hero-card fade-in">
        <div className="intel-hero-content">
          <div className="intel-eyebrow">
            <span className="intel-eyebrow-dot" />
            Investigation Center
          </div>
          <h1 className="intel-title" style={{ fontSize: 30, lineHeight: 1.3 }}>
            {activeTab.title}
          </h1>
          <p className="intel-copy">
            {activeTab.copy}
          </p>
        </div>
      </div>

      <section className="intel-section-card fade-in-delay-1">
        <div className="investigation-tab-row">
          {investigationTabs.map((tab) => {
            const Icon = tab.icon
            const active = tab.id === activeTab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(`/investigation-center/${tab.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '14px 18px',
                  borderRadius: 18,
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: active ? '1px solid rgba(56,189,248,0.28)' : palette.border,
                  background: active ? 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(14,165,233,0.12))' : palette.card,
                  color: active ? palette.text : palette.muted,
                  boxShadow: active ? '0 16px 40px rgba(14,165,233,0.18)' : 'none',
                }}
              >
                <Icon size={16} color={active ? palette.blue : 'currentColor'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="fade-in-delay-2" style={{ position: 'relative', zIndex: 1 }}>
        {activeTab.id === 'analysis' ? <Analysis embedded /> : null}
        {activeTab.id === 'scanner' ? <Scanner embedded /> : null}
        {activeTab.id === 'media-lab' ? <MediaLab embedded /> : null}
      </section>
    </section>
  )
}
