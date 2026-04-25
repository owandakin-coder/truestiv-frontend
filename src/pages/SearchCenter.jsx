import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Radar, Search, ShieldAlert } from 'lucide-react'

import IntelEmptyState from '../components/IntelEmptyState'
import PortalHero from '../components/PortalHero'
import Seo from '../components/Seo'
import { useTheme } from '../components/ThemeProvider'
import { apiRequest } from '../services/api'
import { formatRelativeDate } from '../utils/intelTools'

function paletteFor(theme) {
  const dark = theme !== 'light'
  return {
    text: dark ? '#eff6ff' : '#0f172a',
    muted: dark ? 'rgba(191,219,254,0.72)' : '#475569',
    blue: '#38bdf8',
    yellow: '#fbbf24',
    red: '#fb7185',
    green: '#22c55e',
  }
}

function levelColor(level, palette) {
  const value = String(level || '').toLowerCase()
  if (value === 'threat') return palette.red
  if (value === 'suspicious') return palette.yellow
  if (value === 'safe') return palette.green
  return palette.blue
}

function kindLabel(kind) {
  const value = String(kind || '').toLowerCase()
  if (value === 'collection') return 'collection pipeline'
  return value || 'result'
}

export default function SearchCenter() {
  const { theme } = useTheme()
  const palette = useMemo(() => paletteFor(theme), [theme])
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activeQuery = searchParams.get('q') || ''
  const groupedItems = useMemo(() => {
    const groups = {
      collection: [],
      community: [],
      brief: [],
      result: [],
    }
    items.forEach((item) => {
      const kind = String(item.kind || '').toLowerCase()
      if (kind.includes('collection')) groups.collection.push(item)
      else if (kind.includes('community')) groups.community.push(item)
      else if (kind.includes('brief') || kind.includes('cluster')) groups.brief.push(item)
      else groups.result.push(item)
    })
    return groups
  }, [items])

  useEffect(() => {
    if (!activeQuery || activeQuery.trim().length < 2) {
      setItems([])
      return
    }

    let active = true
    setLoading(true)
    setError('')
    apiRequest(`/api/intelligence/search?q=${encodeURIComponent(activeQuery)}&limit=10`)
      .then((payload) => {
        if (active) setItems(payload.items || [])
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
  }, [activeQuery])

  const submit = (event) => {
    event.preventDefault()
    const normalized = query.trim()
    if (!normalized) return
    setSearchParams({ q: normalized })
  }

  return (
    <section className="intel-shell">
      <Seo
        title={activeQuery ? `Trustive AI | Search: ${activeQuery}` : 'Trustive AI | Global Search'}
        description="Search scans, collected signals, community intelligence, and incident context across Trustive AI."
        path={activeQuery ? `/search?q=${encodeURIComponent(activeQuery)}` : '/search'}
      />

      <PortalHero
        kicker="Global Search"
        title="Global Search"
        copy="Search once, then jump into scans, collected signals, community context, and linked briefs."
        className="fade-in"
      />

      <section className="intel-section-card fade-in-delay-1">
        <form onSubmit={submit} className="intel-search-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by IOC, sender, subject, file name, or summary"
            className="analysis-input"
          />
          <button type="submit" className="intel-button primary">
            <Search size={16} />
            Search
          </button>
        </form>
      </section>

      {loading ? <div className="intel-empty-card">Searching intelligence context...</div> : null}
      {error ? <div className="intel-empty-card">{error}</div> : null}
      {!loading && activeQuery && !items.length ? (
        <IntelEmptyState
          title={`No actionable intelligence matched "${activeQuery}"`}
          copy="Results are limited to suspicious and threat signals from scans, collected intelligence, and related context."
          actionLabel="Open Threat Intel"
          actionTo="/threat-intel"
        />
      ) : null}

      {!loading && !!items.length ? (
        <section className="intel-section-card fade-in-delay-2">
          <div className="intel-section-head">
            <div className="intel-eyebrow">
              <Radar size={14} />
              Search Results
            </div>
            <h2 className="intel-section-title">Matched context</h2>
          </div>

          <div className="search-group-list">
            {[
              ['collection', 'Collection Pipeline'],
              ['community', 'Community Signals'],
              ['brief', 'Briefs and Clusters'],
              ['result', 'Other Results'],
            ].map(([groupKey, label]) => {
              const groupItems = groupedItems[groupKey] || []
              if (!groupItems.length) return null
              return (
                <section key={groupKey} className="search-group-block">
                  <div className="signal-strip-label">{label}</div>
                  <div className="feed-rail">
                    {groupItems.map((item) => (
                      <article key={item.id} className={`intel-feed-row intel-feed-row-wide ${String(item.threat_level || 'info').toLowerCase()}`}>
                        <div className="intel-feed-row-main">
                          <div className="intel-indicator">{item.title}</div>
                          <div className="intel-feed-row-meta">
                            {kindLabel(item.kind).toUpperCase()} | {formatRelativeDate(item.created_at)}
                          </div>
                          <p className="intel-reading-block" style={{ marginTop: 10, color: palette.muted, lineHeight: 1.7 }}>{item.summary}</p>
                        </div>
                        <div className="intel-meta">{kindLabel(item.kind)}</div>
                        <div />
                        <div>
                          <span className="platform-badge" style={{ color: levelColor(item.threat_level, palette), borderColor: `${levelColor(item.threat_level, palette)}33`, background: `${levelColor(item.threat_level, palette)}12` }}>
                            {item.threat_level}
                          </span>
                        </div>
                        <div>
                          {item.details_path ? (
                            <Link className="intel-inline-link" to={item.details_path}>
                              IOC details
                            </Link>
                          ) : (
                            <span className="intel-inline-link intel-inline-link-disabled">
                              <ShieldAlert size={14} style={{ marginRight: 6 }} />
                              Context
                            </span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </section>
      ) : null}
    </section>
  )
}
