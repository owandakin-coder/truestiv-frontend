import { useNavigate, useParams } from 'react-router-dom'
import { ScanSearch, ShieldAlert } from 'lucide-react'

import Analysis from './Analysis'
import Scanner from './Scanner'
import PortalHero from '../components/PortalHero'

const investigationTabs = [
  {
    id: 'analysis',
    label: 'Message Analysis',
    icon: ShieldAlert,
    titleMain: 'Message Analysis',
    copy: 'Email, SMS, and chats in one unified workspace.',
  },
  {
    id: 'scanner',
    label: 'Scanner',
    icon: ScanSearch,
    titleMain: 'Public Scanner',
    copy: 'Inspect suspicious links and obvious phishing patterns.',
  },
]

export default function InvestigationCenter() {
  const { mode = 'scanner' } = useParams()
  const navigate = useNavigate()

  const activeTab = investigationTabs.find((item) => item.id === mode) || investigationTabs[1]

  return (
    <section className="intel-shell zone-investigation">
      <PortalHero
        kicker="Threat Analysis Hub"
        title={activeTab.titleMain}
        copy={activeTab.copy}
        className="investigation-shell-hero portal-hero-left fade-in"
      />

      <div
        className="investigation-tab-row"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px', paddingBottom: '0' }}
      >
        {investigationTabs.map((tab) => {
          const Icon = tab.icon
          const active = tab.id === activeTab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(`/investigation-center/${tab.id}`)}
              className={`investigation-lane-button ${active ? 'is-active' : ''}`}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid var(--portal-blue, #38bdf8)' : '2px solid transparent',
                borderRadius: 0,
                padding: '8px 16px',
                marginBottom: '-1px',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <section className="fade-in-delay-2" style={{ position: 'relative', zIndex: 1 }}>
        {activeTab.id === 'analysis' && <Analysis embedded />}
        {activeTab.id === 'scanner' && <Scanner embedded />}
      </section>
    </section>
  )
}
