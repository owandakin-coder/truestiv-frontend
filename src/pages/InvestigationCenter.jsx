import { useNavigate, useParams } from 'react-router-dom'
import { ScanSearch, ShieldAlert } from 'lucide-react'

import Analysis from './Analysis'
import Scanner from './Scanner'
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
    titleMain: 'Threat Scanner',
    copy: 'Scan suspicious links, IPs, hashes, files, and bulk IOC lists from one workspace.',
  },
]

export default function InvestigationCenter() {
  const { mode = 'scanner' } = useParams()
  const navigate = useNavigate()

  const activeTab = investigationTabs.find((item) => item.id === mode) || investigationTabs[1]

  return (
    <section className="zone-investigation inv-shell">
      <Seo
        title={activeTab.id === 'analysis' ? 'Trustive AI | Message Analysis' : 'Trustive AI | Threat Scanner'}
        description={activeTab.copy}
        path={`/investigation-center/${activeTab.id}`}
      />

      {/* Hero */}
      <div className="inv-hero fade-in">
        <div className="inv-hero-kicker">
          <span className="inv-kicker-dot" />
          <span className="inv-kicker-label">Threat Analysis Hub</span>
        </div>
        <h1 className="inv-hero-title">{activeTab.titleMain}</h1>
        <p className="inv-hero-copy">{activeTab.copy}</p>
      </div>

      {/* Mode switcher */}
      <div className="inv-mode-strip fade-in-delay-1">
        {investigationTabs.map((tab) => {
          const Icon = tab.icon
          const active = tab.id === activeTab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(`/investigation-center/${tab.id}`)}
              className={`inv-mode-btn${active ? ' is-active' : ''}`}
            >
              <Icon size={14} strokeWidth={1.8} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="inv-content fade-in-delay-2">
        {activeTab.id === 'analysis' && <Analysis embedded />}
        {activeTab.id === 'scanner' && <Scanner embedded />}
      </div>
    </section>
  )
}
