import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe2, RadioTower, ShieldAlert, Users } from 'lucide-react'

import ExpandableFeed from '../components/ExpandableFeed'
import IntelEmptyState from '../components/IntelEmptyState'
import { apiRequest } from '../services/api'
import { buildIocPath } from '../utils/intelTools'

function threatLabel(level) {
  const value = String(level || '').toLowerCase()
  if (!value) return 'unknown'
  return value
}

export default function CommunityIntel() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(true)

  const loadFeed = () => {
    let mounted = true
    apiRequest('/api/community/threats')
      .then((payload) => {
        if (mounted) setItems(payload || [])
      })
      .catch((err) => {
        if (mounted) setError(err.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }

  useEffect(() => {
    setLoading(true)
    const cleanup = loadFeed()
    return cleanup
  }, [])

  useEffect(() => {
    if (!live) return undefined
    const interval = setInterval(() => {
      loadFeed()
    }, 30000)
    return () => clearInterval(interval)
  }, [live])

  const stats = useMemo(() => {
    const total = items.length
    const highRisk = items.filter((item) => ['threat', 'suspicious'].includes(String(item.threat_level || '').toLowerCase())).length
    const uniqueTypes = new Set(items.map((item) => item.threat_type).filter(Boolean)).size
    return { total, highRisk, uniqueTypes }
  }, [items])

  return (
    <section className="intel-shell">
      <div className="intel-hero-card portal-hero community-hero fade-in">
        <div className="intel-hero-content portal-hero-main">
          <div className="intel-eyebrow">
            <span className="intel-eyebrow-dot" />
            Public Community Intelligence
          </div>
          <h1 className="intel-title" style={{ fontSize: 30, lineHeight: 1.3 }}>
            Open threat submissions, promoted findings,<br />and shared public indicators.
          </h1>
          <p className="intel-copy intel-reading-block">
            This page is designed as a public-facing intelligence board for anyone using Trustive AI. It keeps the community feed centered, readable, and easy to scan without requiring private analyst context.
          </p>
          <button className={`intel-button ${live ? 'primary' : 'ghost'}`} type="button" onClick={() => setLive((current) => !current)}>
            {live ? 'Live refresh on' : 'Live refresh off'}
          </button>
        </div>
        <div className="portal-hero-rail">
          <article className="portal-spotlight-card">
            <span className="portal-spotlight-kicker">Public board</span>
            <strong>Community-submitted signals</strong>
            <p>Only moderated suspicious and threat indicators appear in this open feed.</p>
          </article>
        </div>
      </div>

      {error ? <div className="intel-empty-card">{error}</div> : null}
      {loading ? <div className="intel-empty-card">Loading community intelligence...</div> : null}

      <div className="intel-stat-grid fade-in-delay-1">
        <article className="intel-stat-card">
          <RadioTower size={20} color="#38bdf8" />
          <div className="intel-stat-value">{stats.total}</div>
          <div className="intel-stat-label">Published Items</div>
          <p className="intel-stat-copy">Indicators currently visible to the shared public feed.</p>
        </article>
        <article className="intel-stat-card">
          <ShieldAlert size={20} color="#fbbf24" />
          <div className="intel-stat-value">{stats.highRisk}</div>
          <div className="intel-stat-label">Suspicious Or Threat</div>
          <p className="intel-stat-copy">Items that deserve faster review or stronger defensive attention.</p>
        </article>
        <article className="intel-stat-card">
          <Globe2 size={20} color="#22c55e" />
          <div className="intel-stat-value">{stats.uniqueTypes}</div>
          <div className="intel-stat-label">Indicator Classes</div>
          <p className="intel-stat-copy">URLs, IPs, hashes, and any other types already flowing into the board.</p>
        </article>
      </div>

      <section className="intel-section-card fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow">
            <Users size={14} />
            Community Feed
          </div>
          <h2 className="intel-section-title">Centered view of recent community intelligence</h2>
          <p className="intel-section-copy intel-reading-block">
            Anyone can browse this feed to understand what the platform and its users are surfacing most recently.
          </p>
        </div>

        {!loading && !items.length ? (
          <IntelEmptyState
            title="No community intelligence has been published yet"
            copy="The public community board fills only with suspicious and threat findings. Run a scanner request or promote a strong analysis result to help seed the shared feed."
            actionLabel="Open Investigation Center"
            actionTo="/investigation-center/scanner"
          />
        ) : (
          <ExpandableFeed
            items={items}
            initialCount={6}
            className="intel-feed-list"
            renderItem={(item) => (
              <article key={item.id} className="intel-feed-row intel-feed-row-wide">
                <div className="intel-feed-row-main">
                  <div className="intel-indicator">{item.indicator}</div>
                  <div className="intel-feed-row-meta">
                    {item.published_at ? new Date(item.published_at).toLocaleString() : 'Recently published'} | community-promoted indicator in the shared public feed.
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
            )}
          />
        )}
      </section>
    </section>
  )
}
