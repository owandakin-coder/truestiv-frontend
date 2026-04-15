import { useNavigate, useParams } from 'react-router-dom'
import { FileImage, ScanSearch, ShieldAlert } from 'lucide-react'

import Analysis from './Analysis'
import MediaLab from './MediaLab'
import Scanner from './Scanner'
import PortalHero from '../components/PortalHero'

const investigationTabs = [
  {
    id: 'analysis',
    label: 'Message Analysis',
    icon: ShieldAlert,
    title: 'Analyze suspicious messages, then pivot into IOC context.',
    copy: 'Email, SMS, and WhatsApp verdicting in one workspace.',
  },
  {
    id: 'scanner',
    label: 'Scanner',
    icon: ScanSearch,
    title: 'Run URL, IP, HASH, file, and bulk IOC scans from one pane.',
    copy: 'Fast reputation checks and direct public intel pivots.',
  },
  {
    id: 'media-lab',
    label: 'Media Lab',
    icon: FileImage,
    title: 'Inspect suspicious images, video, and audio without leaving the investigation surface.',
    copy: 'Deepfake scoring, OCR extraction, and artifact pivots in one place.',
  },
]

export default function InvestigationCenter() {
  const { mode = 'scanner' } = useParams()
  const navigate = useNavigate()

  const activeTab = investigationTabs.find((item) => item.id === mode) || investigationTabs[1]

  return (
    <section className="intel-shell zone-investigation">
      <PortalHero
        kicker="Investigation Center"
        title={activeTab.title}
        copy={activeTab.copy}
        className="investigation-shell-hero fade-in"
        titleWide
      />

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
