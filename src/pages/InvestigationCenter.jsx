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

      <section className="intel-section-card investigation-hub-panel investigation-workspace-shell fade-in-delay-1">
        <div className="investigation-hub-topline">
          <div className="investigation-hub-copy">
            <span className="analysis-meta-label">Workspace</span>
            <p>Choose the fastest path and work from one unified pane.</p>
          </div>
          <div className="investigation-hub-tags">
            <span className="intel-tag-chip">Scanner first</span>
            <span className="intel-tag-chip">Actionable history only</span>
            <span className="intel-tag-chip">Public portal</span>
          </div>
        </div>

        <div className="investigation-tab-row investigation-tab-row-framed">
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

        <div className="investigation-workspace-body fade-in-delay-2" style={{ position: 'relative', zIndex: 1 }}>
          {activeTab.id === 'analysis' && <Analysis embedded />}
          {activeTab.id === 'scanner' && <Scanner embedded />}
        </div>
      </section>
    </section>
  )
}
