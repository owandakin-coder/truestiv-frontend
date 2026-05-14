import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Globe, GitBranch, Hash, Radio } from 'lucide-react'

import IntelEmptyState from '../components/IntelEmptyState'
import Seo from '../components/Seo'
import { apiRequest } from '../services/api'
import { levelColor, levelLabel, timeAgo } from '../utils/intelTools'

function rowIcon(type) {
  const t = String(type || '').toLowerCase()
  if (t === 'ip')   return Radio
  if (t === 'hash') return Hash
  if (t === 'file') return FileText
  return Globe
}

export default function CampaignClusters() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [payload,  setPayload]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [expanded, setExpanded] = useState(false)

  const selectedClusterId = searchParams.get('cluster') || ''

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ limit: '14' })
    if (selectedClusterId) params.set('cluster', selectedClusterId)
    apiRequest(`/api/intelligence/campaign-clusters?${params.toString()}`)
      .then((response) => {
        if (!active) return
        setPayload(response)
        if (!selectedClusterId && response.selected?.id) {
          setSearchParams({ cluster: response.selected.id }, { replace: true })
        }
      })
      .catch((err) => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [selectedClusterId, setSearchParams])

  const clusters = payload?.items || []
  const selected = payload?.selected || null
  const events   = selected?.events || []
  const INITIAL  = 5
  const visibleEvents = expanded ? events : events.slice(0, INITIAL)

  return (
    <div className="aip-root">
      <Seo
        title="Trustive AI | Campaign Clusters"
        description="Explore grouped recurring signals, linked indicators, and incident-style briefs across Trustive AI campaign clusters."
        path="/campaign-clusters"
      />
      <div className="grid-dots aip-bg-dots" />
      <div className="aip-inner">

        {/* Hero */}
        <header className="aip-hero fade-in">
          <div className="aip-kicker">
            <span className="aip-kicker-dot" />
            <span className="aip-kicker-text">CAMPAIGN CLUSTER VIEW</span>
          </div>
          <h1 className="aip-title">Campaign Clusters.</h1>
          <p className="aip-copy">
            Recurring signals grouped into clusters — shared actors, overlapping sources, common geography.
          </p>
        </header>

        {error   ? <p className="aip-error fade-in" style={{ borderColor: 'rgba(240,64,64,.28)', color: '#fca5a5' }}>{error}</p> : null}
        {loading ? <p className="aip-loading">Loading campaign clusters…</p> : null}

        {!loading && !clusters.length ? (
          <IntelEmptyState
            title="No campaign clusters yet"
            copy="Clusters appear when recurring indicators and overlapping sources begin forming a shared story."
            actionLabel="Open Threat Intel"
            actionTo="/threat-intel"
          />
        ) : null}

        {!loading && clusters.length ? (
          <div className="cc-layout fade-in-delay-1">

            {/* Sidebar: cluster list */}
            <aside className="cc-sidebar">
              <div className="cc-sidebar-hd">
                <span className="aip-activity-label">ACTIVE CLUSTERS</span>
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'rgba(148,163,184,.35)' }}>
                  {clusters.length}
                </span>
              </div>
              {clusters.map((cluster) => {
                const active = cluster.id === selectedClusterId
                const color  = levelColor(cluster.latest_threat_level)
                return (
                  <button
                    key={cluster.id}
                    type="button"
                    className={`cc-cluster-row${active ? ' is-active' : ''}`}
                    onClick={() => setSearchParams({ cluster: cluster.id })}
                  >
                    <div className="cc-cluster-row-top">
                      <span className="cc-cluster-label">{cluster.label}</span>
                      <span className="cc-cluster-badge" style={{ color, borderColor: `${color}33`, background: `${color}10` }}>
                        {levelLabel(cluster.latest_threat_level)}
                      </span>
                    </div>
                    <p className="cc-cluster-summary">{cluster.summary}</p>
                    <div className="cc-cluster-meta">
                      {cluster.signal_count} signals · {cluster.sources.length} sources · {cluster.countries?.slice(0, 2).join(', ') || 'global'}
                    </div>
                  </button>
                )
              })}
            </aside>

            {/* Dossier: selected cluster */}
            <div className="cc-dossier">
              {selected ? (
                <>
                  {/* Title */}
                  <div className="cc-dossier-kicker">
                    <GitBranch size={13} style={{ color: '#3b82f6' }} />
                    <span className="aip-activity-label">CLUSTER BRIEF</span>
                  </div>
                  <h2 className="cc-dossier-title">{selected.label}</h2>

                  {/* Stats row */}
                  <div className="cc-stats-row">
                    {[
                      ['Signals',   selected.signal_count],
                      ['Sources',   selected.sources?.length || 0],
                      ['Countries', selected.countries?.length || 0],
                      ['Tags',      selected.actor_tags?.length || 0],
                      ['Risk',      selected.max_risk_score],
                    ].map(([label, val]) => (
                      <div key={label} className="cc-stat">
                        <strong className="cc-stat-val">{val}</strong>
                        <span className="cc-stat-label">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Verdict badge */}
                  <div style={{ marginBottom: 14 }}>
                    <span
                      className="cc-cluster-badge"
                      style={{
                        color: levelColor(selected.latest_threat_level),
                        borderColor: `${levelColor(selected.latest_threat_level)}33`,
                        background: `${levelColor(selected.latest_threat_level)}10`,
                        fontSize: 11, padding: '4px 14px',
                      }}
                    >
                      {levelLabel(selected.latest_threat_level)}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(148,163,184,.4)', marginLeft: 12 }}>
                      latest seen {selected.latest_seen || 'unknown'}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="cc-dossier-body">{selected.summary}</p>

                  {/* Tags */}
                  {[
                    { label: 'ACTOR TAGS',  items: selected.actor_tags || [] },
                    { label: 'COUNTRIES',   items: selected.countries  || [] },
                    { label: 'SOURCES',     items: selected.sources    || [] },
                  ].map(({ label, items }) => items.length ? (
                    <div key={label} className="cc-tag-group">
                      <div className="aip-activity-label" style={{ marginBottom: 8 }}>{label}</div>
                      <div className="cc-tags">
                        {items.slice(0, 6).map((t) => (
                          <span key={t} className="lc-tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  ) : null)}

                  {/* Related indicators */}
                  {(selected.related_indicators || []).length ? (
                    <div className="cc-tag-group">
                      <div className="aip-activity-label" style={{ marginBottom: 8 }}>RELATED INDICATORS</div>
                      <div className="cc-tags">
                        {selected.related_indicators.slice(0, 8).map((ind) => (
                          <span key={ind} className="lc-tag" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{ind}</span>
                        ))}
                        {selected.related_indicators.length > 8 ? (
                          <span className="lc-tag">+{selected.related_indicators.length - 8} more</span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {/* Events table */}
                  {events.length ? (
                    <div className="aip-activity" style={{ marginTop: 28 }}>
                      <div className="aip-activity-hd">
                        <span className="aip-activity-label">CLUSTER EVENTS</span>
                        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'rgba(148,163,184,.4)' }}>
                          {events.length}
                        </span>
                      </div>
                      <div className="aip-thead">
                        <span>INDICATOR</span><span>TYPE</span><span>LEVEL</span><span>RISK</span><span>TIME</span><span />
                      </div>
                      <div className="aip-tbody">
                        {visibleEvents.map((event) => {
                          const color = levelColor(event.threat_level || selected.latest_threat_level)
                          const label = levelLabel(event.threat_level || selected.latest_threat_level)
                          const Icon  = rowIcon(event.ioc_type)
                          return (
                            <div
                              key={event.id}
                              className="aip-trow"
                              role="button"
                              tabIndex={0}
                              onClick={() => event.details_path && navigate(event.details_path)}
                              onKeyDown={(e) => e.key === 'Enter' && event.details_path && navigate(event.details_path)}
                              style={{ cursor: event.details_path ? 'pointer' : 'default' }}
                            >
                              <div className="aip-td-indicator">
                                <Icon size={14} className="aip-trow-icon" />
                                <span className="aip-trow-text">{event.title || event.indicator || '—'}</span>
                              </div>
                              <div className="aip-td aip-td-type">{String(event.ioc_type || '—').toUpperCase()}</div>
                              <div className="aip-td aip-td-verdict">
                                <span className="aip-verdict-dot" style={{ background: color }} />
                                <span className="aip-verdict-label" style={{ color }}>{label}</span>
                              </div>
                              <div className="aip-td aip-td-source" style={{ color: '#60a5fa' }}>{event.risk_score ?? '—'}</div>
                              <div className="aip-td aip-td-time">{timeAgo(event.created_at)}</div>
                              <div className="aip-td aip-td-arrow">›</div>
                            </div>
                          )
                        })}
                      </div>
                      {events.length > INITIAL ? (
                        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 16 }}>
                          <button type="button" className="aip-viewall" onClick={() => setExpanded((v) => !v)}>
                            {expanded ? 'Show less' : `Show ${events.length - INITIAL} more`}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <div style={{ color: 'rgba(148,163,184,.4)', fontSize: 13, paddingTop: 40, textAlign: 'center' }}>
                  Select a cluster from the left to inspect the brief.
                </div>
              )}
            </div>

          </div>
        ) : null}

      </div>
    </div>
  )
}
