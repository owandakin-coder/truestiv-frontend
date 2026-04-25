import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, ScanSearch, ShieldAlert } from 'lucide-react'

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
        title="Investigation Center"
        copy="Choose the fastest path into public intelligence and move directly from verdict to IOC context."
        eyebrowItems={['Scanner', 'Message Analysis']}
        className="investigation-shell-hero portal-hero-left fade-in"
        actions={(
          <>
            <button type="button" className="intel-button primary" onClick={() => navigate('/investigation-center/scanner')}>
              Open Scanner
            </button>
            <button type="button" className="intel-button ghost" onClick={() => navigate('/investigation-center/analysis')}>
              Open Analysis
            </button>
          </>
        )}
      />

      <section className="intel-section-card investigation-hub-panel fade-in-delay-1">
        <div className="investigation-hub-topline">
          <div className="investigation-hub-copy">
            <span className="analysis-meta-label">Workspace</span>
            <h2 className="intel-section-title">Pick the right lane</h2>
            <p>Use the scanner for IOC triage or message analysis for suspicious text and sender context.</p>
          </div>
          <div className="investigation-hub-tags">
            <span className="intel-tag-chip">Scanner first</span>
            <span className="intel-tag-chip">Actionable history only</span>
            <span className="intel-tag-chip">Public portal</span>
          </div>
        </div>

        <div className="investigation-overview-grid">
          {investigationTabs.map((tab) => {
            const Icon = tab.icon
            const active = tab.id === activeTab.id
            return (
              <article key={tab.id} className={`investigation-overview-card${active ? ' is-active' : ''}`}>
                <div className="investigation-overview-head">
                  <div className="investigation-overview-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="analysis-meta-label">Tool</div>
                    <strong>{tab.label}</strong>
                  </div>
                </div>
                <p>{tab.copy}</p>
                <button
                  type="button"
                  className={`scanner-inline-button${active ? ' active-card-button' : ''}`}
                  onClick={() => navigate(`/investigation-center/${tab.id}`)}
                >
                  {active ? 'Current lane' : 'Open lane'}
                  {!active ? <ArrowRight size={14} /> : null}
                </button>
              </article>
            )
          })}
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
      </section>

      <section className="fade-in-delay-2 investigation-active-stage" style={{ position: 'relative', zIndex: 1 }}>
        {activeTab.id === 'analysis' && <Analysis embedded />}
        {activeTab.id === 'scanner' && <Scanner embedded />}
      </section>
    </section>
  )
}
