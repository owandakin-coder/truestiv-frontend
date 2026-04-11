import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Clock3, Radar, ShieldAlert, Waves } from 'lucide-react'

import { useTheme } from '../components/ThemeProvider'
import { apiRequest } from '../services/api'
import { buildIocPath, formatRelativeDate } from '../utils/intelTools'

function paletteFor(theme) {
  const dark = theme !== 'light'
  return {
    dark,
    text: dark ? '#eff6ff' : '#0f172a',
    muted: dark ? 'rgba(191,219,254,0.72)' : '#475569',
    subtle: dark ? 'rgba(191,219,254,0.5)' : '#64748b',
    blue: '#38bdf8',
    green: '#22c55e',
    yellow: '#fbbf24',
    red: '#fb7185',
    border: dark ? '1px solid rgba(148,163,184,0.14)' : '1px solid rgba(15,23,42,0.08)',
    card: dark ? 'rgba(255,255,255,0.03)' : '#ffffff',
  }
}

function levelColor(level, palette) {
  const value = String(level || '').toLowerCase()
  if (value === 'threat') return palette.red
  if (value === 'suspicious') return palette.yellow
  if (value === 'safe') return palette.green
  return palette.blue
}

const timeRanges = ['24h', '7d', '30d', '90d', 'all']
const sourceOptions = ['all', 'scan', 'community', 'analysis', 'media']
const levelOptions = ['all', 'threat', 'suspicious', 'safe']

export default function IntelTimeline() {
  const { theme } = useTheme()
  const palette = useMemo(() => paletteFor(theme), [theme])

  const [items, setItems] = useState([])
  const [stats, setStats] = useState({ total: 0, high_attention: 0, sources: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [live, setLive] = useState(true)
  const [filters, setFilters] = useState({
    source: 'all',
    threat_level: 'all',
    time_range: '30d',
  })

  const loadTimeline = () => {
    let active = true
    setLoading(true)
    setError('')

    const params = new URLSearchParams({
      source: filters.source,
      threat_level: filters.threat_level,
      time_range: filters.time_range,
      limit: '80',
    })

    apiRequest(`/api/intelligence/timeline?${params.toString()}`)
      .then((payload) => {
        if (!active) return
        setItems(payload.items || [])
        setStats(payload.stats || { total: 0, high_attention: 0, sources: [] })
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
  }

  useEffect(() => {
    return loadTimeline()
  }, [filters])

  useEffect(() => {
    if (!live) return undefined
    const interval = setInterval(() => {
      loadTimeline()
    }, 30000)
    return () => clearInterval(interval)
  }, [live, filters])

  return (
    <section className="intel-shell">
      <div className="intel-hero-card fade-in">
        <div className="intel-hero-content">
          <div className="intel-eyebrow">
            <span className="intel-eyebrow-dot" />
            Unified Intel Timeline
          </div>
          <h1 className="intel-title" style={{ fontSize: 30, lineHeight: 1.3 }}>
            One feed for scanner activity, community publishing,<br />analysis verdicts, and media findings.
          </h1>
          <p className="intel-copy">
            This timeline is the shared operational surface for Trustive AI. It helps you move from the newest event to the full IOC context without bouncing between pages.
          </p>
          <button className={`intel-button ${live ? 'primary' : 'ghost'}`} type="button" onClick={() => setLive((current) => !current)}>
            {live ? 'Live refresh on' : 'Live refresh off'}
          </button>
        </div>
      </div>

      <div className="intel-stat-grid fade-in-delay-1">
        <article className="intel-stat-card">
          <Activity size={20} color={palette.blue} />
          <div className="intel-stat-value">{stats.total || items.length}</div>
          <div className="intel-stat-label">Visible Events</div>
          <p className="intel-stat-copy">Items currently matching the selected filters.</p>
        </article>
        <article className="intel-stat-card">
          <ShieldAlert size={20} color={palette.yellow} />
          <div className="intel-stat-value">{stats.high_attention || 0}</div>
          <div className="intel-stat-label">High Attention</div>
          <p className="intel-stat-copy">Events marked suspicious or threat.</p>
        </article>
        <article className="intel-stat-card">
          <Radar size={20} color={palette.green} />
          <div className="intel-stat-value">{(stats.sources || []).length}</div>
          <div className="intel-stat-label">Active Streams</div>
          <p className="intel-stat-copy">Distinct source classes visible in the filtered timeline.</p>
        </article>
      </div>

      <section className="intel-section-card fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow">
            <Clock3 size={14} />
            Filters
          </div>
          <h2 className="intel-section-title">Focus the timeline</h2>
          <p className="intel-section-copy">
            Narrow the feed by event source, threat level, and time range to zoom in on the most relevant operational activity.
          </p>
        </div>

        <div className="intel-filter-grid">
          <label className="intel-filter-field">
            <span>Source</span>
            <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}>
              {sourceOptions.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="intel-filter-field">
            <span>Threat Level</span>
            <select value={filters.threat_level} onChange={(event) => setFilters((current) => ({ ...current, threat_level: event.target.value }))}>
              {levelOptions.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="intel-filter-field">
            <span>Time Range</span>
            <select value={filters.time_range} onChange={(event) => setFilters((current) => ({ ...current, time_range: event.target.value }))}>
              {timeRanges.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? <div className="intel-empty-card">{error}</div> : null}
      {loading ? <div className="intel-empty-card">Loading unified intelligence timeline...</div> : null}

      {!loading && !items.length ? (
        <div className="intel-empty-card">No timeline events match the current filters yet.</div>
      ) : null}

      {!loading && items.length ? (
        <section className="intel-section-card fade-in-delay-3">
          <div className="intel-section-head">
            <div className="intel-eyebrow">
              <Waves size={14} />
              Live Feed
            </div>
            <h2 className="intel-section-title">Newest intelligence and scan activity</h2>
            <p className="intel-section-copy">
              Each row captures the event source, verdict, timing, and a direct path into IOC details when the event is tied to a concrete indicator.
            </p>
          </div>

          <div className="intel-feed-list">
            {items.map((item) => {
              const path =
                item.details_path ||
                (item.ioc_type && item.indicator ? buildIocPath(item.ioc_type, item.indicator) : '')
              const accent = levelColor(item.threat_level, palette)
              return (
                <article key={item.id} className="intel-feed-row intel-feed-row-wide">
                  <div className="intel-feed-row-main">
                    <div className="intel-indicator">{item.indicator || item.title}</div>
                    <div className="intel-feed-row-meta">
                      {item.title} | {formatRelativeDate(item.created_at)} | source {String(item.event_type || item.source || 'intel').toUpperCase()}
                    </div>
                    <p style={{ marginTop: 10, color: palette.muted, lineHeight: 1.7 }}>
                      {item.summary}
                    </p>
                    {item.actor_tags?.length ? (
                      <div className="intel-tag-wrap" style={{ marginTop: 10 }}>
                        {item.actor_tags.slice(0, 3).map((tag) => (
                          <span key={tag.tag} className="intel-tag-chip">
                            {tag.tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="intel-meta">{item.ioc_type || item.event_type}</div>
                  <div className="intel-feed-row-risk">Risk {item.risk_score || 0}</div>
                  <div>
                    <span className="platform-badge" style={{ color: accent, borderColor: `${accent}33`, background: `${accent}12` }}>
                      {item.threat_level || 'unknown'}
                    </span>
                    <div style={{ marginTop: 8, color: palette.subtle, fontSize: 12 }}>
                      {item.source_confidence_label || 'moderate'} confidence
                    </div>
                  </div>
                  <div>
                    {path ? (
                      <Link className="intel-inline-link" to={path}>
                        IOC details
                      </Link>
                    ) : (
                      <span className="intel-inline-link intel-inline-link-disabled">Context only</span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}
    </section>
  )
}
