import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, GitBranch, Globe, Hash, Radio } from 'lucide-react'

import IntelEmptyState from '../components/IntelEmptyState'
import Seo from '../components/Seo'
import { apiRequest } from '../services/api'
import { buildIocPath } from '../utils/intelTools'

function levelColor(level) {
  const v = String(level || '').toLowerCase()
  if (v === 'threat' || v === 'dangerous') return '#ef4444'
  if (v === 'suspicious') return '#f59e0b'
  if (v === 'safe') return '#22c55e'
  return '#60a5fa'
}
function levelLabel(level) {
  const v = String(level || '').toLowerCase()
  if (v === 'threat' || v === 'dangerous') return 'THREAT'
  if (v === 'suspicious') return 'SUSPICIOUS'
  if (v === 'safe') return 'SAFE'
  return 'UNKNOWN'
}
function rowIcon(type) {
  const t = String(type || '').toLowerCase()
  if (t === 'ip')   return Radio
  if (t === 'hash') return Hash
  if (t === 'file') return FileText
  return Globe
}
function timeAgo(val) {
  if (!val) return '—'
  try {
    const diff = Date.now() - new Date(val).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1)  return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch { return '—' }
}

const INITIAL_COUNT = 12

export default function ThreatIntelHub() {
  const navigate = useNavigate()
  const [feed,     setFeed]     = useState([])
  const [trending, setTrending] = useState([])
  const [briefs,   setBriefs]   = useState([])
  const [collectionOverview, setCollectionOverview] = useState(null)
  const [error,    setError]    = useState('')
  const [live,     setLive]     = useState(true)
  const [activeTab, setActiveTab] = useState('trending')
  const [expanded,  setExpanded]  = useState(false)

  useEffect(() => {
    let active = true
    const loadIntel = () => {
      Promise.all([
        apiRequest('/api/community/threats'),
        apiRequest('/api/intelligence/trending-indicators?time_range=30d&limit=20'),
        apiRequest('/api/intelligence/public-incident-briefs?limit=10'),
        apiRequest('/api/intelligence/collection/overview'),
      ])
        .then(([feedPayload, trendingPayload, briefsPayload, collectionPayload]) => {
          if (!active) return
          setError('')
          setFeed(feedPayload || [])
          setTrending(trendingPayload.items || [])
          setBriefs(briefsPayload.items || [])
          setCollectionOverview(collectionPayload || null)
        })
        .catch((err) => { if (active) setError(err.message) })
    }
    loadIntel()
    if (!live) return () => { active = false }
    const interval = setInterval(loadIntel, 30000)
    return () => { active = false; clearInterval(interval) }
  }, [live])

  const summary     = collectionOverview?.summary || null
  const tabs = [
    { id: 'trending', label: 'Trending',  count: trending.length },
    { id: 'briefs',   label: 'Briefs',    count: briefs.length },
    { id: 'latest',   label: 'Latest',    count: feed.length },
  ]

  function switchTab(id) { setActiveTab(id); setExpanded(false) }

  function renderShowMore(list) {
    if (list.length <= INITIAL_COUNT) return null
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}>
        <button type="button" className="aip-viewall" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : `Show ${list.length - INITIAL_COUNT} more`}
        </button>
      </div>
    )
  }

  const trendingVisible = expanded ? trending : trending.slice(0, INITIAL_COUNT)
  const briefsVisible   = expanded ? briefs   : briefs.slice(0, INITIAL_COUNT)
  const feedVisible     = expanded ? feed     : feed.slice(0, INITIAL_COUNT)

  return (
    <div className="aip-root">
      <Seo
        title="Trustive AI | Threat Intelligence"
        description="Monitor recurring indicators, incident briefs, collected signals, and the latest intelligence published by Trustive AI."
        path="/threat-intel"
      />
      <div className="grid-dots aip-bg-dots" />
      <div className="aip-inner">

        {/* Hero */}
        <header className="aip-hero fade-in">
          <div className="aip-kicker">
            <span className="aip-kicker-dot" />
            <span className="aip-kicker-text">THREAT INTELLIGENCE HUB</span>
          </div>
          <h1 className="aip-title">Threat Intelligence.</h1>
          <p className="aip-copy">
            Recurring indicators, incident briefs, and the latest published signals —
            {summary?.latest_collection_at
              ? ` last collected ${timeAgo(summary.latest_collection_at)}.`
              : ' feed warming up.'}
          </p>
        </header>

        {/* Controls bar — live toggle + tab switcher */}
        <div className="aip-filter-bar fade-in-delay-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`aip-tab-btn${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => switchTab(tab.id)}
            >
              {tab.label}
              {tab.count ? <span className="aip-tab-count">{tab.count}</span> : null}
            </button>
          ))}
          <span className="aip-filter-divider" />
          <button
            type="button"
            className={`aip-live-btn${live ? ' is-live' : ''}`}
            onClick={() => setLive((v) => !v)}
          >
            <span className="aip-live-dot" />
            {live ? 'LIVE' : 'PAUSED'}
          </button>
        </div>

        {error ? <p className="aip-error fade-in" style={{ borderColor: 'rgba(240,64,64,.28)', color: '#fca5a5' }}>{error}</p> : null}

        {/* ── Trending ── */}
        {activeTab === 'trending' ? (
          !trending.length ? (
            <IntelEmptyState
              title="Trending indicators are still warming up"
              copy="As signals accumulate, recurring IPs, URLs, domains, and hashes will start clustering here automatically."
              actionLabel="Open Investigation Center"
              actionTo="/investigation-center/scanner"
            />
          ) : (
            <div className="aip-activity fade-in-delay-2">
              <div className="aip-activity-hd">
                <span className="aip-activity-label">TRENDING INDICATORS</span>
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'rgba(148,163,184,.4)' }}>
                  {trending.length} signals
                </span>
              </div>
              <div className="aip-thead" style={{ gridTemplateColumns: 'minmax(0,2.5fr) 72px 152px 90px 72px 20px' }}>
                <span>INDICATOR</span><span>TYPE</span><span>LEVEL</span><span>SIGHTINGS</span><span>SOURCES</span><span />
              </div>
              <div className="aip-tbody">
                {trendingVisible.map((item) => {
                  const path  = item.details_path || buildIocPath(item.ioc_type, item.indicator)
                  const color = levelColor(item.latest_threat_level)
                  const label = levelLabel(item.latest_threat_level)
                  const Icon  = rowIcon(item.ioc_type)
                  return (
                    <div
                      key={`${item.ioc_type}-${item.indicator}`}
                      className="aip-trow"
                      style={{ gridTemplateColumns: 'minmax(0,2.5fr) 72px 152px 90px 72px 20px' }}
                      role="button" tabIndex={0}
                      onClick={() => path && navigate(path)}
                      onKeyDown={(e) => e.key === 'Enter' && path && navigate(path)}
                    >
                      <div className="aip-td-indicator">
                        <Icon size={15} className="aip-trow-icon" />
                        <span className="aip-trow-text">{item.indicator}</span>
                      </div>
                      <div className="aip-td aip-td-type">{String(item.ioc_type || '—').toUpperCase()}</div>
                      <div className="aip-td aip-td-verdict">
                        <span className="aip-verdict-dot" style={{ background: color }} />
                        <span className="aip-verdict-label" style={{ color }}>{label}</span>
                      </div>
                      <div className="aip-td aip-td-source" style={{ color: '#60a5fa' }}>{item.sightings}×</div>
                      <div className="aip-td aip-td-time">{(item.sources || []).length}</div>
                      <div className="aip-td aip-td-arrow">›</div>
                    </div>
                  )
                })}
              </div>
              {renderShowMore(trending)}
            </div>
          )
        ) : null}

        {/* ── Briefs ── */}
        {activeTab === 'briefs' ? (
          !briefs.length ? (
            <IntelEmptyState
              title="No incident briefs yet"
              copy="Briefs appear after recurring indicators, shared actor tags, and overlapping sources form a cluster worth surfacing."
              actionLabel="Open Campaign View"
              actionTo="/campaign-clusters"
            />
          ) : (
            <div className="aip-activity fade-in-delay-2">
              <div className="aip-activity-hd">
                <span className="aip-activity-label">INCIDENT BRIEFS</span>
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'rgba(148,163,184,.4)' }}>
                  {briefs.length} briefs
                </span>
              </div>
              <div className="aip-thead" style={{ gridTemplateColumns: 'minmax(0,2.5fr) 152px 90px minmax(80px,.6fr) 20px' }}>
                <span>TITLE</span><span>LEVEL</span><span>SIGNALS</span><span>TAGS</span><span />
              </div>
              <div className="aip-tbody">
                {briefsVisible.map((item) => {
                  const path  = item.details_path || '/campaign-clusters'
                  const color = levelColor(item.latest_threat_level)
                  const label = levelLabel(item.latest_threat_level)
                  return (
                    <div
                      key={item.id}
                      className="aip-trow"
                      style={{ gridTemplateColumns: 'minmax(0,2.5fr) 152px 90px minmax(80px,.6fr) 20px' }}
                      role="button" tabIndex={0}
                      onClick={() => navigate(path)}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(path)}
                    >
                      <div className="aip-td-indicator">
                        <GitBranch size={14} className="aip-trow-icon" />
                        <span className="aip-trow-text">{item.title}</span>
                      </div>
                      <div className="aip-td aip-td-verdict">
                        <span className="aip-verdict-dot" style={{ background: color }} />
                        <span className="aip-verdict-label" style={{ color }}>{label}</span>
                      </div>
                      <div className="aip-td aip-td-source" style={{ color: '#60a5fa' }}>{item.signal_count || 0}</div>
                      <div className="aip-td aip-td-time">{(item.actor_tags || []).slice(0, 2).join(', ') || '—'}</div>
                      <div className="aip-td aip-td-arrow">›</div>
                    </div>
                  )
                })}
              </div>
              {renderShowMore(briefs)}
            </div>
          )
        ) : null}

        {/* ── Latest ── */}
        {activeTab === 'latest' ? (
          !feed.length && !error ? (
            <IntelEmptyState
              title="No published intelligence items yet"
              copy="Fresh indicators from OTX, URLhaus, PhishTank, AbuseIPDB, and promoted community findings will appear here as soon as actionable signals land."
              actionLabel="View Timeline"
              actionTo="/timeline"
            />
          ) : (
            <div className="aip-activity fade-in-delay-2">
              <div className="aip-activity-hd">
                <span className="aip-activity-label">LATEST INTELLIGENCE</span>
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'rgba(148,163,184,.4)' }}>
                  {feed.length} items
                </span>
              </div>
              <div className="aip-thead">
                <span>INDICATOR</span><span>TYPE</span><span>VERDICT</span><span>RISK</span><span>TIME</span><span />
              </div>
              <div className="aip-tbody">
                {feedVisible.map((item) => {
                  const path  = buildIocPath(item.threat_type, item.indicator)
                  const color = levelColor(item.threat_level)
                  const label = levelLabel(item.threat_level)
                  const Icon  = rowIcon(item.threat_type)
                  return (
                    <div
                      key={item.id}
                      className="aip-trow"
                      role="button" tabIndex={0}
                      onClick={() => path && navigate(path)}
                      onKeyDown={(e) => e.key === 'Enter' && path && navigate(path)}
                    >
                      <div className="aip-td-indicator">
                        <Icon size={15} className="aip-trow-icon" />
                        <span className="aip-trow-text">{item.indicator}</span>
                      </div>
                      <div className="aip-td aip-td-type">{String(item.threat_type || '—').toUpperCase()}</div>
                      <div className="aip-td aip-td-verdict">
                        <span className="aip-verdict-dot" style={{ background: color }} />
                        <span className="aip-verdict-label" style={{ color }}>{label}</span>
                      </div>
                      <div className="aip-td aip-td-source" style={{ color: '#60a5fa' }}>Risk {item.risk_score ?? '—'}</div>
                      <div className="aip-td aip-td-time">{timeAgo(item.created_at || item.published_at)}</div>
                      <div className="aip-td aip-td-arrow">›</div>
                    </div>
                  )
                })}
              </div>
              {renderShowMore(feed)}
            </div>
          )
        ) : null}

      </div>
    </div>
  )
}
