import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GitBranch, Radar } from 'lucide-react'

import ExpandableFeed from '../components/ExpandableFeed'
import IntelEmptyState from '../components/IntelEmptyState'
import PortalHero from '../components/PortalHero'
import { useTheme } from '../components/ThemeProvider'
import { apiRequest } from '../services/api'

function paletteFor(theme) {
  const dark = theme !== 'light'
  return {
    text: dark ? '#eff6ff' : '#0f172a',
    muted: dark ? 'rgba(191,219,254,0.72)' : '#475569',
    subtle: dark ? 'rgba(191,219,254,0.5)' : '#64748b',
    blue: '#38bdf8',
    cyan: '#22d3ee',
    green: '#22c55e',
    yellow: '#fbbf24',
    red: '#fb7185',
  }
}

function levelColor(level, palette) {
  const value = String(level || '').toLowerCase()
  if (value === 'threat') return palette.red
  if (value === 'suspicious') return palette.yellow
  return palette.green
}

export default function CampaignClusters() {
  const { theme } = useTheme()
  const palette = useMemo(() => paletteFor(theme), [theme])
  const [searchParams, setSearchParams] = useSearchParams()
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [selectedClusterId, setSearchParams])

  const clusters = payload?.items || []
  const selected = payload?.selected || null
  return (
    <section className="intel-shell zone-campaigns">
      <PortalHero
        kicker="Campaign / Cluster View"
        title="Campaign Clusters"
        copy="Recurring public signals grouped into clusters."
        className="campaign-hero portal-hero-left fade-in"
      />

      {error ? <div className="intel-empty-card">{error}</div> : null}
      {loading ? <div className="intel-empty-card">Loading campaign clusters...</div> : null}

      {!loading && !clusters.length ? (
        <IntelEmptyState
          title="No public campaign clusters yet"
          copy="Clusters appear when recurring indicators and overlapping sources begin forming a shared story."
          actionLabel="Open Threat Intel"
          actionTo="/threat-intel"
        />
      ) : null}

      {!loading && clusters.length ? (
        <>
          <div className="intel-two-column fade-in-delay-2">
            <section className="intel-section-card campaign-browser-panel">
              <div className="intel-section-head">
                <div className="intel-eyebrow">
                  <GitBranch size={14} />
                  Active Clusters
                </div>
                <h2 className="intel-section-title">Recurring public activity</h2>
              </div>

              <ExpandableFeed
                items={clusters}
                initialCount={5}
                className="intel-mini-list campaign-cluster-list"
                renderItem={(cluster) => {
                  const active = cluster.id === selected?.id
                  return (
                    <button
                      key={cluster.id}
                      type="button"
                      onClick={() => setSearchParams({ cluster: cluster.id })}
                      className={`intel-mini-item campaign-cluster-item ${active ? 'is-active' : ''}`}
                      style={{
                        textAlign: 'left',
                        background: active ? '#08111f' : '#07101f',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="campaign-cluster-stack">
                        <div className="campaign-cluster-topline">
                          <div className="campaign-cluster-title">{cluster.label}</div>
                          <span
                            className="platform-badge"
                            style={{
                              color: levelColor(cluster.latest_threat_level, palette),
                              borderColor: `${levelColor(cluster.latest_threat_level, palette)}33`,
                              background: `${levelColor(cluster.latest_threat_level, palette)}12`,
                            }}
                          >
                            {cluster.latest_threat_level}
                          </span>
                        </div>
                        <div className="campaign-cluster-summary">{cluster.summary}</div>
                        <div className="campaign-cluster-meta">
                          {cluster.signal_count} signals | {cluster.sources.length} sources | {cluster.countries?.slice(0, 2).join(', ') || 'global'}
                        </div>
                      </div>
                    </button>
                  )
                }}
              />
            </section>

            <section className="intel-section-card campaign-dossier-panel">
              <div className="intel-section-head">
                <div className="intel-eyebrow">
                  <Radar size={14} />
                  Cluster Brief
                </div>
                <h2 className="intel-section-title">{selected?.label || 'No cluster selected'}</h2>
              </div>

              {selected ? (
                <>
                  <article className="campaign-dossier" style={{ ['--severity-color']: levelColor(selected.latest_threat_level, palette) }}>
                    <div className="campaign-dossier-header">
                      <div className="campaign-dossier-meta">
                        <span>{selected.latest_threat_level}</span>
                        <span>risk {selected.max_risk_score}</span>
                        <span>latest seen {selected.latest_seen || 'unknown'}</span>
                      </div>
                      <div className="cluster-summary-strip">
                        <article className="cluster-stat-chip">
                          <div className="signal-strip-label">Signals</div>
                          <strong>{selected.signal_count}</strong>
                        </article>
                        <article className="cluster-stat-chip">
                          <div className="signal-strip-label">Sources</div>
                          <strong>{selected.sources?.length || 0}</strong>
                        </article>
                        <article className="cluster-stat-chip">
                          <div className="signal-strip-label">Countries</div>
                          <strong>{selected.countries?.length || 0}</strong>
                        </article>
                        <article className="cluster-stat-chip">
                          <div className="signal-strip-label">Tags</div>
                          <strong>{selected.actor_tags?.length || 0}</strong>
                        </article>
                      </div>
                    </div>
                    <div className="campaign-dossier-body">{selected.summary}</div>
                    <div className="intel-tag-wrap">
                      {(selected.actor_tags || []).slice(0, 4).map((tag) => (
                        <span key={tag} className="intel-tag-chip">{tag}</span>
                      ))}
                      {(selected.countries || []).slice(0, 4).map((country) => (
                        <span key={country} className="intel-tag-chip">{country}</span>
                      ))}
                      {(selected.sources || []).slice(0, 4).map((source) => (
                        <span key={source} className="intel-tag-chip">{source}</span>
                      ))}
                    </div>
                    <div>
                      <div className="intel-meta-label" style={{ marginBottom: 10 }}>Related Indicators</div>
                      <div className="intel-tag-wrap">
                        {(selected.related_indicators || []).slice(0, 6).map((indicator) => (
                          <span key={indicator} className="intel-tag-chip">{indicator}</span>
                        ))}
                        {(selected.related_indicators || []).length > 6 ? (
                          <span className="intel-tag-chip">+{selected.related_indicators.length - 6} more</span>
                        ) : null}
                      </div>
                    </div>
                  </article>

                  <ExpandableFeed
                    items={selected.events || []}
                    initialCount={4}
                    className="flat-rail campaign-cluster-events"
                    renderItem={(event) => (
                      <article key={event.id} className={`flat-rail-row ${String(event.threat_level || selected.latest_threat_level || 'info').toLowerCase()}`}>
                        <div className="flat-rail-main">
                          <div className="flat-rail-title">{event.title}</div>
                          <div className="flat-rail-meta">{event.source} | {event.ioc_type} | risk {event.risk_score} | {event.created_at || 'Unknown'}</div>
                          <span className="flat-rail-copy">{event.summary}</span>
                        </div>
                        <div>
                          <span
                            className="platform-badge"
                            style={{
                              color: levelColor(event.threat_level || selected.latest_threat_level, palette),
                              borderColor: `${levelColor(event.threat_level || selected.latest_threat_level, palette)}33`,
                              background: `${levelColor(event.threat_level || selected.latest_threat_level, palette)}12`,
                            }}
                          >
                            {event.threat_level || selected.latest_threat_level}
                          </span>
                        </div>
                        <div>
                          {event.details_path ? <Link className="intel-inline-link" to={event.details_path}>IOC details</Link> : null}
                        </div>
                      </article>
                    )}
                  />
                </>
              ) : (
                <div className="intel-empty-inline">Select a cluster from the left to inspect the public brief.</div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  )
}
