import { useEffect, useState } from 'react'

import ShareThreatActions from '../components/ShareThreatActions'
import { apiRequest, API_BASE_URL } from '../services/api'

const defaultForm = {
  mediaType: 'image',
  file: null,
}

export default function MediaWorkbench() {
  const [form, setForm] = useState(defaultForm)
  const [history, setHistory] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    apiRequest('/api/media/history')
      .then((payload) => setHistory(payload.items || []))
      .catch(() => {})
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    if (!form.file) {
      setError('Select a file to analyze.')
      return
    }

    const data = new FormData()
    data.append('media_type', form.mediaType)
    data.append('file', form.file)

    setLoading(true)
    setError('')
    try {
      const payload = await apiRequest('/api/media/analyze', {
        method: 'POST',
        body: data,
      })
      setResult(payload)
      setHistory((current) => [payload, ...current].slice(0, 8))
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
          <p className="platform-eyebrow">Priority 3 and 4</p>
          <h1>Deepfake and Media Analysis</h1>
          <p>
            Upload images, audio, or video for OCR, object recognition, and deepfake heuristics.
          </p>
        </div>
      </div>

      {error && <div className="platform-alert error">{error}</div>}

      <div className="platform-grid two-up">
        <form className="platform-panel" onSubmit={submit}>
          <h3>Analyze Media</h3>
          <label className="platform-field">
            <span>Media type</span>
            <select
              value={form.mediaType}
              onChange={(event) => setForm((current) => ({ ...current, mediaType: event.target.value }))}
            >
              <option value="image">Image</option>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
            </select>
          </label>

          <label className="platform-field">
            <span>File</span>
            <input
              type="file"
              accept="image/*,audio/*,video/*"
              onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
            />
          </label>

          <button type="submit" className="platform-button" disabled={loading}>
            {loading ? 'Analyzing...' : 'Run Media Analysis'}
          </button>
        </form>

        <article className="platform-panel">
          <h3>Latest Result</h3>
          {!result && <p>No analysis run yet.</p>}
          {result && (
            <>
              <div className="platform-panel-header">
                <div>
                  <strong>{result.filename}</strong>
                  <p>{result.media_type}</p>
                </div>
                <span className={`platform-badge ${result.threat_level}`}>{result.threat_level}</span>
              </div>
              <p>{result.summary}</p>
              <p>Risk score: {result.risk_score}</p>
              <p>Deepfake score: {result.deepfake_score}</p>
              {result.ocr_text && <p>OCR: {result.ocr_text}</p>}
              {result.detected_objects?.length > 0 && (
                <p>Objects: {result.detected_objects.join(', ')}</p>
              )}
              <ShareThreatActions
                title="Media security finding"
                summary={`${result.filename} scored ${result.risk_score} for potential synthetic media risk.`}
                shareUrl={`${API_BASE_URL}/scanner?media=${result.id}`}
              />
            </>
          )}
        </article>
      </div>

      <article className="platform-panel">
        <h3>Recent Media Analyses</h3>
        <div className="platform-list">
          {history.map((item) => (
            <div key={`${item.id}-${item.filename}`} className="platform-list-item">
              <div>
                <strong>{item.filename}</strong>
                <p>{item.media_type} • deepfake {item.deepfake_score}</p>
              </div>
              <span className={`platform-badge ${item.threat_level}`}>{item.threat_level}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
