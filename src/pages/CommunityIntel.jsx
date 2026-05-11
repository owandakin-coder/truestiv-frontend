import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Globe, Hash, Radio } from 'lucide-react'

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
  if (!val) return ''
  try {
    const diff = Date.now() - new Date(val).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1)  return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch { return '' }
}

const INITIAL_COUNT = 15

export default function CommunityIntel() {
  const navigate = useNavigate()
  const [items,    setItems]    = useState([])
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(true)
  const [live,     setLive]     = useState(true)
  const [expanded, setExpanded] = useState(false)

  const loadFeed = useCallback(() => {
    let mounted = true
    setError('')
    apiRequest('/api/community/threats')
      .then((payload) => { if (mounted) setItems(payload || []) })
      .catch((err)    => { if (mounted) setError(err.message) })
      .finally(()     => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  useEffect(() => { setLoading(true); return loadFeed() }, [loadFeed])
  useEffect(() => {
    if (!live) return undefined
    const id = setInterval(loadFeed, 30000)
    return () => clearInterval(id)
  }, [live, loadFeed])

  const visible = expanded ? items : items.slice(0, INITIAL_COUNT)

  return (
    <div className="aip-root">
      <Seo
        title="Trustive AI | Community Signals"
        description="Review moderated suspicious and threat indicators surfaced in the Trustive AI community intelligence feed."
        path="/community"
      />
      <div className="grid-dots aip-bg-dots" />
      <div className="aip-inner">

        {/* Hero */}
        <header className="aip-hero fade-in">
          <div className="aip-kicker">
            <span className="aip-kicker-dot" />
            <span className="aip-kicker-text">COMMUNITY INTELLIGENCE</span>
          </div>
          <h1 className="aip-title">Community Signals.</h1>
          <p className="aip-copy">
            A moderated board of suspicious and threat signals surfaced by the platform.
          </p>
        </header>

        {/* Live toggle — flat */}
        <div className="aip-filter-bar fade-in-delay-1">
          <button
            type="button"
            className={`aip-live-btn${live ? ' is-live' : ''}`}
            onClick={() => setLive((v) => !v)}
          >
            <span className="aip-live-dot" />
            {live ? 'LIVE' : 'PAUSED'}
          </button>
          {items.length ? (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(148,163,184,.4)' }}>
              {items.length} signals
            </span>
          ) : null}
        </div>

        {error   ? <p className="aip-error fade-in" style={{ borderColor: 'rgba(240,64,64,.28)', color: '#fca5a5' }}>{error}</p> : null}
        {loading ? <p className="aip-loading">Loading community intelligence…</p> : null}

        {!loading && !items.length && !error ? (
          <IntelEmptyState
            title="No community intelligence has been published yet"
            copy="Only suspicious and threat findings appear here. Run a scanner request or promote a strong analysis result to seed the feed."
            actionLabel="Open Investigation Center"
            actionTo="/investigation-center/scanner"
          />
        ) : null}

        {/* Activity table — flat */}
        {!loading && items.length ? (
          <div className="aip-activity fade-in-delay-2">
            <div className="aip-activity-hd">
              <span className="aip-activity-label">COMMUNITY FEED</span>
            </div>
            <div className="aip-thead">
              <span>INDICATOR</span>
              <span>TYPE</span>
              <span>VERDICT</span>
              <span>SOURCE</span>
              <span>TIME</span>
              <span />
            </div>
            <div className="aip-tbody">
              {visible.map((item) => {
                const path  = buildIocPath(item.threat_type, item.indicator)
                const color = levelColor(item.threat_level)
                const label = levelLabel(item.threat_level)
                const Icon  = rowIcon(item.threat_type)
                return (
                  <div
                    key={item.id}
                    className="aip-trow"
                    role="button"
                    tabIndex={0}
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
                    <div className="aip-td aip-td-source">Community</div>
                    <div className="aip-td aip-td-time">{timeAgo(item.published_at)}</div>
                    <div className="aip-td aip-td-arrow">›</div>
                  </div>
                )
              })}
            </div>
            {items.length > INITIAL_COUNT ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}>
                <button type="button" className="aip-viewall" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? 'Show less' : `Show ${items.length - INITIAL_COUNT} more`}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

      </div>
    </div>
  )
}
