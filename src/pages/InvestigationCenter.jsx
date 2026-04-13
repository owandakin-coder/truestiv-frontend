import { useNavigate, useParams } from 'react-router-dom'
import { FileImage, ScanSearch, ShieldAlert } from 'lucide-react'

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

export default function InvestigationCenter() {
  const { mode = 'scanner' } = useParams()
  const navigate = useNavigate()

  const activeTab = investigationTabs.find((item) => item.id === mode) || investigationTabs[1]

  return (
    <section className="intel-shell zone-investigation">
      <div className="intel-hero-card portal-hero portal-hero-single investigation-shell-hero fade-in">
        <div className="intel-hero-content portal-hero-main">
          <div className="intel-eyebrow">
            <span className="intel-eyebrow-dot" />
            Investigation Center
          </div>
          <h1 className="intel-title" style={{ fontSize: 30, lineHeight: 1.3 }}>
            {activeTab.title}
          </h1>
          <p className="intel-copy intel-reading-block">
            {activeTab.copy}
          </p>
        </div>
      </div>

      <section className="intel-section-card investigation-hub-panel fade-in-delay-1">
        <div className="investigation-tab-row">
          {investigationTabs.map((tab) => {
            const Icon = tab.icon
            const active = tab.id === activeTab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(`/investigation-center/${tab.id}`)}
                className={`investigation-lane-button ${active ? 'is-active' : ''}`}
              >
                <Icon size={16} />
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
