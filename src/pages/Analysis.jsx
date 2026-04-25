import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react'

import ExpandableFeed from '../components/ExpandableFeed'
import IntelEmptyState from '../components/IntelEmptyState'
import PortalHero from '../components/PortalHero'
import { useTheme } from '../components/ThemeProvider'
import { api, getErrorMessage } from '../services/api'
import {
  buildCommunityPayload,
  detectBrandImpersonation,
  extractIocsFromText,
  makeStorageList,
  normalizeThreatLevel,
  readStorageList,
  titleCase,
} from '../utils/intelTools'

const channelOptions = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: MessageSquareText },
  { id: 'whatsapp', label: 'WhatsApp', icon: Phone },
]

const emptyResultText = 'Run an analysis to generate an AI-backed verdict.'

function isActionable(level) {
  const value = String(level || '').toLowerCase()
  return value.includes('suspicious') || value.includes('threat') || value.includes('dangerous')
}

function toneFor(level) {
  const value = String(level || '').toLowerCase()
  if (value.includes('threat') || value.includes('dangerous') || value.includes('critical')) {
    return { color: '#ff9770', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', icon: AlertTriangle }
  }
  if (value.includes('safe') || value.includes('benign')) {
    return { color: '#86efac', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.3)', icon: CheckCircle2 }
  }
  return { color: '#fdba74', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)', icon: ShieldAlert }
}

function normalizeAnalysis(payload) {
  const source = payload?.result || payload?.analysis || payload || {}
  const indicators = source.indicators || source.flags || source.signals || []
  return {
    id: payload?.id || source.id || null,
    threatLevel: normalizeThreatLevel(source.threat_level || source.threatLevel || source.verdict),
    confidence: Number(source.confidence || source.confidence_score || source.score || 0),
    summary: source.summary || source.description || source.message || 'The engine returned a structured verdict.',
    indicators: Array.isArray(indicators)
      ? indicators.map((item) => (typeof item === 'string' ? item : item?.label || item?.value)).filter(Boolean)
      : [],
    recommendation: source.recommendation || source.next_step || source.action || 'Treat this content as suspicious until independently verified.',
    risk_score: Number(source.risk_score || payload?.risk_score || 0),
    related_threats_count: Number(source.related_threats_count || payload?.related_threats_count || 0),
    raw: source,
  }
}

function primaryIndicator(channel, form, iocs) {
  if (iocs.urls?.[0]) return { indicator: iocs.urls[0], threatType: 'url' }
  if (iocs.ips?.[0]) return { indicator: iocs.ips[0], threatType: 'ip' }
  if (form.sender) return { indicator: form.sender, threatType: channel === 'email' ? 'email' : 'phone' }
  if (form.phone) return { indicator: form.phone, threatType: 'phone' }
  return { indicator: '', threatType: channel === 'email' ? 'email' : 'phone' }
}

function HistoryButton({ entry, onClick, borderColor, textColor, mutedColor }) {
  const tone = toneFor(entry.threat_level)
  return (
    <button
      type="button"
      onClick={() => onClick(entry)}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        borderRadius: 18,
        border: `1px solid ${borderColor}`,
        background: 'transparent',
        color: textColor,
        cursor: 'pointer',
        display: 'grid',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <strong>{titleCase(entry.channel || 'analysis')}</strong>
        <span
          style={{
            padding: '8px 10px',
            borderRadius: 999,
            background: tone.bg,
            border: `1px solid ${tone.border}`,
            color: tone.color,
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          {normalizeThreatLevel(entry.threat_level)}
        </span>
      </div>
      <div style={{ color: mutedColor, lineHeight: 1.6 }}>
        {(entry.subject || entry.sender || entry.summary || 'Open analysis').slice(0, 120)}
      </div>
    </button>
  )
}

export default function Analysis({ embedded = false }) {
  const { theme } = useTheme()
  const client = useMemo(() => api(), [])
  const [channel, setChannel] = useState('email')
  const [form, setForm] = useState({ sender: '', subject: '', phone: '', content: '' })
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [publishState, setPublishState] = useState({ status: 'idle', message: '' })
  const [showResultOnly, setShowResultOnly] = useState(false)

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await client.get('/api/analysis/history', { params: { limit: 6 } })
        setHistory((response.data || []).filter((entry) => isActionable(entry?.threat_level)))
      } catch {
        setHistory(readStorageList('trustive_analysis_history').filter((entry) => isActionable(entry?.threat_level)))
      }
    }
    loadHistory()
  }, [client])

  const dark = theme !== 'light'
  const textColor = dark ? '#f8fafc' : '#0f172a'
  const mutedColor = dark ? 'rgba(226,232,240,0.74)' : '#475569'
  const borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'
  const inputColor = dark ? 'rgba(12,12,16,0.82)' : 'rgba(255,255,255,0.86)'
  const tone = toneFor(result?.threatLevel)
  const ToneIcon = tone.icon
  const inputStyle = {
    width: '100%',
    borderRadius: 18,
    border: `1px solid ${borderColor}`,
    background: inputColor,
    color: textColor,
    padding: '14px 16px',
    outline: 'none',
    fontSize: 15,
  }

  const derivedIocs = useMemo(
    () => extractIocsFromText(form.sender, form.subject, form.content, ...(result?.indicators || [])),
    [form.sender, form.subject, form.content, result?.indicators]
  )
  const analysisRows = useMemo(() => {
    if (!result) return []
    return [
      ['Threat level', String(result.threatLevel || 'unknown').toUpperCase()],
      ['Confidence', `${Math.round(result.confidence || 0)}%`],
      ['Risk score', `${Math.max(0, Math.min(100, Number(result.risk_score || 0)))}%`],
      ['Recommendation', result.recommendation || 'Review manually'],
      ['Summary', result.summary || emptyResultText],
    ]
  }, [result])
  const brandSignals = useMemo(() => {
    const candidates = [...(derivedIocs.domains || []), ...(derivedIocs.urls || [])]
    const unique = Array.from(new Set(candidates.map((item) => String(item || '').trim()).filter(Boolean)))
    return unique
      .map((value) => detectBrandImpersonation(value))
      .filter((signal) => signal?.active)
      .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
      .slice(0, 3)
  }, [derivedIocs])
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const saveLocalHistory = (normalized) => {
    if (!isActionable(normalized?.threatLevel)) return
    const next = makeStorageList(
      'trustive_analysis_history',
      {
        id: normalized.id || crypto.randomUUID(),
        channel,
        sender: form.sender || form.phone,
        subject: form.subject,
        threat_level: String(normalized.threatLevel || '').toLowerCase(),
        summary: normalized.summary,
        confidence: normalized.confidence,
        created_at: new Date().toISOString(),
      },
      8
    )
    setHistory(next)
  }

  const runAnalysis = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setPublishState({ status: 'idle', message: '' })
    try {
      const response = await client.post('/api/analysis/analyze', {
        channel,
        sender: form.sender,
        subject: form.subject,
        phone_number: form.phone,
        content: form.content,
      })
      const normalized = normalizeAnalysis(response.data)
      setResult(normalized)
      setShowResultOnly(true)
      saveLocalHistory(normalized)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to complete the analysis right now.'))
      setResult(null)
      setShowResultOnly(false)
    } finally {
      setLoading(false)
    }
  }

  const startNewAnalysis = () => {
    setResult(null)
    setShowResultOnly(false)
    setError('')
    setPublishState({ status: 'idle', message: '' })
  }

  const publishThreat = async () => {
    if (!result) return
    const primary = primaryIndicator(channel, form, derivedIocs)
    if (!primary.indicator) return
    setPublishState({ status: 'loading', message: '' })
    try {
      await client.post(
        '/api/community/publish-threat',
        buildCommunityPayload({
          indicator: primary.indicator,
          threatType: primary.threatType,
          result: { risk_score: result.risk_score, threat_level: result.threatLevel },
          analysisId: result.id,
        })
      )
      setPublishState({ status: 'success', message: 'Analysis promoted to the community feed.' })
    } catch (requestError) {
      setPublishState({
        status: 'error',
        message: getErrorMessage(requestError, 'Unable to publish this analysis to the community feed.'),
      })
    }
  }

  const applyHistory = (entry) => {
    setChannel(entry.channel || 'email')
    setForm({
      sender: entry.channel === 'email' ? entry.sender || '' : '',
      subject: entry.subject || '',
      phone: entry.channel !== 'email' ? entry.sender || '' : '',
      content: '',
    })
  }

  // Reusable result content component (used in both modes)
  const ResultContent = () => (
    <div className="split-dossier">
      <article
        className="fade-in"
        style={{
          background: dark ? '#07101f' : '#fff',
          border: dark ? '1px solid #0e2040' : `1px solid ${borderColor}`,
          borderRadius: 10,
          padding: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 16,
            padding: 14,
            borderRadius: 8,
            background: dark ? '#08111f' : '#fff',
            border: `1px solid ${tone.color}33`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                color: tone.color,
                background: dark ? '#08111f' : '#fff',
                border: `1px solid ${tone.color}33`,
              }}
            >
              <ToneIcon size={26} />
            </div>
            <div>
              <p style={{ color: dark ? '#4a7ab5' : '#64748b', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                Message Analysis
              </p>
              <h3 style={{ color: textColor, fontSize: 20, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}>
                {result.threatLevel}
              </h3>
            </div>
          </div>

          <div style={{ minWidth: 140 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: dark ? '#4a7ab5' : '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5, textTransform: 'uppercase' }}>Risk Score</span>
              <strong style={{ color: tone.color, fontFamily: 'JetBrains Mono, monospace' }}>{Math.max(0, Math.min(100, Number(result.risk_score || 0)))}%</strong>
            </div>
            <div style={{ height: 8, borderRadius: 2, background: dark ? '#0a1828' : 'rgba(15,23,42,0.08)' }}>
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, Number(result.risk_score || 0)))}%`,
                  height: '100%',
                  borderRadius: 2,
                  background: tone.color,
                }}
              />
            </div>
          </div>
        </div>

        <div className="scanner-result-grid">
          <section
            style={{
              background: dark ? '#08111f' : '#fff',
              border: dark ? '1px solid #0e2040' : `1px solid ${borderColor}`,
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Mail size={16} color="#5ba3f5" />
              <span style={{ color: dark ? '#4a7ab5' : '#64748b', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2 }}>
                Message Context
              </span>
            </div>
            <div style={{ color: textColor, fontSize: 12, lineHeight: 1.8, wordBreak: 'break-word', fontFamily: 'JetBrains Mono, monospace', display: 'grid', gap: 8 }}>
              <div>{channel.toUpperCase()}</div>
              {channel === 'email' && form.sender ? <div>{form.sender}</div> : null}
              {channel === 'email' && form.subject ? <div>{form.subject}</div> : null}
              {channel !== 'email' && form.phone ? <div>{form.phone}</div> : null}
              {result.related_threats_count > 0 ? (
                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 999, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(56,189,248,0.18)', color: '#bae6fd', fontWeight: 700, width: 'fit-content' }}>
                  <ExternalLink size={14} />
                  Related threats: {result.related_threats_count}
                </div>
              ) : null}
            </div>
          </section>

          <section
            style={{
              background: dark ? '#08111f' : '#fff',
              border: dark ? '1px solid #0e2040' : `1px solid ${borderColor}`,
              borderRadius: 8,
              padding: 16,
              display: 'grid',
              gap: 12,
            }}
          >
            <span style={{ color: dark ? '#4a7ab5' : '#64748b', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2 }}>
              Result Breakdown
            </span>
            <div className="intel-result-table">
              {analysisRows.map(([label, value]) => (
                <div key={label} className="intel-result-row">
                  <div className="intel-result-key">{label}</div>
                  <div className="intel-result-value">{value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {Array.isArray(result.indicators) && result.indicators.length > 0 ? (
          <section
            style={{
              marginTop: 18,
              background: dark ? '#08111f' : '#fff',
              border: dark ? '1px solid #0e2040' : `1px solid ${borderColor}`,
              borderRadius: 8,
              padding: 16,
            }}
          >
            <span style={{ color: dark ? '#4a7ab5' : '#64748b', fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2 }}>
              Indicators
            </span>
            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              {result.indicators.map((indicator, index) => (
                <div
                  key={`${indicator}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    color: mutedColor,
                    lineHeight: 1.6,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      marginTop: 8,
                      borderRadius: '50%',
                      background: tone.color,
                      flexShrink: 0,
                    }}
                  />
                  <span>{indicator}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </article>

      {brandSignals.length ? (
        <div className="brief-panel" style={{ borderColor: 'rgba(251,191,36,0.28)', color: '#fde68a' }}>
          <strong style={{ color: '#fef3c7' }}>Possible brand impersonation detected</strong>
          {brandSignals.map((signal) => (
            <div key={`${signal.domain}-${signal.brand}`} style={{ color: mutedColor, lineHeight: 1.6 }}>
              <span style={{ color: textColor, fontWeight: 700 }}>
                {signal.domain}
              </span>
              {signal.brand ? ` may be impersonating ${signal.brand}.` : ' shows typo/lure patterns.'}{' '}
              Score: {signal.score || 0}
            </div>
          ))}
        </div>
      ) : null}

      <div className="brief-panel">
        <div>
          <div className="analysis-meta-label">Actions</div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={publishThreat} disabled={publishState.status === 'loading'} style={{ border: 'none', borderRadius: 999, padding: '12px 18px', background: 'linear-gradient(135deg, #2563eb, #0ea5e9)', color: '#fff', fontWeight: 800, cursor: publishState.status === 'loading' ? 'wait' : 'pointer' }}>
            {publishState.status === 'loading' ? 'Publishing...' : 'Promote to Community'}
          </button>
        </div>
        {publishState.message ? (
          <div style={{ padding: '12px 14px', borderRadius: 16, color: publishState.status === 'success' ? '#86efac' : '#bae6fd', background: publishState.status === 'success' ? 'rgba(74,222,128,0.12)' : 'rgba(37,99,235,0.12)', border: publishState.status === 'success' ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(56,189,248,0.2)' }}>
            {publishState.message}
          </div>
        ) : null}
      </div>
    </div>
  )

  return (
    <section style={{ minHeight: embedded ? 'auto' : 'calc(100vh - 140px)', position: 'relative', color: textColor }}>
      {!embedded ? <div className="hero-bg" /> : null}
      {!embedded ? <div className="grid-dots" /> : null}
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 24 }}>
        {!embedded ? (
          <PortalHero
            kicker="Analysis Studio"
            title="Message Analysis"
            copy="Submit suspicious email, SMS, or WhatsApp content and get a clear verdict."
            className="investigation-hero fade-in"
          />
        ) : null}

        {!showResultOnly ? (
          <div className={embedded ? 'investigation-workspace-flow' : 'investigation-centered-flow'} style={{ alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 24 }}>
              <div className="console-surface">
                <div className="console-heading">
                  <h2>Run Analysis</h2>
                  <p>Choose a channel, paste the message, and run a verdict.</p>
                </div>

                <div className="console-tab-grid">
                  {channelOptions.map((option) => {
                    const Icon = option.icon
                    const active = channel === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setChannel(option.id)}
                        className={`console-tab ${active ? 'is-active' : ''}`}
                      >
                        <Icon size={16} />
                        {option.label}
                      </button>
                    )
                  })}
                </div>

                <form onSubmit={runAnalysis} className="console-form-grid">
                  {channel === 'email' ? (
                    <>
                      <label className="console-input-group"><span>Sender</span><input value={form.sender} onChange={(event) => setField('sender', event.target.value)} placeholder="alerts@company-security.com" style={inputStyle} /></label>
                      <label className="console-input-group"><span>Subject</span><input value={form.subject} onChange={(event) => setField('subject', event.target.value)} placeholder="Urgent payment request" style={inputStyle} /></label>
                    </>
                  ) : (
                    <label className="console-input-group"><span>Phone Number</span><input value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="+1 202 555 0172" style={inputStyle} /></label>
                  )}

                  <label className="console-input-group">
                    <span>Content</span>
                    <textarea value={form.content} onChange={(event) => setField('content', event.target.value)} placeholder="Paste the message content here." rows={10} style={{ ...inputStyle, minHeight: 220, resize: 'vertical', fontFamily: 'inherit' }} />
                  </label>

                  {error ? <div className="console-status" style={{ borderColor: 'rgba(240,64,64,0.3)', color: '#fecaca' }}>{error}</div> : null}

                  <button type="submit" disabled={loading} className="console-cta">
                    {loading ? <Loader2 size={18} className="analysis-spinner" /> : <Sparkles size={18} />}
                    {loading ? 'Analyzing...' : 'Run Analysis'}
                  </button>
                </form>
              </div>

              <div className="feed-surface">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <Zap size={16} color="#7dd3fc" />
                  <span className="analysis-meta-label">Recent Analyses</span>
                </div>
                {!history.length ? (
                  <IntelEmptyState
                    title="No recent high-signal analyses yet"
                    copy="Only suspicious and threat verdicts are kept here."
                    examples={[
                      { label: 'Urgent payroll verification', onClick: () => setForm((current) => ({ ...current, subject: 'Urgent payroll verification request' })) },
                      { label: 'Paste suspicious login URL', onClick: () => setForm((current) => ({ ...current, content: 'Please verify your account at https://secure-paypaI-login-check.com immediately.' })) },
                    ]}
                  />
                ) : (
                  <ExpandableFeed
                    items={history.filter((entry) => isActionable(entry?.threat_level))}
                    initialCount={4}
                    className="recent-rail"
                    renderItem={(entry) => (
                      <div className="recent-rail-item" key={`${entry.id}-${entry.created_at || ''}`}>
                        <HistoryButton entry={entry} onClick={applyHistory} borderColor="transparent" textColor={textColor} mutedColor={mutedColor} />
                      </div>
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          // Modern centered result view – no headings, only result card + New Analysis button
          <div className="fade-in" style={{ maxWidth: embedded ? '100%' : 900, margin: embedded ? 0 : '0 auto', padding: embedded ? 0 : '20px' }}>
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <button onClick={startNewAnalysis} className="console-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                ← New Analysis
              </button>
            </div>
            <div style={{
              background: dark ? 'rgba(255,255,255,0.03)' : '#fff',
              border: `1px solid ${borderColor}`,
              borderRadius: 28,
              padding: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(56,189,248,0.1)',
              backdropFilter: 'blur(8px)',
            }}>
              <ResultContent />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
