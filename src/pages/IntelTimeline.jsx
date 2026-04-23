import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Clock3, Waves } from 'lucide-react'

import ExpandableFeed from '../components/ExpandableFeed'
import IntelEmptyState from '../components/IntelEmptyState'
import PortalHero from '../components/PortalHero'
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

  const spotlight = items[0] || null
  return (
    <section className="intel-shell zone-timeline">
      <PortalHero
        kicker="Unified Intel Timeline"
        title="Unified Intel Timeline"
        copy="The shortest path from a new event to its IOC context."
        className="timeline-hero portal-hero-left fade-in"

      />


      <section className="intel-section-card timeline-filter-panel fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow">
            <Clock3 size={14} />
            Filters
          </div>
          <h2 className="intel-section-title">Focus the timeline</h2>
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
        <IntelEmptyState
          title="No timeline events match these filters"
          copy="The timeline keeps only suspicious and threat activity. Relax the filters or run a fresh scan."
          actionLabel="Open Threat Intel"
          actionTo="/threat-intel"
        />
      ) : null}

      {!loading && items.length ? (
        <section className="intel-section-card timeline-feed-panel fade-in-delay-3">
          <div className="intel-section-head">
            <div className="intel-eyebrow">
              <Waves size={14} />
              Live Feed
            </div>
            <h2 className="intel-section-title">Newest intelligence and scan activity</h2>
          </div>

          <ExpandableFeed
            items={items}
            initialCount={6}
            className="timeline-rail"
            renderItem={(item) => {
              const path =
                item.details_path ||
                (item.ioc_type && item.indicator ? buildIocPath(item.ioc_type, item.indicator) : '')
              const accent = levelColor(item.threat_level, palette)
              return (
                <article key={item.id} className={`timeline-row ${String(item.threat_level || 'info').toLowerCase()}`}>
                  <div className="timeline-time">{formatRelativeDate(item.created_at)}</div>
                  <div className="timeline-connector">
                    <div className="timeline-track" />
                    <div className="timeline-dot" />
                  </div>
                  <div className="timeline-card">
                    <div className="timeline-card-title">{item.indicator || item.title}</div>
                    <div className="timeline-card-meta">
                      {item.title} | source {String(item.event_type || item.source || 'intel').toUpperCase()} | {item.ioc_type || item.event_type} | risk {item.risk_score || 0}
                    </div>
                    <p className="intel-reading-block" style={{ marginTop: 10 }}>
                      {item.summary}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                      <div className="intel-tag-wrap">
                        {item.actor_tags?.slice(0, 3).map((tag) => (
                          <span key={tag.tag} className="intel-tag-chip">{tag.tag}</span>
                        ))}
                        <span className="platform-badge" style={{ color: accent, borderColor: `${accent}33`, background: `${accent}12` }}>
                          {item.threat_level || 'unknown'}
                        </span>
                      </div>
                      {path ? <Link className="intel-inline-link" to={path}>IOC details</Link> : <span className="intel-inline-link intel-inline-link-disabled">Context only</span>}
                    </div>
                  </div>
                </article>
              )
            }}
          />
        </section>
      ) : null}
    </section>
  )
}
