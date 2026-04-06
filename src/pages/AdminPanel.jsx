import { useEffect, useState } from 'react'

import { apiRequest } from '../services/api'

export default function AdminPanel() {
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [threats, setThreats] = useState([])
  const [keys, setKeys] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      apiRequest('/api/admin/overview'),
      apiRequest('/api/admin/users'),
      apiRequest('/api/admin/threats'),
      apiRequest('/api/admin/api-keys'),
    ])
      .then(([overviewPayload, usersPayload, threatsPayload, keysPayload]) => {
        setOverview(overviewPayload.metrics || {})
        setUsers(usersPayload.items || [])
        setThreats(threatsPayload.items || [])
        setKeys(keysPayload.items || [])
      })
      .catch((err) => setError(err.message))
  }, [])

  const moderate = async (threatId, approved) => {
    try {
      await apiRequest(`/api/admin/threats/${threatId}/moderate?approved=${approved}`, {
        method: 'POST',
      })
      setThreats((current) =>
        current.map((item) =>
          item.id === threatId ? { ...item, is_moderated: approved } : item
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
          <p className="platform-eyebrow">Priority 7</p>
          <h1>Admin Operations</h1>
          <p>Review users, moderate community threats, and inspect stored API key inventory.</p>
        </div>
      </div>

      {error && <div className="platform-alert error">{error}</div>}

      <div className="platform-grid four-up">
        {overview && Object.entries(overview).map(([key, value]) => (
          <article key={key} className="platform-stat">
            <span>{key.replace(/_/g, ' ')}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="platform-grid two-up">
        <article className="platform-panel">
          <h3>Users</h3>
          <div className="platform-list">
            {users.map((user) => (
              <div key={user.id} className="platform-list-item">
                <div>
                  <strong>{user.username}</strong>
                  <p>{user.email}</p>
                </div>
                <span className={`platform-badge ${user.is_active ? 'safe' : 'suspicious'}`}>
                  {user.is_active ? 'active' : 'disabled'}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="platform-panel">
          <h3>Stored API Keys</h3>
          <div className="platform-list">
            {keys.map((key) => (
              <div key={key.id} className="platform-list-item">
                <div>
                  <strong>{key.provider}</strong>
                  <p>{key.label} • {key.masked_value}</p>
                </div>
                <span className={`platform-badge ${key.is_active ? 'safe' : 'suspicious'}`}>
                  {key.is_active ? 'active' : 'inactive'}
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="platform-panel">
        <h3>Threat Moderation Queue</h3>
        <div className="platform-list">
          {threats.map((threat) => (
            <div key={threat.id} className="platform-list-item stacked">
              <div>
                <strong>{threat.indicator}</strong>
                <p>{threat.threat_type} • risk {threat.risk_score}</p>
              </div>
              <div className="share-actions">
                <span className={`platform-badge ${threat.threat_level}`}>{threat.threat_level}</span>
                <button type="button" className="platform-button" onClick={() => moderate(threat.id, true)}>
                  Approve
                </button>
                <button type="button" className="platform-button secondary" onClick={() => moderate(threat.id, false)}>
                  Flag
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
