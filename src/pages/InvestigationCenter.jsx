import { useNavigate, useParams } from 'react-router-dom'
import { ScanSearch, ShieldAlert } from 'lucide-react'

import Analysis from './Analysis'
import Scanner from './Scanner'
import PortalHero from '../components/PortalHero'
import Seo from '../components/Seo'

const investigationTabs = [
  {
    id: 'analysis',
    label: 'Message Analysis',
    icon: ShieldAlert,
    titleMain: 'Message Analysis',
    copy: 'Review suspicious messages with verdicts, pivots, and actionable history.',
  },
  {
    id: 'scanner',
    label: 'Scanner',
    icon: ScanSearch,
    titleMain: 'Scanner',
    copy: 'Scan suspicious links, IPs, hashes, files, and bulk IOC lists from one workspace.',
  },
]

export default function InvestigationCenter() {
  const { mode = 'scanner' } = useParams()
  const navigate = useNavigate()

  const activeTab = investigationTabs.find((item) => item.id === mode) || investigationTabs[1]

  return (
    <section className="intel-shell zone-investigation">
      <Seo
        title={activeTab.id === 'analysis' ? 'Trustive AI | Message Analysis' : 'Trustive AI | Threat Scanner'}
        description={activeTab.copy}
        path={`/investigation-center/${activeTab.id}`}
      />

      <PortalHero
        kicker="Threat Analysis Hub"
        title={activeTab.titleMain}
        copy={activeTab.copy}
        className="investigation-shell-hero fade-in"
      />

      <section className="intel-section-card investigation-hub-panel investigation-workspace-shell fade-in-delay-1">
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
                <Icon size={14} />
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
