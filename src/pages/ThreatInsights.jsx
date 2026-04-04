import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  Globe2,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  X
} from 'lucide-react'
import Skeleton from '../components/Skeleton'
import { getCacheMetadata, getThreatIntelSnapshot } from '../services/threatIntelService'

const typePalette = {
  phishing: { color: '#ff3b3b', bg: 'rgba(255,59,59,0.1)' },
  malware: { color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  spam: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  social_engineering: { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' }
}

const severityScore = { low: 35, medium: 65, high: 90 }

const formatDate = (value) => {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString()
}

export default function ThreatInsights() {
  const [feed, setFeed] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedType, setSelectedType] = useState('all')
  const [selectedSource, setSelectedSource] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeThreat, setActiveThreat] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [cacheStatus, setCacheStatus] = useState('')

  const load = async ({ forceRefresh = false } = {}) => {
    setLoading(true)
    setError('')

    try {
      const snapshot = await getThreatIntelSnapshot({ forceRefresh })
      setFeed(snapshot.feed || [])
      setStats(snapshot.stats || null)
      setLastUpdated(snapshot.fetchedAt || Date.now())
      setCacheStatus(snapshot.fromCache ? 'Loaded from cache' : 'Fetched live')
    } catch {
      setFeed([])
      setStats(null)
      setError('Failed to fetch threat feed. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const intervalId = setInterval(() => {
      load({ forceRefresh: true })
    }, 5 * 60 * 1000)
    return () => clearInterval(intervalId)
  }, [])

  const latestThreat = useMemo(() => feed[0], [feed])

  const availableTypes = useMemo(() => {
    const types = new Set(feed.map(item => item.threatType).filter(Boolean))
    return ['all', ...types]
  }, [feed])

  const availableSources = useMemo(() => {
    const sources = new Set(feed.map(item => item.source).filter(Boolean))
    return ['all', ...sources]
  }, [feed])

  const filteredFeed = useMemo(() => {
    return feed.filter(item => {
      const matchesType = selectedType === 'all' || item.threatType === selectedType
      const matchesSource = selectedSource === 'all' || item.source === selectedSource
      const matchesQuery = !query
        || item.title.toLowerCase().includes(query.toLowerCase())
        || item.summary.toLowerCase().includes(query.toLowerCase())
      return matchesType && matchesSource && matchesQuery
    })
  }, [feed, selectedType, selectedSource, query])

  const computedStats = useMemo(() => {
    if (stats) {
      return {
        total: stats.total_reports ?? 0,
        verified: stats.verified_reports ?? 0,
        phishing: stats.by_type?.phishing ?? 0
      }
    }

    return {
      total: feed.length,
      verified: feed.filter(i => i.verified).length,
      phishing: feed.filter(i => i.threatType === 'phishing').length
    }
  }, [stats, feed])

  const cacheMeta = getCacheMetadata()

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={{
        background: 'linear-gradient(120deg, rgba(255,107,53,0.08), rgba(255,59,59,0.04))',
        border: '1px solid rgba(255,107,53,0.22)',
        borderRadius: 20,
        padding: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#ff6b35', fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              <Sparkles size={14} /> Threat Intel
            </div>
            <h1 style={{ color: '#fff', margin: '8px 0 6px', fontSize: 30, fontWeight: 900 }}>Threat Intelligence Briefing</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 720, margin: 0 }}>
              Cached + live threat overview with fast filtering for analyst triage.
            </p>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.03)' }}>
              <Clock3 size={14} color="rgba(255,255,255,0.5)" />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Updated: {formatDate(lastUpdated)}</span>
            </div>
            <button onClick={() => load({ forceRefresh: true })} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
              borderRadius: 10,
              padding: '9px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {cacheMeta && (
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.05)', padding: '4px 9px', borderRadius: 999 }}>{cacheStatus || 'Cache status unknown'}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              Cache TTL: {Math.round(cacheMeta.ttlMs / 60000)} minutes
            </span>
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        {[
          { label: 'Total Reports', value: computedStats.total, icon: <Globe2 size={18} color="#ff6b35" /> },
          { label: 'Verified Threats', value: computedStats.verified, icon: <CheckCircle2 size={18} color="#00e5a0" /> },
          { label: 'Phishing Reports', value: computedStats.phishing, icon: <AlertTriangle size={18} color="#ff3b3b" /> }
        ].map(card => (
          <article key={card.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600 }}>{card.label}</span>
              {card.icon}
            </div>
            {loading ? <Skeleton width="40%" height={32} borderRadius={8} /> : <div style={{ color: '#fff', fontSize: 34, fontWeight: 900 }}>{card.value}</div>}
          </article>
        ))}
      </section>

      <section style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ShieldAlert size={17} color="#ff6b35" />
          <h2 style={{ color: '#fff', fontSize: 18, margin: 0 }}>Latest Community Threat</h2>
        </div>

        {loading && <Skeleton height={90} borderRadius={12} />}

        {!loading && !latestThreat ? (
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>No community records available yet.</p>
        ) : null}

        {!loading && latestThreat ? (
          <article style={{ borderRadius: 14, border: '1px solid rgba(255,107,53,0.3)', background: 'rgba(255,107,53,0.07)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <h3 style={{ color: '#fff', margin: 0, fontSize: 20 }}>{latestThreat.title}</h3>
              <span style={{ color: latestThreat.verified ? '#00e5a0' : '#fbbf24', fontSize: 12, fontWeight: 800, letterSpacing: 0.7 }}>
                {latestThreat.verified ? 'VERIFIED' : 'PENDING VERIFICATION'}
              </span>
            </div>
            {!!latestThreat.summary && <p style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.65)' }}>{latestThreat.summary}</p>}
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{formatDate(latestThreat.publishedAt)}</span>
          </article>
        ) : null}
      </section>

      <section style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 0.7fr', gap: 10, marginBottom: 14 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="rgba(255,255,255,0.45)" style={{ position: 'absolute', top: 11, left: 10 }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or summary"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: 'rgba(255,255,255,0.85)',
                padding: '8px 10px 8px 34px'
              }}
            />
          </div>

          <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', padding: '8px 10px' }}>
            {availableSources.map(source => <option key={source} value={source} style={{ color: '#0f172a' }}>{source === 'all' ? 'All sources' : source}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} color="rgba(255,255,255,0.45)" />
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', padding: '8px 10px' }}>
              {availableTypes.map(type => (
                <option key={type} value={type} style={{ color: '#0f172a' }}>
                  {type === 'all' ? 'All types' : type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 12, background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.25)', borderRadius: 10, padding: '10px 12px', color: '#ff9b9b', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={76} borderRadius={12} />)}

          {!loading && filteredFeed.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0 }}>No feed items match current filters.</p>
          )}

          {!loading && filteredFeed.slice(0, 15).map(item => {
            const palette = typePalette[item.threatType] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
            const risk = severityScore[item.severity] ?? 60

            return (
              <article key={item.id} onClick={() => setActiveThreat(item)} style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.015)', padding: 14, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: 15 }}>{item.title}</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: palette.color, background: palette.bg, borderRadius: 999, padding: '5px 10px' }}>
                    {item.threatType.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{item.source}</span>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>•</span>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{formatDate(item.publishedAt)}</span>
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>•</span>
                  <span style={{ color: item.verified ? '#00e5a0' : '#fbbf24', fontSize: 12, fontWeight: 700 }}>{item.verified ? 'Verified' : 'Pending'}</span>
                </div>

                <div style={{ marginTop: 8, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 999 }}>
                  <div style={{ height: '100%', width: `${risk}%`, borderRadius: 999, background: risk >= 85 ? 'linear-gradient(90deg, #ff3b3b, #ef4444)' : risk >= 60 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #10b981, #00e5a0)' }} />
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {activeThreat && (
        <div onClick={() => setActiveThreat(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, background: 'rgba(10,10,12,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 20 }}>{activeThreat.title}</h3>
              <button onClick={() => setActiveThreat(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', marginTop: 0 }}>{activeThreat.summary || 'No additional summary was provided for this report.'}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ fontSize: 12, borderRadius: 999, padding: '5px 10px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}>Source: {activeThreat.source}</span>
              <span style={{ fontSize: 12, borderRadius: 999, padding: '5px 10px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}>Type: {activeThreat.threatType.replace('_', ' ')}</span>
              <span style={{ fontSize: 12, borderRadius: 999, padding: '5px 10px', background: activeThreat.verified ? 'rgba(0,229,160,0.15)' : 'rgba(251,191,36,0.15)', color: activeThreat.verified ? '#00e5a0' : '#fbbf24' }}>{activeThreat.verified ? 'Verified' : 'Pending verification'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{formatDate(activeThreat.publishedAt)}</span>
              {activeThreat.url && (
                <a href={activeThreat.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#ff6b35', fontWeight: 700, textDecoration: 'none' }}>
                  Open source link <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
