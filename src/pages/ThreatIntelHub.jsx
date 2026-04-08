import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, DatabaseZap, Radar } from 'lucide-react'

import { apiRequest } from '../services/api'
import { buildIocPath } from '../utils/intelTools'

function threatLabel(level) {
  const value = String(level || '').toLowerCase()
  if (!value) return 'unknown'
  return value
}

export default function ThreatIntelHub() {
  const [sources, setSources] = useState([])
  const [feed, setFeed] = useState([])
  const [trends, setTrends] = useState({ by_source: [], by_country: [], by_ioc_type: [], timeline: [] })
  const [jobs, setJobs] = useState({ jobs: [], retry_queue: [] })
  const [error, setError] = useState('')
  const [live, setLive] = useState(true)

  useEffect(() => {
    let active = true

    const loadIntel = () => {
      setError('')
      Promise.all([
        apiRequest('/api/intelligence/sources-status'),
        apiRequest('/api/community/threats'),
        apiRequest('/api/intelligence/trends?time_range=30d'),
        apiRequest('/api/intelligence/jobs/status'),
      ])
        .then(([sourcesPayload, feedPayload, trendsPayload, jobsPayload]) => {
          if (!active) return
          setSources(sourcesPayload.sources || [])
          setFeed(feedPayload || [])
          setTrends(trendsPayload || { by_source: [], by_country: [], by_ioc_type: [], timeline: [] })
          setJobs(jobsPayload || { jobs: [], retry_queue: [] })
        })
        .catch((err) => {
          if (active) setError(err.message)
        })
    }

    loadIntel()

    if (!live) {
      return () => {
        active = false
      }
    }

    const interval = setInterval(() => {
      loadIntel()
    }, 30000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [live])

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
          <h1 className="intel-title">External feed collection and public indicator monitoring<br />in one centered view.</h1>
          <p className="intel-copy">
            This page is shaped like an intelligence briefing hub. It is focused on public feeds, recent promoted indicators, and source visibility so anyone can understand what the platform is collecting.
          </p>
          <button className={`intel-button ${live ? 'primary' : 'ghost'}`} type="button" onClick={() => setLive((current) => !current)}>
            {live ? 'Live refresh on' : 'Live refresh off'}
          </button>
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

      <section className="intel-section-card fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow">
            <Activity size={14} />
            Threat Trends
          </div>
          <h2 className="intel-section-title">High-signal patterns by source, country, type, and time</h2>
          <p className="intel-section-copy">
            These trend views are built only from suspicious and threat findings so the charts stay operationally useful.
          </p>
        </div>

        <div className="intel-grid-two">
          <article className="intel-detail-card">
            <div className="intel-detail-label">Top Sources</div>
            {(trends.by_source || []).slice(0, 5).map((item) => (
              <div key={item.label} className="intel-bar-row">
                <span>{item.label}</span>
                <div className="intel-bar-track"><div className="intel-bar-fill" style={{ width: `${Math.min(100, item.count * 10)}%` }} /></div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </article>
          <article className="intel-detail-card">
            <div className="intel-detail-label">Top Countries</div>
            {(trends.by_country || []).slice(0, 5).map((item) => (
              <div key={item.label} className="intel-bar-row">
                <span>{item.label}</span>
                <div className="intel-bar-track"><div className="intel-bar-fill" style={{ width: `${Math.min(100, item.count * 12)}%` }} /></div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </article>
          <article className="intel-detail-card">
            <div className="intel-detail-label">IOC Types</div>
            {(trends.by_ioc_type || []).slice(0, 5).map((item) => (
              <div key={item.label} className="intel-bar-row">
                <span>{item.label}</span>
                <div className="intel-bar-track"><div className="intel-bar-fill" style={{ width: `${Math.min(100, item.count * 12)}%` }} /></div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </article>
          <article className="intel-detail-card">
            <div className="intel-detail-label">Recent Timeline</div>
            {(trends.timeline || []).slice(-5).map((item) => (
              <div key={item.label} className="intel-bar-row">
                <span>{item.label}</span>
                <div className="intel-bar-track"><div className="intel-bar-fill" style={{ width: `${Math.min(100, item.count * 16)}%` }} /></div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </article>
        </div>
      </section>

      <section className="intel-section-card fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow">
            <DatabaseZap size={14} />
            Background Jobs
          </div>
          <h2 className="intel-section-title">What succeeded, what failed, and what is waiting in retry</h2>
          <p className="intel-section-copy">
            This operational panel tracks the automated feed collection jobs and the retry queue behind the intelligence stream.
          </p>
        </div>

        <div className="intel-grid-two">
          {(jobs.jobs || []).map((item) => (
            <article key={item.job_name} className="intel-detail-card">
              <div className="intel-detail-label">{item.job_name}</div>
              <div className="intel-detail-value">{item.status}</div>
              <p className="intel-detail-copy">
                Last run: {item.finished_at || item.started_at || 'Unknown'}
              </p>
              <p className="intel-detail-copy">
                {item.message || 'No message'} {item.stats?.saved !== undefined ? `| saved ${item.stats.saved}` : ''}
              </p>
            </article>
          ))}
          <article className="intel-detail-card">
            <div className="intel-detail-label">Retry Queue</div>
            <div className="intel-detail-value">{(jobs.retry_queue || []).length}</div>
            <div className="intel-tag-wrap">
              {(jobs.retry_queue || []).slice(0, 6).map((item) => (
                <span key={item.id} className="intel-tag-chip">
                  {item.source} attempt {item.attempts}
                </span>
              ))}
              {!jobs.retry_queue?.length ? <span className="intel-detail-copy">Retry queue is currently empty.</span> : null}
            </div>
          </article>
        </div>
      </section>

      <section className="intel-section-card fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow">
            <DatabaseZap size={14} />
            Source Confidence
          </div>
          <h2 className="intel-section-title">Weighted reliability by source</h2>
          <p className="intel-section-copy">
            Not all sources are treated equally. These weights help Trustive AI score findings more realistically.
          </p>
        </div>
        <div className="intel-grid-two">
          {sources.map((item) => (
            <article key={item.key || item.name} className="intel-detail-card">
              <div className="intel-detail-label">{item.name}</div>
              <div className="intel-detail-value">{Math.round(Number(item.confidence_score || 0) * 100)}%</div>
              <p className="intel-detail-copy">
                {item.confidence_label || 'moderate'} confidence | {item.status}
              </p>
              {item.last_error ? <p className="intel-detail-copy">{item.last_error}</p> : null}
            </article>
          ))}
        </div>
      </section>

      {!feed.length && !error ? (
        <div className="intel-empty-card">No threat intelligence items are available yet.</div>
      ) : (
        <section className="intel-section-card fade-in-delay-3">
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
              <article key={item.id} className="intel-feed-row intel-feed-row-wide">
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
                <div>
                  <Link className="intel-inline-link" to={buildIocPath(item.threat_type, item.indicator)}>
                    IOC details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
