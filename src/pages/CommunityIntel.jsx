import { useEffect, useState } from 'react'

import ShareThreatActions from '../components/ShareThreatActions'
import { apiRequest, API_BASE_URL } from '../services/api'

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

  const toggleLike = async (id) => {
    try {
      const payload = await apiRequest(`/api/community/${id}/like`, { method: 'POST' })
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, liked: payload.liked }
            : item
        )
      )
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="platform-page">
      <div className="platform-hero">
        <div>
          <p className="platform-eyebrow">Priority 2</p>
          <h1>Community Threat Feed</h1>
          <p>Share curated threats to X and LinkedIn directly from the community stream.</p>
        </div>
      </div>

      {error && <div className="platform-alert error">{error}</div>}
      {loading && <div className="platform-panel">Loading community intelligence...</div>}

      <div className="platform-grid">
        {items.map((item) => (
          <article key={item.id} className="platform-panel">
            <div className="platform-panel-header">
              <div>
                <h3>{item.indicator}</h3>
                <p>{item.threat_type} • risk {item.risk_score}</p>
              </div>
              <span className={`platform-badge ${item.threat_level}`}>{item.threat_level}</span>
            </div>

            <p>
              Published {item.published_at ? new Date(item.published_at).toLocaleString() : 'recently'}
            </p>

            <ShareThreatActions
              title={`${item.threat_type.toUpperCase()} indicator`}
              summary={`Indicator ${item.indicator} currently scores ${item.risk_score}.`}
              shareUrl={`${API_BASE_URL}/community?threat=${item.id}`}
            />

            <button type="button" className="platform-button ghost" onClick={() => toggleLike(item.id)}>
              {item.liked ? 'Unlike' : 'Like'}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
