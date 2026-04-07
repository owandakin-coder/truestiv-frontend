import { useEffect, useMemo, useState } from 'react'
import { Activity, DatabaseZap, Radar } from 'lucide-react'

import { apiRequest } from '../services/api'

function threatLabel(level) {
  const value = String(level || '').toLowerCase()
  if (!value) return 'unknown'
  return value
}

export default function ThreatIntelHub() {
  const [sources, setSources] = useState([])
  const [feed, setFeed] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiRequest('/api/intelligence/sources-status'),
      apiRequest('/api/community/threats'),
    ])
      .then(([sourcesPayload, feedPayload]) => {
        setSources(sourcesPayload.sources || [])
        setFeed(feedPayload || [])
      })
      .catch((err) => setError(err.message))
  }, [])

  const stats = useMemo(() => {
    const activeSources = sources.length
    const publishedFeed = feed.length
    const highRisk = feed.filter((item) => ['threat', 'suspicious'].includes(String(item.threat_level || '').toLowerCase())).length
    return { activeSources, publishedFeed, highRisk }
  }, [feed, sources])

  return (
    <section className="intel-shell">
      <div className="intel-hero-card fade-in">
        <div className="intel-hero-content">
          <div className="intel-eyebrow">
            <span className="intel-eyebrow-dot" />
            Public Threat Intelligence
          </div>
          <h1 className="intel-title">External feed collection and public indicator monitoring in one centered view.</h1>
          <p className="intel-copy">
            This page is shaped like an intelligence briefing hub. It is focused on public feeds, recent promoted indicators, and source visibility so anyone can understand what the platform is collecting.
          </p>
        </div>
      </div>

      {error ? <div className="intel-empty-card">{error}</div> : null}

      <div className="intel-stat-grid fade-in-delay-1">
        <article className="intel-stat-card">
          <DatabaseZap size={20} color="#38bdf8" />
          <div className="intel-stat-value">{stats.activeSources}</div>
          <div className="intel-stat-label">Active Sources</div>
          <p className="intel-stat-copy">Feeds currently exposed by the backend intelligence status endpoint.</p>
        </article>
        <article className="intel-stat-card">
          <Radar size={20} color="#22c55e" />
          <div className="intel-stat-value">{stats.publishedFeed}</div>
          <div className="intel-stat-label">Published Indicators</div>
          <p className="intel-stat-copy">Recent intelligence items already visible in the shared platform feed.</p>
        </article>
        <article className="intel-stat-card">
          <Activity size={20} color="#fbbf24" />
          <div className="intel-stat-value">{stats.highRisk}</div>
          <div className="intel-stat-label">High Attention Items</div>
          <p className="intel-stat-copy">Indicators currently marked as suspicious or threat in the public stream.</p>
        </article>
      </div>

      {!feed.length && !error ? (
        <div className="intel-empty-card">No threat intelligence items are available yet.</div>
      ) : (
        <section className="intel-section-card fade-in-delay-2">
          <div className="intel-section-head">
            <div className="intel-eyebrow">
              <Radar size={14} />
              Latest Intelligence
            </div>
            <h2 className="intel-section-title">Most recent published indicators</h2>
            <p className="intel-section-copy">
              A centered summary of the newest indicators coming from automated collection and community promotion.
            </p>
          </div>

          <div className="intel-feed-list">
            {feed.slice(0, 8).map((item) => (
              <article key={item.id} className="intel-feed-row">
                <div className="intel-feed-row-main">
                  <div className="intel-indicator">{item.indicator}</div>
                  <div className="intel-feed-row-meta">
                    Trustive AI currently exposes this indicator as part of the public threat intelligence stream.
                  </div>
                </div>
                <div className="intel-meta">{item.threat_type}</div>
                <div className="intel-feed-row-risk">Risk {item.risk_score}</div>
                <div>
                  <span className={`platform-badge ${threatLabel(item.threat_level)}`}>{threatLabel(item.threat_level)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
