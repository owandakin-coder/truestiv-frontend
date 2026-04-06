import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Mail,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react'

import ResultCard from '../components/ResultCard'
import { useTheme } from '../components/ThemeProvider'
import { api } from '../services/api'

const initialForm = {
  sender: '',
  subject: '',
  phone_number: '',
  content: '',
}

const channels = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
]

function getPalette(theme) {
  const dark = theme !== 'light'
  return {
    dark,
    pageBackground: dark ? '#050507' : '#f8fafc',
    card: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.94)',
    cardStrong: dark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(15,23,42,0.08)',
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? 'rgba(255,255,255,0.64)' : '#475569',
    subtle: dark ? 'rgba(255,255,255,0.36)' : '#64748b',
    orange: '#ff6b35',
    orangeGlow: '0 16px 40px rgba(255,107,53,0.24)',
    red: '#ff5c5c',
    yellow: '#fbbf24',
    green: '#00e5a0',
    blue: '#60a5fa',
    inputBg: dark ? 'rgba(255,255,255,0.04)' : 'rgba(248,250,252,0.94)',
  }
}

function extractIps(text) {
  const matches = text.match(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g)
  return [...new Set(matches || [])]
}

function LevelPill({ level, palette }) {
  const config = {
    threat: { label: 'Threat', color: palette.red, icon: AlertTriangle },
    suspicious: { label: 'Suspicious', color: palette.yellow, icon: Eye },
    safe: { label: 'Safe', color: palette.green, icon: CheckCircle2 },
  }[level] || { label: 'Unknown', color: palette.blue, icon: ShieldAlert }

  const Icon = config.icon
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 999,
        fontWeight: 800,
        color: config.color,
        background: `${config.color}16`,
        border: `1px solid ${config.color}22`,
      }}
    >
      <Icon size={16} />
      {config.label}
    </div>
  )
}

export default function Analysis() {
  const { theme } = useTheme()
  const palette = useMemo(() => getPalette(theme), [theme])

  const [channel, setChannel] = useState('email')
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [ipResult, setIpResult] = useState(null)
  const [ipLoading, setIpLoading] = useState(false)

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    setIpResult(null)

    const payload = {
      channel,
      sender: channel === 'email' ? form.sender : '',
      subject: channel === 'email' ? form.subject : '',
      phone_number: channel === 'email' ? '' : form.phone_number,
      content: form.content,
    }

    try {
      const { data } = await api().post('/api/analysis/analyze', payload)
      setResult(data)

      const ips = extractIps(`${form.content} ${form.sender}`)
      if (ips.length > 0) {
        setIpLoading(true)
        try {
          const ipResponse = await api().post('/api/scanner/ip/enhanced', { ip: ips[0] })
          setIpResult(ipResponse.data)
        } catch {
          setIpResult(null)
        } finally {
          setIpLoading(false)
        }
      }
    } catch (requestError) {
      const detail = requestError.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else if (detail?.message) {
        setError(detail.message)
      } else {
        setError('Analysis failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'relative', background: palette.pageBackground }}>
      <div className="hero-bg" />
      <div className="grid-dots" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <section className="fade-in" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: palette.orange, boxShadow: palette.orangeGlow }} />
            <span style={{ fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: palette.orange, fontWeight: 800 }}>
              AI Threat Triage
            </span>
          </div>
          <h1 style={{ fontSize: 46, lineHeight: 1.02, fontWeight: 900, color: palette.text, marginBottom: 12 }}>
            Analysis <span className="gradient-text">Workbench</span>
          </h1>
          <p style={{ color: palette.muted, maxWidth: 760, fontSize: 15 }}>
            Analyze email, SMS, and WhatsApp content using the same premium dashboard language, with AI verdicts and automatic IP intelligence enrichment.
          </p>
        </section>

        <div className="analysis-layout">
          <form
            className="fade-in"
            onSubmit={submit}
            style={{
              background: palette.card,
              border: palette.border,
              borderRadius: 24,
              padding: 28,
              backdropFilter: 'blur(20px)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.24)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
                  Run a fresh threat analysis
                </h2>
                <p style={{ color: palette.muted, fontSize: 14 }}>
                  Select a channel, paste suspicious content, and generate an AI-backed verdict.
                </p>
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: palette.orange,
                  fontWeight: 700,
                  background: 'rgba(255,107,53,0.12)',
                  border: '1px solid rgba(255,107,53,0.18)',
                  borderRadius: 999,
                  padding: '10px 14px',
                }}
              >
                <Sparkles size={16} />
                AI verdict engine
              </div>
            </div>

            <div className="channel-grid" style={{ marginBottom: 24 }}>
              {channels.map(({ id, label, icon: Icon }) => {
                const active = channel === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setChannel(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      padding: '14px 18px',
                      borderRadius: 18,
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: active ? '1px solid rgba(255,107,53,0.24)' : palette.border,
                      background: active ? 'linear-gradient(135deg, rgba(255,107,53,0.18), rgba(255,59,59,0.10))' : palette.cardStrong,
                      color: active ? palette.text : palette.muted,
                      boxShadow: active ? palette.orangeGlow : 'none',
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
                  color: palette.red,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            {channel === 'email' ? (
              <div className="field-grid" style={{ marginBottom: 18 }}>
                <label className="analysis-field">
                  <span>Sender</span>
                  <input
                    className="analysis-input"
                    value={form.sender}
                    onChange={(event) => updateField('sender', event.target.value)}
                    placeholder="alerts@finance-example.com"
                    required
                  />
                </label>
                <label className="analysis-field">
                  <span>Subject</span>
                  <input
                    className="analysis-input"
                    value={form.subject}
                    onChange={(event) => updateField('subject', event.target.value)}
                    placeholder="Urgent wire transfer approval"
                    required
                  />
                </label>
              </div>
            ) : (
              <label className="analysis-field" style={{ marginBottom: 18 }}>
                <span>Phone Number</span>
                <input
                  className="analysis-input"
                  value={form.phone_number}
                  onChange={(event) => updateField('phone_number', event.target.value)}
                  placeholder="+1 202 555 0147"
                  required
                />
              </label>
            )}

            <label className="analysis-field">
              <span>Content</span>
              <textarea
                className="analysis-input analysis-textarea"
                value={form.content}
                onChange={(event) => updateField('content', event.target.value)}
                placeholder="Paste the full message content here..."
                required
                rows={10}
              />
            </label>

            <button
              type="submit"
              className="analysis-submit"
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
                background: 'linear-gradient(135deg, #ff6b35, #ff3b3b)',
                boxShadow: palette.orangeGlow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              {loading ? <span className="analysis-spinner" /> : <Zap size={16} />}
              {loading ? 'Running Analysis...' : 'Run Analysis'}
            </button>
          </form>

          <div className="result-stack">
            <section
              className="fade-in"
              style={{
                background: palette.card,
                border: palette.border,
                borderRadius: 24,
                padding: 28,
                backdropFilter: 'blur(20px)',
                minHeight: 320,
                boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
                <div>
                  <h2 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
                    Analysis Result
                  </h2>
                  <p style={{ color: palette.muted, fontSize: 14 }}>
                    Threat level, confidence, indicators, and recommendation.
                  </p>
                </div>
                {result?.threat_level && <LevelPill level={result.threat_level} palette={palette} />}
              </div>

              {!result ? (
                <div
                  style={{
                    minHeight: 220,
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
                    <ShieldAlert size={40} color={palette.orange} style={{ marginBottom: 14 }} />
                    <h3 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
                      Run an analysis to generate an AI-backed verdict
                    </h3>
                    <p style={{ color: palette.muted, maxWidth: 420 }}>
                      The result panel will populate with the threat level, confidence score, summary, indicators, and recommendation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="analysis-result-grid">
                  <div style={{ background: palette.cardStrong, border: palette.border, borderRadius: 20, padding: 20 }}>
                    <span className="analysis-meta-label">Confidence</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                      <div style={{ flex: 1, height: 10, borderRadius: 999, background: palette.dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}>
                        <div
                          style={{
                            width: `${Math.max(0, Math.min(100, result.confidence || 0))}%`,
                            height: '100%',
                            borderRadius: 999,
                            background: 'linear-gradient(90deg, #ff6b35, #ff3b3b)',
                          }}
                        />
                      </div>
                      <strong style={{ color: palette.orange, fontSize: 20 }}>{result.confidence || 0}%</strong>
                    </div>
                    <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
                      <div>
                        <span className="analysis-meta-label">Summary</span>
                        <p style={{ color: palette.muted, lineHeight: 1.7, marginTop: 8 }}>
                          {result.summary}
                        </p>
                      </div>
                      <div>
                        <span className="analysis-meta-label">Recommendation</span>
                        <p style={{ color: palette.text, fontWeight: 700, marginTop: 8 }}>
                          {result.recommendation || 'allow'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: palette.cardStrong, border: palette.border, borderRadius: 20, padding: 20 }}>
                    <span className="analysis-meta-label">Indicators</span>
                    <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                      {(result.indicators || []).length > 0 ? (
                        result.indicators.map((indicator, index) => (
                          <div key={`${indicator}-${index}`} style={{ display: 'flex', gap: 10, color: palette.muted, lineHeight: 1.6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: palette.orange, marginTop: 7, flexShrink: 0 }} />
                            <span>{indicator}</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: palette.muted }}>No explicit indicators were returned.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {(ipLoading || ipResult) && (
              <section
                className="fade-in"
                style={{
                  background: palette.card,
                  border: palette.border,
                  borderRadius: 24,
                  padding: 24,
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
                  <div>
                    <h2 style={{ color: palette.text, fontSize: 20, fontWeight: 900, marginBottom: 6 }}>
                      IP Intelligence
                    </h2>
                    <p style={{ color: palette.muted, fontSize: 14 }}>
                      Automatic enrichment for any IP found in the sender or message content.
                    </p>
                  </div>
                </div>

                {ipLoading ? (
                  <div
                    style={{
                      minHeight: 140,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 20,
                      background: palette.cardStrong,
                      border: palette.border,
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <span className="analysis-spinner" />
                      <p style={{ marginTop: 14, color: palette.muted }}>Fetching IP intelligence...</p>
                    </div>
                  </div>
                ) : (
                  <ResultCard result={ipResult} type="ip" theme={theme} />
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
