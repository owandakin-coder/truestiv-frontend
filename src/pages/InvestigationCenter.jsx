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

  if (mode === 'scanner') {
    return (
      <section className="zone-investigation">
        <Seo
          title="Trustive AI | Threat Scanner"
          description="Investigate indicators across multiple intelligence sources and get real-time verdicts."
          path="/investigation-center/scanner"
        />
        <Scanner onAnalysis={() => navigate('/investigation-center/analysis')} />
      </section>
    )
  }

  const activeTab = investigationTabs.find((t) => t.id === mode) ?? investigationTabs[0]

  return (
    <section className="zone-investigation inv-shell">
      <Seo
        title="Trustive AI | Message Analysis"
        description="Review suspicious messages with verdicts, pivots, and actionable history."
        path="/investigation-center/analysis"
      />

      <div className="inv-hero fade-in">
        <div className="inv-hero-kicker">
          <span className="inv-kicker-dot" />
          <span className="inv-kicker-label">Threat Analysis Hub</span>
        </div>
        <h1 className="inv-hero-title">{activeTab.titleMain}</h1>
        <p className="inv-hero-copy">{activeTab.copy}</p>
      </div>

      <div className="inv-mode-strip fade-in-delay-1">
        {investigationTabs.map((tab) => {
          const Icon = tab.icon
          const active = tab.id === activeTab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate('/investigation-center/' + tab.id)}
              className={'inv-mode-btn' + (active ? ' is-active' : '')}
            >
              <Icon size={14} strokeWidth={1.8} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <div className="inv-content fade-in-delay-2">
        {activeTab.id === 'analysis' && <Analysis embedded />}
        {activeTab.id === 'scanner' && <Scanner embedded />}
      </div>
    </section>
  )
}
