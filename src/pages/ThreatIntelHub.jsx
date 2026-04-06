import { useEffect, useState } from 'react'

import ShareThreatActions from '../components/ShareThreatActions'
import { apiRequest, API_BASE_URL } from '../services/api'

export default function ThreatIntelHub() {
  const [sources, setSources] = useState([])
  const [feed, setFeed] = useState([])
  const [error, setError] = useState('')
  const [collecting, setCollecting] = useState(false)

  useEffect(() => {
    Promise.all([
      apiRequest('/api/intelligence/sources-status'),
      apiRequest('/api/community/threats'),
    ])
      .then(([sourcesPayload, feedPayload]) => {
        setSources(sourcesPayload.sources || [])
        setFeed(feedPayload || [])
      })
      .catch((err) => setError(err.message))
  }, [])

  const collectNow = async () => {
    setCollecting(true)
    try {
      await apiRequest('/api/intelligence/collect-now', { method: 'POST' })
      const refreshed = await apiRequest('/api/community/threats')
      setFeed(refreshed || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setCollecting(false)
    }
  }

  return (
    <section className="platform-page">
      <div className="platform-hero split">
        <div>
          <p className="platform-eyebrow">Threat Intel</p>
          <h1>Threat Intelligence Hub</h1>
          <p>
            Review public feeds, force a fresh collection run, and share high-value indicators.
          </p>
        </div>
        <button type="button" className="platform-button" onClick={collectNow} disabled={collecting}>
          {collecting ? 'Collecting...' : 'Collect Feeds Now'}
        </button>
      </div>

      {error && <div className="platform-alert error">{error}</div>}

      <div className="platform-grid two-up">
        <article className="platform-panel">
          <h3>Active Sources</h3>
          <div className="platform-list">
            {sources.map((source) => (
              <div key={source.name} className="platform-list-item">
                <div>
                  <strong>{source.name}</strong>
                  <p>{source.type}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="platform-panel">
          <h3>Developer Access</h3>
          <p>OpenAPI guide: <a href={`${API_BASE_URL}/api/public/guide`} target="_blank" rel="noreferrer">/api/public/guide</a></p>
          <p>Swagger UI: <a href={`${API_BASE_URL}/api/docs`} target="_blank" rel="noreferrer">/api/docs</a></p>
          <p>CLI package entry point: <code>python -m trustive_cli</code></p>
        </article>
      </div>

      <div className="platform-grid">
        {feed.slice(0, 8).map((item) => (
          <article key={item.id} className="platform-panel">
            <div className="platform-panel-header">
              <div>
                <h3>{item.indicator}</h3>
                <p>{item.threat_type} • risk {item.risk_score}</p>
              </div>
              <span className={`platform-badge ${item.threat_level}`}>{item.threat_level}</span>
            </div>

            <ShareThreatActions
              title={`${item.threat_type.toUpperCase()} indicator`}
              summary={`Trustive AI flagged ${item.indicator} with score ${item.risk_score}.`}
              shareUrl={`${API_BASE_URL}/community?threat=${item.id}`}
            />
          </article>
        ))}
      </div>
    </section>
  )
}
