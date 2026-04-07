import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  FileText,
  Globe,
  Hash,
  Link2,
  Search,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'

import ResultCard from '../components/ResultCard'
import ShareThreatActions from '../components/ShareThreatActions'
import { useTheme } from '../components/ThemeProvider'
import { API_BASE_URL, api, getErrorMessage } from '../services/api'
import {
  buildCommunityPayload,
  downloadJson,
  getPrimaryIndicator,
  makeStorageList,
  readStorageList,
} from '../utils/intelTools'

const tabs = [
  { id: 'url', label: 'URL', icon: Link2 },
  { id: 'ip', label: 'IP', icon: Globe },
  { id: 'hash', label: 'HASH', icon: Hash },
  { id: 'file', label: 'File', icon: FileText },
]

const examples = {
  url: [
    'https://paypa1-security-check.example/login',
    'http://verify-amazon-access.example',
    'https://google.com',
  ],
  ip: ['185.220.101.42', '198.199.100.1', '8.8.8.8'],
  hash: [
    '44d88612fea8a8f36de82e1278abb02f',
    '3395856ce81f2b7382dee72602f798b642f14140',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  ],
  file: ['invoice_payment.exe', 'report.docm', 'archive.zip'],
}

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
    orange: '#38bdf8',
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
  if (level === 'threat') return palette.orange
  if (level === 'suspicious') return palette.yellow
  return palette.green
}

export default function Scanner() {
  const { theme } = useTheme()
  const palette = useMemo(() => getPalette(theme), [theme])

  const [activeTab, setActiveTab] = useState('url')
  const [form, setForm] = useState(initialState)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentScans, setRecentScans] = useState([])
  const [publishState, setPublishState] = useState({ status: 'idle', message: '' })

  useEffect(() => {
    setRecentScans(readStorageList('trustive_scanner_history'))
  }, [])

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const saveScanHistory = (payload) => {
    const history = makeStorageList(
      'trustive_scanner_history',
      {
        id: crypto.randomUUID(),
        type: activeTab,
        value: getPrimaryIndicator(activeTab, payload, currentValueForTab(activeTab, form)),
        threat_level: payload?.threat_level || 'unknown',
        summary: payload?.summary || '',
        created_at: new Date().toISOString(),
      },
      8
    )
    setRecentScans(history)
  }

  const scan = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setPublishState({ status: 'idle', message: '' })

    try {
      let response
      if (activeTab === 'url') {
        response = await api().post('/api/scanner/url', { url: form.url })
      } else if (activeTab === 'ip') {
        response = await api().post('/api/scanner/ip/enhanced', { ip: form.ip })
      } else if (activeTab === 'hash') {
        response = await api().post('/api/scanner/hash', { hash: form.hash })
      } else {
        response = await api().post('/api/scanner/file', {
          filename: form.filename,
          file_size: Number(form.file_size || 0),
          file_hash: form.file_hash,
        })
      }

      setResult(response.data)
      saveScanHistory(response.data)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Scan failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const publishThreat = async () => {
    if (!result) return

    const indicator = getPrimaryIndicator(activeTab, result, currentValueForTab(activeTab, form))
    if (!indicator) return

    setPublishState({ status: 'loading', message: '' })

    try {
      await api().post(
        '/api/community/publish-threat',
        buildCommunityPayload({
          indicator,
          threatType: activeTab === 'file' ? 'file' : activeTab,
          result,
        })
      )

      setPublishState({
        status: 'success',
        message: 'Indicator published to the community feed.',
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

  const exportResult = () => {
    if (!result) return

    downloadJson(`trustive-scan-${activeTab}-${Date.now()}.json`, {
      scan_type: activeTab,
      submitted_at: new Date().toISOString(),
      request: form,
      result,
    })
  }

  const loadRecentScan = (entry) => {
    setActiveTab(entry.type)
    setResult(null)
    setError('')
    setPublishState({ status: 'idle', message: '' })

    if (entry.type === 'url') updateField('url', entry.value)
    if (entry.type === 'ip') updateField('ip', entry.value)
    if (entry.type === 'hash') updateField('hash', entry.value)
    if (entry.type === 'file') updateField('filename', entry.value)
  }

  const currentExamples = examples[activeTab]
  const shareSummary = result?.summary || `Scanner verdict for ${currentValueForTab(activeTab, form)}`
  const shareUrl = `${API_BASE_URL}/scanner?type=${activeTab}`
  const resultLevelColor = typeColor(result?.threat_level, palette)

  return (
    <div style={{ position: 'relative' }}>
      <div className="hero-bg" />
      <div className="grid-dots" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <section className="fade-in" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: palette.orange, boxShadow: '0 0 24px rgba(56,189,248,0.35)' }} />
            <span style={{ fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: palette.orange, fontWeight: 800 }}>
              Advanced Scanner
            </span>
          </div>
          <h1 style={{ fontSize: 46, lineHeight: 1.02, fontWeight: 900, color: palette.text, marginBottom: 12 }}>
            Scanner <span className="gradient-text">Console</span>
          </h1>
          <p style={{ color: palette.muted, maxWidth: 780, fontSize: 15 }}>
            Run URL, IP, HASH, and file scans from one analyst-friendly console using the authenticated API client.
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
                  color: palette.orange,
                  fontWeight: 700,
                  background: 'rgba(37,99,235,0.12)',
                  border: '1px solid rgba(56,189,248,0.18)',
                  borderRadius: 999,
                  padding: '10px 14px',
                }}
              >
                <Sparkles size={16} />
                Authenticated scanner API
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
                    <Icon size={16} color={active ? palette.orange : palette.subtle} />
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

            <div style={{ marginTop: 22 }}>
              <span className="analysis-meta-label">Example Inputs</span>
              <div className="example-grid" style={{ marginTop: 14 }}>
                {currentExamples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      if (activeTab === 'url') updateField('url', example)
                      if (activeTab === 'ip') updateField('ip', example)
                      if (activeTab === 'hash') updateField('hash', example)
                      if (activeTab === 'file') updateField('filename', example)
                    }}
                    style={{
                      borderRadius: 18,
                      padding: '12px 14px',
                      border: palette.border,
                      background: palette.cardStrong,
                      color: palette.muted,
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: activeTab === 'file' ? 'Inter, sans-serif' : 'JetBrains Mono, monospace',
                      wordBreak: 'break-word',
                    }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: 24,
                padding: 18,
                borderRadius: 20,
                border: palette.border,
                background: palette.cardStrong,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Zap size={16} color={palette.orange} />
                <span className="analysis-meta-label">Recent Scans</span>
              </div>
              {!recentScans.length ? (
                <p style={{ margin: 0, color: palette.muted, lineHeight: 1.7 }}>
                  Recent scanner activity will be saved locally so you can rerun common investigations in one click.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {recentScans.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => loadRecentScan(entry)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 18,
                        border: palette.border,
                        background: 'transparent',
                        color: palette.text,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', marginBottom: 4 }}>{entry.type.toUpperCase()}</strong>
                        <span style={{ color: palette.muted, wordBreak: 'break-word' }}>{entry.value}</span>
                      </span>
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
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                  <Shield size={42} color={palette.orange} style={{ marginBottom: 14 }} />
                  <h3 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
                    Pick a scanner and run a request
                  </h3>
                  <p style={{ color: palette.muted }}>
                    Your scan output will appear here with verdicts, scores, indicators, and external links when available.
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
                    <div>
                      <div className="analysis-meta-label">Analyst Actions</div>
                      <div style={{ color: palette.muted, marginTop: 6, lineHeight: 1.6 }}>
                        Export the evidence, share the finding, or promote it directly into the community intelligence feed.
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        borderRadius: 999,
                        color: resultLevelColor,
                        border: `1px solid ${resultLevelColor}28`,
                        background: `${resultLevelColor}12`,
                        fontWeight: 800,
                      }}
                    >
                      <CheckCircle2 size={16} />
                      Ready for action
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={publishThreat}
                      disabled={publishState.status === 'loading'}
                      style={{
                        border: 'none',
                        borderRadius: 999,
                        padding: '12px 18px',
                        background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                        color: '#fff',
                        fontWeight: 800,
                        cursor: publishState.status === 'loading' ? 'wait' : 'pointer',
                      }}
                    >
                      {publishState.status === 'loading' ? 'Publishing...' : 'Promote to Community'}
                    </button>

                    <button
                      type="button"
                      onClick={exportResult}
                      style={{
                        borderRadius: 999,
                        padding: '12px 18px',
                        border: palette.border,
                        background: 'transparent',
                        color: palette.text,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Export JSON
                    </button>
                  </div>

                  <ShareThreatActions
                    title={`Trustive ${activeTab.toUpperCase()} scan`}
                    summary={shareSummary}
                    shareUrl={shareUrl}
                    hashtags={['TrustiveAI', 'ThreatIntel', activeTab.toUpperCase()]}
                  />

                  {publishState.message ? (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 16,
                        color: publishState.status === 'success' ? palette.green : palette.orange,
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
