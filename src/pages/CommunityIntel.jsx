import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'

import ExpandableFeed from '../components/ExpandableFeed'
import IntelEmptyState from '../components/IntelEmptyState'
import PortalHero from '../components/PortalHero'
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

  return (
    <section className="intel-shell zone-community">
      <PortalHero
        kicker="Public Community Intelligence"
        title="Public Community Signals"
        copy="A public board of moderated suspicious and threat signals."
        className="community-hero fade-in"
        actions={(
          <button className={`intel-button ${live ? 'primary' : 'ghost'}`} type="button" onClick={() => setLive((current) => !current)}>
            {live ? 'Live refresh on' : 'Live refresh off'}
          </button>
        )}
      />

      {error ? <div className="intel-empty-card">{error}</div> : null}
      {loading ? <div className="intel-empty-card">Loading community intelligence...</div> : null}

      <section className="intel-section-card community-feed-board fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow">
            <Users size={14} />
            Community Feed
          </div>
          <h2 className="intel-section-title">Recent community intelligence</h2>
        </div>

        {!loading && !items.length ? (
          <IntelEmptyState
            title="No community intelligence has been published yet"
            copy="Only suspicious and threat findings appear here. Run a scanner request or promote a strong analysis result to seed the feed."
            actionLabel="Open Investigation Center"
            actionTo="/investigation-center/scanner"
          />
        ) : (
          <ExpandableFeed
            items={items}
            initialCount={6}
            className="compact-rail"
            renderItem={(item) => (
              <article key={item.id} className={`compact-rail-row ${threatLabel(item.threat_level)}`}>
                <div className="compact-rail-main">
                  <div className="compact-rail-title">{item.indicator}</div>
                  <div className="compact-rail-meta">
                    {item.published_at ? new Date(item.published_at).toLocaleString() : 'Recently published'} | community-promoted indicator in the shared public feed.
                  </div>
                  <div className="compact-rail-copy">
                    Public community signal surfaced as a moderated suspicious or threat indicator.
                  </div>
                  <div className="compact-rail-action">
                    <span className={`platform-badge ${threatLabel(item.threat_level)}`}>{threatLabel(item.threat_level)}</span>
                    <Link className="intel-inline-link" to={buildIocPath(item.threat_type, item.indicator)}>
                      IOC details
                    </Link>
                  </div>
                </div>
              </article>
            )}
          />
        )}
      </section>
    </section>
  )
}
