import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GitBranch, Radar, Waypoints } from 'lucide-react'

import ExpandableFeed from '../components/ExpandableFeed'
import IntelEmptyState from '../components/IntelEmptyState'
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
    <section className="intel-shell">
      <div className="intel-hero-card portal-hero campaign-hero fade-in">
        <div className="intel-hero-content portal-hero-main">
          <div className="intel-eyebrow">
            <span className="intel-eyebrow-dot" />
            Campaign / Cluster View
          </div>
          <h1 className="intel-title" style={{ fontSize: 30, lineHeight: 1.3 }}>
            Related public signals grouped into actionable intelligence clusters.
          </h1>
          <p className="intel-copy intel-reading-block">
            Clusters bring recurring indicators, actor tags, countries, and source overlap into one public-facing intelligence briefing surface.
          </p>
        </div>
        <div className="portal-hero-rail">
          <article className="portal-spotlight-card">
            <span className="portal-spotlight-kicker">Cluster logic</span>
            <strong>Related signals grouped</strong>
            <p>Campaigns collect repeated indicators and sources into public-facing narrative clusters.</p>
          </article>
          <article className="portal-spotlight-card">
            <span className="portal-spotlight-kicker">Reading mode</span>
            <strong>Short list first</strong>
            <p>Large cluster lists and event stacks now open in a tighter slice and expand only on demand.</p>
          </article>
        </div>
      </div>

      {error ? <div className="intel-empty-card">{error}</div> : null}
      {loading ? <div className="intel-empty-card">Loading campaign clusters...</div> : null}

      {!loading && !clusters.length ? (
        <IntelEmptyState
          title="No public campaign clusters yet"
          copy="Clusters appear when recurring indicators, actor tags, and overlapping sources start forming a shared operational story."
          actionLabel="Open Threat Intel"
          actionTo="/threat-intel"
        />
      ) : null}

      {!loading && clusters.length ? (
        <>
          <div className="intel-stat-grid fade-in-delay-1">
            <article className="intel-stat-card">
              <GitBranch size={20} color={palette.blue} />
              <div className="intel-stat-value">{clusters.length}</div>
              <div className="intel-stat-label">Visible Clusters</div>
              <p className="intel-stat-copy">Grouped public signals currently exposed by the campaign model.</p>
            </article>
            <article className="intel-stat-card">
              <Radar size={20} color={palette.yellow} />
              <div className="intel-stat-value">{selected?.signal_count || 0}</div>
              <div className="intel-stat-label">Signals In Focus</div>
              <p className="intel-stat-copy">Indicators and sightings attached to the selected public brief.</p>
            </article>
            <article className="intel-stat-card">
              <Waypoints size={20} color={palette.cyan} />
              <div className="intel-stat-value">{selected?.sources?.length || 0}</div>
              <div className="intel-stat-label">Source Overlap</div>
              <p className="intel-stat-copy">Distinct signal sources contributing to the selected cluster.</p>
            </article>
          </div>

          <div className="intel-two-column fade-in-delay-2">
            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">
                  <GitBranch size={14} />
                  Active Clusters
                </div>
                <h2 className="intel-section-title">Recurring public activity</h2>
                <p className="intel-section-copy intel-reading-block">
                  Choose a cluster to inspect its latest indicators, countries, tags, and event flow.
                </p>
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
                      className="intel-mini-item campaign-cluster-item"
                      style={{
                        textAlign: 'left',
                        border: active ? '1px solid rgba(56,189,248,0.28)' : '1px solid rgba(148,163,184,0.14)',
                        background: active ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <strong>{cluster.label}</strong>
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
                      <span className="campaign-cluster-summary" style={{ color: palette.muted, lineHeight: 1.55 }}>{cluster.summary}</span>
                      <span className="campaign-cluster-meta" style={{ color: palette.subtle, fontSize: 13 }}>
                        {cluster.signal_count} signals | {cluster.sources.length} sources
                      </span>
                    </button>
                  )
                }}
              />
            </section>

            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">
                  <Radar size={14} />
                  Cluster Brief
                </div>
                <h2 className="intel-section-title">{selected?.label || 'No cluster selected'}</h2>
                <p className="intel-section-copy intel-reading-block">
                  {selected?.summary || 'Select a cluster to inspect its public indicators and supporting events.'}
                </p>
              </div>

              {selected ? (
                <>
                  <div className="intel-detail-grid">
                    <div className="intel-detail-card">
                      <span className="intel-meta-label">Latest Threat</span>
                      <strong>{selected.latest_threat_level}</strong>
                    </div>
                    <div className="intel-detail-card">
                      <span className="intel-meta-label">Max Risk Score</span>
                      <strong>{selected.max_risk_score}</strong>
                    </div>
                    <div className="intel-detail-card">
                      <span className="intel-meta-label">Latest Seen</span>
                      <strong className="campaign-detail-value">{selected.latest_seen || 'Unknown'}</strong>
                    </div>
                  </div>

                  <div className="intel-tag-wrap">
                    {(selected.actor_tags || []).map((tag) => (
                      <span key={tag} className="intel-tag-chip">{tag}</span>
                    ))}
                    {(selected.countries || []).map((country) => (
                      <span key={country} className="intel-tag-chip">{country}</span>
                    ))}
                    {(selected.sources || []).map((source) => (
                      <span key={source} className="intel-tag-chip">{source}</span>
                    ))}
                  </div>

                  <div>
                    <div className="intel-meta-label" style={{ marginBottom: 10 }}>Related Indicators</div>
                    <div className="intel-tag-wrap">
                      {(selected.related_indicators || []).map((indicator) => (
                        <span key={indicator} className="intel-tag-chip">{indicator}</span>
                      ))}
                    </div>
                  </div>

                  <ExpandableFeed
                    items={selected.events || []}
                    initialCount={4}
                    className="intel-mini-list campaign-cluster-events"
                    renderItem={(event) => (
                      <article key={event.id} className="intel-mini-item campaign-cluster-event">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <strong>{event.title}</strong>
                          <span style={{ color: palette.subtle, fontSize: 13 }}>{event.source}</span>
                        </div>
                        <span className="intel-reading-block" style={{ color: palette.muted, lineHeight: 1.6 }}>{event.summary}</span>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="campaign-event-meta" style={{ color: palette.subtle, fontSize: 13 }}>
                            {event.ioc_type} | risk {event.risk_score} | {event.created_at || 'Unknown'}
                          </span>
                          {event.details_path ? (
                            <Link className="intel-inline-link" to={event.details_path}>
                              IOC details
                            </Link>
                          ) : null}
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
