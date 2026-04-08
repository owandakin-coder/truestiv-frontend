import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Globe, Hash, Link2, Radar, Search, Shield, Sparkles, Zap } from 'lucide-react'

import ResultCard from '../components/ResultCard'
import { useTheme } from '../components/ThemeProvider'
import { api, getErrorMessage } from '../services/api'
import {
  buildCommunityPayload,
  buildIpLookupPath,
  buildIocPath,
  formatRelativeDate,
  getPrimaryIndicator,
} from '../utils/intelTools'

const tabs = [
  { id: 'url', label: 'URL', icon: Link2 },
  { id: 'ip', label: 'IP', icon: Globe },
  { id: 'hash', label: 'HASH', icon: Hash },
  { id: 'file', label: 'File', icon: FileText },
]

const initialState = {
  url: '',
  ip: '',
  hash: '',
  filename: '',
  file_size: '',
  file_hash: '',
}

function getPalette(theme) {
  const dark = theme !== 'light'
  return {
    dark,
    card: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)',
    cardStrong: dark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(15,23,42,0.08)',
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? 'rgba(255,255,255,0.64)' : '#475569',
    subtle: dark ? 'rgba(255,255,255,0.36)' : '#64748b',
    blue: '#38bdf8',
    green: '#22c55e',
    yellow: '#fbbf24',
  }
}

function tabDescription(tab) {
  if (tab === 'url') return 'Scan links for phishing indicators, reputation clues, and obvious deception patterns.'
  if (tab === 'ip') return 'Check IP reputation and aggregate intelligence from the authenticated backend.'
  if (tab === 'hash') return 'Inspect file hashes against VirusTotal detections and pivot to the original report.'
  return 'Use lightweight file metadata analysis when a direct file upload is not available.'
}

function currentValueForTab(tab, form) {
  if (tab === 'url') return form.url
  if (tab === 'ip') return form.ip
  if (tab === 'hash') return form.hash
  return form.filename
}

function typeColor(level, palette) {
  if (level === 'threat') return '#fb7185'
  if (level === 'suspicious') return palette.yellow
  return palette.green
}

function shouldAutoPublish(result) {
  const level = String(result?.threat_level || '').toLowerCase()
  return level === 'threat' || level === 'suspicious'
}

export default function Scanner() {
  const { theme } = useTheme()
  const palette = useMemo(() => getPalette(theme), [theme])
  const client = useMemo(() => api(), [])
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('url')
  const [form, setForm] = useState(initialState)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')
  const [recentScans, setRecentScans] = useState([])
  const [publishState, setPublishState] = useState({ status: 'idle', message: '' })

  const loadHistory = async (scanType = 'all') => {
    setHistoryLoading(true)
    try {
      const response = await client.get('/api/intelligence/scan-history', {
        params: {
          limit: 8,
          time_range: '30d',
          scan_type: scanType,
        },
      })
      setRecentScans(response.data?.items || [])
    } catch {
      setRecentScans([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    loadHistory(activeTab)
  }, [activeTab])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const scan = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setPublishState({ status: 'idle', message: '' })

    try {
      let response
      if (activeTab === 'url') {
        response = await client.post('/api/scanner/url', { url: form.url })
      } else if (activeTab === 'ip') {
        response = await client.post('/api/scanner/ip/enhanced', { ip: form.ip })
      } else if (activeTab === 'hash') {
        response = await client.post('/api/scanner/hash', { hash: form.hash })
      } else {
        response = await client.post('/api/scanner/file', {
          filename: form.filename,
          file_size: Number(form.file_size || 0),
          file_hash: form.file_hash,
        })
      }

      setResult(response.data)
      await loadHistory(activeTab)
      if (shouldAutoPublish(response.data)) {
        await publishThreat(response.data)
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Scan failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const publishThreat = async (payload = result) => {
    if (!payload) return

    const indicator = getPrimaryIndicator(activeTab, payload, currentValueForTab(activeTab, form))
    if (!indicator) return

    setPublishState({ status: 'loading', message: '' })

    try {
      const response = await client.post(
        '/api/community/publish-threat',
        buildCommunityPayload({
          indicator,
          threatType: activeTab === 'file' ? 'file' : activeTab,
          result: payload,
        })
      )

      setPublishState({
        status: 'success',
        message: response.data?.duplicate
          ? 'This suspicious indicator was already published earlier, so no duplicate entry was created.'
          : 'Suspicious result published automatically to Community and Threat Intel.',
      })
    } catch (requestError) {
      setPublishState({
        status: 'error',
        message: getErrorMessage(
          requestError,
          'Unable to publish this result to the community feed.'
        ),
      })
    }
  }

  const loadRecentScan = (entry) => {
    setActiveTab(entry.scan_type)
    setResult(null)
    setError('')
    setPublishState({ status: 'idle', message: '' })

    if (entry.scan_type === 'url') updateField('url', entry.indicator)
    if (entry.scan_type === 'ip') updateField('ip', entry.indicator)
    if (entry.scan_type === 'hash') updateField('hash', entry.indicator)
    if (entry.scan_type === 'file') updateField('filename', entry.indicator)
  }

  const resultLevelColor = typeColor(String(result?.threat_level || '').toLowerCase(), palette)
  const detailPath = result
    ? buildIocPath(activeTab === 'file' ? 'file' : activeTab, getPrimaryIndicator(activeTab, result, currentValueForTab(activeTab, form)))
    : ''
  const ipLookupPath =
    activeTab === 'ip' && result
      ? buildIpLookupPath(getPrimaryIndicator('ip', result, currentValueForTab('ip', form)))
      : ''

  return (
    <div style={{ position: 'relative' }}>
      <div className="hero-bg" />
      <div className="grid-dots" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <section className="fade-in" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: palette.blue, boxShadow: '0 0 24px rgba(56,189,248,0.35)' }} />
            <span style={{ fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: palette.blue, fontWeight: 800 }}>
              Advanced Scanner
            </span>
          </div>
          <h1 style={{ fontSize: 46, lineHeight: 1.02, fontWeight: 900, color: palette.text, marginBottom: 12 }}>
            Scanner <span className="gradient-text">Console</span>
          </h1>
          <p style={{ color: palette.muted, maxWidth: 780, fontSize: 15 }}>
            Run URL, IP, HASH, and file scans from one analyst-friendly console. Every scan is stored server-side and can feed the shared intelligence timeline.
          </p>
        </section>

        <div className="analysis-layout">
          <section
            className="fade-in"
            style={{
              background: palette.card,
              border: palette.border,
              borderRadius: 24,
              padding: 28,
              backdropFilter: 'blur(20px)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
                  Choose a scan type
                </h2>
                <p style={{ color: palette.muted, fontSize: 14 }}>
                  {tabDescription(activeTab)}
                </p>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: palette.blue,
                  fontWeight: 700,
                  background: 'rgba(37,99,235,0.12)',
                  border: '1px solid rgba(56,189,248,0.18)',
                  borderRadius: 999,
                  padding: '10px 14px',
                }}
              >
                <Sparkles size={16} />
                Persistent scan history
              </div>
            </div>

            <div className="channel-grid" style={{ marginBottom: 24 }}>
              {tabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveTab(id)
                      setResult(null)
                      setError('')
                      setPublishState({ status: 'idle', message: '' })
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      padding: '14px 18px',
                      borderRadius: 18,
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: active ? '1px solid rgba(56,189,248,0.24)' : palette.border,
                      background: active ? 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(14,165,233,0.12))' : palette.cardStrong,
                      color: active ? palette.text : palette.muted,
                      boxShadow: active ? '0 16px 40px rgba(14,165,233,0.18)' : 'none',
                    }}
                  >
                    <Icon size={16} color={active ? palette.blue : palette.subtle} />
                    {label}
                  </button>
                )
              })}
            </div>

            {error && (
              <div
                style={{
                  marginBottom: 20,
                  padding: '14px 16px',
                  borderRadius: 18,
                  background: 'rgba(255,92,92,0.10)',
                  border: '1px solid rgba(255,92,92,0.18)',
                  color: '#ff5c5c',
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            {activeTab === 'url' && (
              <label className="analysis-field">
                <span>URL to Scan</span>
                <input
                  className="analysis-input"
                  value={form.url}
                  onChange={(event) => updateField('url', event.target.value)}
                  placeholder="https://suspicious-domain.example/login"
                />
              </label>
            )}

            {activeTab === 'ip' && (
              <label className="analysis-field">
                <span>IP Address</span>
                <input
                  className="analysis-input"
                  value={form.ip}
                  onChange={(event) => updateField('ip', event.target.value)}
                  placeholder="185.220.101.42"
                />
              </label>
            )}

            {activeTab === 'hash' && (
              <label className="analysis-field">
                <span>Hash Value</span>
                <input
                  className="analysis-input"
                  value={form.hash}
                  onChange={(event) => updateField('hash', event.target.value)}
                  placeholder="MD5, SHA1, or SHA256"
                />
              </label>
            )}

            {activeTab === 'file' && (
              <div className="field-grid">
                <label className="analysis-field">
                  <span>Filename</span>
                  <input
                    className="analysis-input"
                    value={form.filename}
                    onChange={(event) => updateField('filename', event.target.value)}
                    placeholder="invoice_attachment.exe"
                  />
                </label>
                <label className="analysis-field">
                  <span>File Size (bytes)</span>
                  <input
                    className="analysis-input"
                    value={form.file_size}
                    onChange={(event) => updateField('file_size', event.target.value)}
                    placeholder="20480"
                  />
                </label>
                <label className="analysis-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Optional Hash</span>
                  <input
                    className="analysis-input"
                    value={form.file_hash}
                    onChange={(event) => updateField('file_hash', event.target.value)}
                    placeholder="Optional hash for stronger validation"
                  />
                </label>
              </div>
            )}

            <button
              type="button"
              onClick={scan}
              disabled={loading}
              style={{
                marginTop: 24,
                width: '100%',
                border: 'none',
                borderRadius: 40,
                padding: '14px 24px',
                cursor: loading ? 'wait' : 'pointer',
                color: '#fff',
                fontWeight: 900,
                fontSize: 15,
                background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                boxShadow: '0 16px 40px rgba(14,165,233,0.24)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              {loading ? <span className="analysis-spinner" /> : <Search size={16} />}
              {loading ? 'Scanning...' : 'Run Scan'}
            </button>

            <div
              style={{
                marginTop: 24,
                padding: 18,
                borderRadius: 20,
                border: palette.border,
                background: palette.cardStrong,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Zap size={16} color={palette.blue} />
                  <span className="analysis-meta-label">Server-side Scan History</span>
                </div>
                <Link to="/timeline" style={{ color: palette.blue, textDecoration: 'none', fontWeight: 800 }}>
                  Open timeline
                </Link>
              </div>
              {historyLoading ? (
                <p style={{ margin: 0, color: palette.muted, lineHeight: 1.7 }}>
                  Loading recent scan history from the backend...
                </p>
              ) : !recentScans.length ? (
                <p style={{ margin: 0, color: palette.muted, lineHeight: 1.7 }}>
                  Recent backend scan history will appear here after you run scanner requests.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {recentScans.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        display: 'grid',
                        gap: 10,
                        padding: '12px 14px',
                        borderRadius: 18,
                        border: palette.border,
                        background: 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => loadRecentScan(entry)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: palette.text,
                            cursor: 'pointer',
                            textAlign: 'left',
                            padding: 0,
                            minWidth: 0,
                          }}
                        >
                          <strong style={{ display: 'block', marginBottom: 4 }}>{String(entry.scan_type || '').toUpperCase()}</strong>
                          <span style={{ color: palette.muted, wordBreak: 'break-word' }}>{entry.indicator}</span>
                        </button>
                        <span
                          style={{
                            padding: '8px 10px',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 800,
                            color: typeColor(entry.threat_level, palette),
                            background: `${typeColor(entry.threat_level, palette)}12`,
                            border: `1px solid ${typeColor(entry.threat_level, palette)}28`,
                          }}
                        >
                          {entry.threat_level}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ color: palette.subtle, fontSize: 13 }}>
                          {formatRelativeDate(entry.created_at)}{entry.country ? ` | ${entry.country}` : ''}
                        </span>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {entry.scan_type === 'ip' ? (
                            <button
                              type="button"
                              onClick={() => navigate(buildIpLookupPath(entry.indicator))}
                              style={{
                                borderRadius: 999,
                                border: '1px solid rgba(34,211,238,0.2)',
                                background: 'rgba(34,211,238,0.08)',
                                color: '#22d3ee',
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                            >
                              IP lookup
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => navigate(entry.details_path)}
                            style={{
                              borderRadius: 999,
                              border: '1px solid rgba(56,189,248,0.2)',
                              background: 'rgba(37,99,235,0.08)',
                              color: palette.blue,
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            IOC details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section
            className="fade-in"
            style={{
              background: palette.card,
              border: palette.border,
              borderRadius: 24,
              padding: 28,
              backdropFilter: 'blur(20px)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
                Scan Result
              </h2>
              <p style={{ color: palette.muted, fontSize: 14 }}>
                Results adapt automatically for URL, IP, HASH, and file scans.
              </p>
            </div>

            {!result ? (
              <div
                style={{
                  minHeight: 280,
                  borderRadius: 22,
                  border: palette.border,
                  background: palette.cardStrong,
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                  padding: 24,
                }}
              >
                <div>
                  <Shield size={42} color={palette.blue} style={{ marginBottom: 14 }} />
                  <h3 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
                    Pick a scanner and run a request
                  </h3>
                  <p style={{ color: palette.muted }}>
                    Your scan output will appear here with verdicts, scores, indicators, and a direct IOC details view.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 18 }}>
                <ResultCard result={result} type={activeTab} theme={theme} />

                <div
                  style={{
                    padding: 18,
                    borderRadius: 20,
                    background: palette.cardStrong,
                    border: palette.border,
                    display: 'grid',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <Radar size={16} color={palette.blue} />
                      <span className="analysis-meta-label">Workflow</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {ipLookupPath ? (
                        <button
                          type="button"
                          onClick={() => navigate(ipLookupPath)}
                          style={{
                            borderRadius: 999,
                            border: '1px solid rgba(34,211,238,0.2)',
                            background: 'rgba(34,211,238,0.08)',
                            color: '#22d3ee',
                            padding: '10px 14px',
                            cursor: 'pointer',
                            fontWeight: 800,
                          }}
                        >
                          Open IP lookup
                        </button>
                      ) : null}
                      {detailPath ? (
                        <button
                          type="button"
                          onClick={() => navigate(detailPath)}
                          style={{
                            borderRadius: 999,
                            border: '1px solid rgba(56,189,248,0.2)',
                            background: 'rgba(37,99,235,0.08)',
                            color: palette.blue,
                            padding: '10px 14px',
                            cursor: 'pointer',
                            fontWeight: 800,
                          }}
                        >
                          Open IOC details
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {publishState.message ? (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 16,
                        color: publishState.status === 'success' ? palette.green : resultLevelColor,
                        background:
                          publishState.status === 'success'
                            ? 'rgba(34,197,94,0.12)'
                            : 'rgba(37,99,235,0.12)',
                        border:
                          publishState.status === 'success'
                            ? '1px solid rgba(34,197,94,0.22)'
                            : '1px solid rgba(56,189,248,0.22)',
                      }}
                    >
                      {publishState.message}
                    </div>
                  ) : shouldAutoPublish(result) ? (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 16,
                        color: resultLevelColor,
                        background: `${resultLevelColor}12`,
                        border: `1px solid ${resultLevelColor}28`,
                      }}
                    >
                      This suspicious result is published automatically into the Community and Threat Intel flow and becomes available in the unified timeline.
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
