import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DatabaseZap, GitBranch, Radar, Search, ShieldAlert, Users } from 'lucide-react'

import IntelEmptyState from '../components/IntelEmptyState'
import Seo from '../components/Seo'
import { apiRequest } from '../services/api'
import { formatRelativeDate, levelColor, levelLabel } from '../utils/intelTools'

// ── Helpers ────────────────────────────────────────────────────
// levelColor / levelLabel imported from intelTools
function kindLabel(kind) {
  const v = String(kind || '').toLowerCase()
  if (v.includes('collection')) return 'COLLECTION'
  if (v.includes('community')) return 'COMMUNITY'
  if (v.includes('brief') || v.includes('cluster')) return 'BRIEF'
  return 'RESULT'
}
function kindIcon(kind) {
  const v = String(kind || '').toLowerCase()
  if (v.includes('collection')) return DatabaseZap
  if (v.includes('community')) return Users
  if (v.includes('brief') || v.includes('cluster')) return GitBranch
  return Radar
}

const GROUP_ORDER = [
  { key: 'collection', label: 'COLLECTION PIPELINE', icon: DatabaseZap },
  { key: 'community',  label: 'COMMUNITY SIGNALS',   icon: Users },
  { key: 'brief',      label: 'BRIEFS & CLUSTERS',   icon: GitBranch },
  { key: 'result',     label: 'OTHER RESULTS',        icon: Radar },
]

// ── Main page ───────────────────────────────────────────────────
export default function SearchCenter() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query,   setQuery]   = useState(searchParams.get('q') || '')
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const activeQuery = searchParams.get('q') || ''

  const groupedItems = useMemo(() => {
    const groups = { collection: [], community: [], brief: [], result: [] }
    items.forEach((item) => {
      const kind = String(item.kind || '').toLowerCase()
      if (kind.includes('collection'))               groups.collection.push(item)
      else if (kind.includes('community'))            groups.community.push(item)
      else if (kind.includes('brief') || kind.includes('cluster')) groups.brief.push(item)
      else                                            groups.result.push(item)
    })
    return groups
  }, [items])

  useEffect(() => {
    if (!activeQuery || activeQuery.trim().length < 2) { setItems([]); return }
    let active = true
    setLoading(true); setError('')
    apiRequest(`/api/intelligence/search?q=${encodeURIComponent(activeQuery)}&limit=10`)
      .then((payload) => { if (active) setItems(payload.items || []) })
      .catch((err)    => { if (active) setError(err.message) })
      .finally(()     => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activeQuery])

  const submit = (e) => {
    e.preventDefault()
    const normalized = query.trim()
    if (!normalized) return
    setSearchParams({ q: normalized })
  }

  return (
    <div className="aip-root">
      <Seo
        title={activeQuery ? `Trustive AI | Search: ${activeQuery}` : 'Trustive AI | Global Search'}
        description="Search scans, collected signals, community intelligence, and incident context across Trustive AI."
        path={activeQuery ? `/search?q=${encodeURIComponent(activeQuery)}` : '/search'}
      />
      <div className="grid-dots aip-bg-dots" />
      <div className="aip-inner">

        {/* Hero */}
        <header className="aip-hero fade-in">
          <div className="aip-kicker">
            <span className="aip-kicker-dot" />
            <span className="aip-kicker-text">GLOBAL SEARCH</span>
          </div>
          <h1 className="aip-title">Global Search.</h1>
          <p className="aip-copy">
            Search across scans, collected signals, community context, and linked briefs.
          </p>
        </header>

        {/* Search bar */}
        <form onSubmit={submit} className="aip-searchbar fade-in-delay-1" style={{ marginBottom: 32 }}>
          <Search size={16} style={{ color: 'rgba(148,163,184,.5)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by IOC, sender, subject, file name, or summary…"
            className="aip-search-input"
          />
          <button type="submit" className="aip-analyze-btn">
            Search
          </button>
        </form>

        {error   ? <p className="aip-error fade-in" style={{ borderColor: 'rgba(240,64,64,.28)', color: '#fca5a5' }}>{error}</p> : null}
        {loading ? <p className="aip-loading">Searching intelligence context…</p> : null}

        {!loading && activeQuery && !items.length && !error ? (
          <IntelEmptyState
            title={`No actionable intelligence matched "${activeQuery}"`}
            copy="Results are limited to suspicious and threat signals from scans, collected intelligence, and related context."
            actionLabel="Open Threat Intel"
            actionTo="/threat-intel"
          />
        ) : null}

        {/* Results grouped by kind */}
        {!loading && !!items.length ? (
          <div className="fade-in-delay-2">
            {GROUP_ORDER.map(({ key, label, icon: GroupIcon }) => {
              const groupItems = groupedItems[key] || []
              if (!groupItems.length) return null
              return (
                <div key={key} className="aip-activity" style={{ marginBottom: 20 }}>
                  <div className="aip-activity-hd">
                    <span className="aip-activity-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <GroupIcon size={12} />{label}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'rgba(148,163,184,.4)' }}>
                      {groupItems.length}
                    </span>
                  </div>
                  <div className="aip-thead" style={{ gridTemplateColumns: 'minmax(0,2.5fr) 100px 140px 80px 20px' }}>
                    <span>TITLE</span><span>KIND</span><span>LEVEL</span><span>TIME</span><span />
                  </div>
                  <div className="aip-tbody">
                    {groupItems.map((item) => {
                      const color = levelColor(item.threat_level)
                      const label = levelLabel(item.threat_level)
                      const KIcon = kindIcon(item.kind)
                      return (
                        <div
                          key={item.id}
                          className="aip-trow"
                          style={{ gridTemplateColumns: 'minmax(0,2.5fr) 100px 140px 80px 20px', cursor: item.details_path ? 'pointer' : 'default' }}
                          role={item.details_path ? 'button' : undefined}
                          tabIndex={item.details_path ? 0 : undefined}
                          onClick={item.details_path ? () => navigate(item.details_path) : undefined}
                          onKeyDown={item.details_path ? (e) => e.key === 'Enter' && navigate(item.details_path) : undefined}
                        >
                          <div className="aip-td-indicator">
                            <KIcon size={14} className="aip-trow-icon" />
                            <div style={{ minWidth: 0 }}>
                              <div className="aip-trow-text">{item.title}</div>
                              {item.summary ? (
                                <div style={{ fontSize: 11, color: 'rgba(148,163,184,.45)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.summary}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="aip-td aip-td-type">{kindLabel(item.kind)}</div>
                          <div className="aip-td aip-td-verdict">
                            <span className="aip-verdict-dot" style={{ background: color }} />
                            <span className="aip-verdict-label" style={{ color }}>{label}</span>
                          </div>
                          <div className="aip-td aip-td-time">{formatRelativeDate(item.created_at)}</div>
                          <div className="aip-td aip-td-arrow">
                            {item.details_path ? (
                              <Link to={item.details_path} onClick={(e) => e.stopPropagation()} style={{ color: 'rgba(148,163,184,.4)', textDecoration: 'none' }}>›</Link>
                            ) : (
                              <ShieldAlert size={12} style={{ color: 'rgba(148,163,184,.25)' }} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

      </div>
    </div>
  )
}
