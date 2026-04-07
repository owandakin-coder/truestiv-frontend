import { useEffect, useMemo, useState } from 'react'
import { Globe2, RadioTower, ShieldAlert, Users } from 'lucide-react'

import { apiRequest } from '../services/api'

function threatLabel(level) {
  const value = String(level || '').toLowerCase()
  if (!value) return 'unknown'
  return value
}

export default function CommunityIntel() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [])

  const stats = useMemo(() => {
    const total = items.length
    const highRisk = items.filter((item) => ['threat', 'suspicious'].includes(String(item.threat_level || '').toLowerCase())).length
    const uniqueTypes = new Set(items.map((item) => item.threat_type).filter(Boolean)).size
    return { total, highRisk, uniqueTypes }
  }, [items])

  return (
    <section className="intel-shell">
      <div className="intel-hero-card fade-in">
        <div className="intel-hero-content">
          <div className="intel-eyebrow">
            <span className="intel-eyebrow-dot" />
            Public Community Intelligence
          </div>
          <h1 className="intel-title">Open threat submissions, promoted findings, and shared public indicators.</h1>
          <p className="intel-copy">
            This page is designed as a public-facing intelligence board for anyone using Trustive AI. It keeps the community feed centered, readable, and easy to scan without requiring private analyst context.
          </p>
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
          <p className="intel-section-copy">
            Anyone can browse this feed to understand what the platform and its users are surfacing most recently.
          </p>
        </div>

        {!loading && !items.length ? (
          <div className="intel-empty-card">No community threats have been published yet.</div>
        ) : (
          <div className="intel-feed-list">
            {items.map((item) => (
              <article key={item.id} className="intel-feed-row">
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
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
