import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Globe, Hash, Radio } from 'lucide-react'

import IntelEmptyState from '../components/IntelEmptyState'
import Seo from '../components/Seo'
import { apiRequest } from '../services/api'
import { buildIocPath, formatRelativeDate } from '../utils/intelTools'

const timeRanges    = ['24h', '7d', '30d', '90d', 'all']
const sourceOptions = ['all', 'scan', 'community', 'analysis', 'media']
const levelOptions  = ['all', 'threat', 'suspicious', 'safe']

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

const INITIAL_COUNT = 15

export default function IntelTimeline() {
  const navigate = useNavigate()

  const [items,    setItems]    = useState([])
  const [stats,    setStats]    = useState({ total: 0, high_attention: 0, sources: [] })
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [live,     setLive]     = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [filters,  setFilters]  = useState({ source: 'all', threat_level: 'all', time_range: '30d' })

  const loadTimeline = useCallback(() => {
    let active = true
    setLoading(true)
    setError('')
    const params = new URLSearchParams({
      source:       filters.source,
      threat_level: filters.threat_level,
      time_range:   filters.time_range,
      limit: '80',
    })
    apiRequest(`/api/intelligence/timeline?${params.toString()}`)
      .then((payload) => {
        if (!active) return
        setItems(payload.items || [])
        setStats(payload.stats || { total: 0, high_attention: 0, sources: [] })
      })
      .catch((err) => { if (active) setError(err.message) })
      .finally(()  => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters])

  useEffect(() => loadTimeline(), [loadTimeline])
  useEffect(() => {
    if (!live) return undefined
    const id = setInterval(loadTimeline, 30000)
    return () => clearInterval(id)
  }, [live, loadTimeline])

  function setFilter(key, val) {
    setFilters((f) => ({ ...f, [key]: val }))
    setExpanded(false)
  }

  const visible = expanded ? items : items.slice(0, INITIAL_COUNT)

  return (
    <div className="aip-root">
      <Seo
        title="Trustive AI | Unified Intel Timeline"
        description="Follow the unified timeline of suspicious and threat events across scans, community activity, and collected intelligence."
        path="/timeline"
      />
      <div className="grid-dots aip-bg-dots" />
      <div className="aip-inner">

        {/* Hero */}
        <header className="aip-hero fade-in">
          <div className="aip-kicker">
            <span className="aip-kicker-dot" />
            <span className="aip-kicker-text">UNIFIED INTEL TIMELINE</span>
          </div>
          <h1 className="aip-title">Intelligence in real time.</h1>
          <p className="aip-copy">
            The shortest path from a new event to its IOC context.
            {stats.total ? ` ${stats.total} events · ${stats.high_attention || 0} high-attention.` : ''}
          </p>
        </header>

        {/* Filter bar — flat, no card */}
        <div className="aip-filter-bar fade-in-delay-1">
          <div className="aip-filter-group">
            <span className="aip-filter-label">SOURCE</span>
            <select
              className="aip-filter-select"
              value={filters.source}
              onChange={(e) => setFilter('source', e.target.value)}
            >
              {sourceOptions.map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="aip-filter-group">
            <span className="aip-filter-label">LEVEL</span>
            <select
              className="aip-filter-select"
              value={filters.threat_level}
              onChange={(e) => setFilter('threat_level', e.target.value)}
            >
              {levelOptions.map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="aip-filter-group">
            <span className="aip-filter-label">RANGE</span>
            <select
              className="aip-filter-select"
              value={filters.time_range}
              onChange={(e) => setFilter('time_range', e.target.value)}
            >
              {timeRanges.map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
            </select>
          </div>
          <button
            type="button"
            className={`aip-live-btn${live ? ' is-live' : ''}`}
            onClick={() => setLive((v) => !v)}
          >
            <span className="aip-live-dot" />
            {live ? 'LIVE' : 'PAUSED'}
          </button>
        </div>

        {error   ? <p className="aip-error fade-in" style={{ borderColor: 'rgba(240,64,64,.28)', color: '#fca5a5' }}>{error}</p> : null}
        {loading ? <p className="aip-loading">Loading timeline…</p> : null}

        {!loading && !items.length && !error ? (
          <IntelEmptyState
            title="No timeline events match these filters"
            copy="The timeline keeps only suspicious and threat activity. Relax the filters or run a fresh scan."
            actionLabel="Open Threat Intel"
            actionTo="/threat-intel"
          />
        ) : null}

        {/* Activity table — flat, no card frame */}
        {!loading && items.length ? (
          <div className="aip-activity fade-in-delay-2">
            <div className="aip-activity-hd">
              <span className="aip-activity-label">TIMELINE EVENTS</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(148,163,184,.4)' }}>
                {items.length} events
              </span>
            </div>
            <div className="aip-thead">
              <span>INDICATOR</span>
              <span>TYPE</span>
              <span>LEVEL</span>
              <span>SOURCE</span>
              <span>TIME</span>
              <span />
            </div>
            <div className="aip-tbody">
              {visible.map((item) => {
                const path  = item.details_path || (item.ioc_type && item.indicator ? buildIocPath(item.ioc_type, item.indicator) : null)
                const color = levelColor(item.threat_level)
                const label = levelLabel(item.threat_level)
                const Icon  = rowIcon(item.ioc_type)
                const src   = String(item.event_type || item.source || 'intel').toUpperCase()
                return (
                  <div
                    key={item.id}
                    className="aip-trow"
                    role="button"
                    tabIndex={0}
                    onClick={() => path && navigate(path)}
                    onKeyDown={(e) => e.key === 'Enter' && path && navigate(path)}
                    style={{ cursor: path ? 'pointer' : 'default' }}
                  >
                    <div className="aip-td-indicator">
                      <Icon size={15} className="aip-trow-icon" />
                      <span className="aip-trow-text">{item.indicator || item.title}</span>
                    </div>
                    <div className="aip-td aip-td-type">{String(item.ioc_type || item.event_type || '—').toUpperCase()}</div>
                    <div className="aip-td aip-td-verdict">
                      <span className="aip-verdict-dot" style={{ background: color }} />
                      <span className="aip-verdict-label" style={{ color }}>{label}</span>
                    </div>
                    <div className="aip-td aip-td-source">{src}</div>
                    <div className="aip-td aip-td-time">{formatRelativeDate(item.created_at)}</div>
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
