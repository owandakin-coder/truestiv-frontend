import { useState } from 'react'

import ShareThreatActions from '../components/ShareThreatActions'
import { apiRequest, API_BASE_URL } from '../services/api'

const initialForm = {
  channel: 'email',
  sender: '',
  phone_number: '',
  subject: '',
  content: '',
}

export default function AnalysisWorkbench() {
  const [form, setForm] = useState(initialForm)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const payload = await apiRequest('/api/analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })
      setResult(payload)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="platform-page">
      <div className="platform-hero">
        <div>
          <p className="platform-eyebrow">Priority 2 and 6</p>
          <h1>Transformer-Powered Analysis</h1>
          <p>Analyze email, SMS, or WhatsApp content and share notable findings externally.</p>
        </div>
      </div>

      {error && <div className="platform-alert error">{error}</div>}

      <div className="platform-grid two-up">
        <form className="platform-panel" onSubmit={submit}>
          <h3>Analyze Message</h3>

          <label className="platform-field">
            <span>Channel</span>
            <select value={form.channel} onChange={(event) => update('channel', event.target.value)}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>

          {form.channel === 'email' ? (
            <>
              <label className="platform-field">
                <span>Sender</span>
                <input value={form.sender} onChange={(event) => update('sender', event.target.value)} />
              </label>
              <label className="platform-field">
                <span>Subject</span>
                <input value={form.subject} onChange={(event) => update('subject', event.target.value)} />
              </label>
            </>
          ) : (
            <label className="platform-field">
              <span>Phone number</span>
              <input value={form.phone_number} onChange={(event) => update('phone_number', event.target.value)} />
            </label>
          )}

          <label className="platform-field">
            <span>Content</span>
            <input value={form.content} onChange={(event) => update('content', event.target.value)} />
          </label>

          <button type="submit" className="platform-button" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze Threat'}
          </button>
        </form>

        <article className="platform-panel">
          <h3>Result</h3>
          {!result && <p>Run an analysis to generate an AI-backed verdict.</p>}
          {result && (
            <>
              <div className="platform-panel-header">
                <div>
                  <strong>{result.threat_type}</strong>
                  <p>Confidence {result.confidence}%</p>
                </div>
                <span className={`platform-badge ${result.threat_level}`}>{result.threat_level}</span>
              </div>
              <p>{result.summary}</p>
              <p>Recommendation: {result.recommendation}</p>
              {result.indicators?.length > 0 && (
                <p>Indicators: {result.indicators.join(', ')}</p>
              )}
              <ShareThreatActions
                title="Trustive AI analysis result"
                summary={`${result.threat_type} detected with confidence ${result.confidence}%.`}
                shareUrl={`${API_BASE_URL}/analysis?result=${result.id}`}
              />
            </>
          )}
        </article>
      </div>
    </section>
  )
}
