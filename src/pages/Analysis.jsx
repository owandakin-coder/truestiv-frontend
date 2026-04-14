import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  Radar,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react'

import ResultCard from '../components/ResultCard'
import ExpandableFeed from '../components/ExpandableFeed'
import IntelEmptyState from '../components/IntelEmptyState'
import { useTheme } from '../components/ThemeProvider'
import { api, getErrorMessage } from '../services/api'
import {
  buildCommunityPayload,
  detectBrandImpersonation,
  extractIocsFromText,
  flattenIocs,
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

function pivotConfig(type, value) {
  if (type === 'ip') return { path: '/api/scanner/ip/enhanced', body: { ip: value }, resultType: 'ip' }
  if (type === 'hash') return { path: '/api/scanner/hash', body: { hash: value }, resultType: 'hash' }
  if (type === 'domain') return { path: '/api/scanner/url', body: { url: `https://${value}` }, resultType: 'url' }
  return { path: '/api/scanner/url', body: { url: value }, resultType: 'url' }
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
  const [ipIntel, setIpIntel] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [publishState, setPublishState] = useState({ status: 'idle', message: '' })
  const [pivot, setPivot] = useState({ loading: false, error: '', result: null, type: 'url', value: '' })

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
  const panelColor = dark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)'
  const inputColor = dark ? 'rgba(12,12,16,0.82)' : 'rgba(255,255,255,0.86)'
  const tone = toneFor(result?.threatLevel)
  const ToneIcon = tone.icon
  const cardStyle = {
    borderRadius: 24,
    border: `1px solid ${borderColor}`,
    background: panelColor,
    backdropFilter: 'blur(18px)',
    boxShadow: '0 24px 70px rgba(0,0,0,0.24)',
  }
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
  const allIocs = useMemo(() => flattenIocs(derivedIocs), [derivedIocs])
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
    if (!isActionable(normalized?.threatLevel)) {
      return
    }
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

  const fetchIpIntel = async (ips) => {
    if (!ips.length) return setIpIntel([])
    const responses = await Promise.all(
      ips.slice(0, 3).map(async (ip) => {
        try {
          const response = await client.post('/api/scanner/ip/enhanced', { ip })
          return { ip, data: response.data }
        } catch {
          return { ip, data: { threat_level: 'Unavailable', summary: 'IP intelligence is currently unavailable.' } }
        }
      })
    )
    setIpIntel(responses)
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
      saveLocalHistory(normalized)
      const iocs = extractIocsFromText(form.sender, form.subject, form.content, ...(normalized.indicators || []))
      await fetchIpIntel(iocs.ips)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to complete the analysis right now.'))
      setResult(null)
      setIpIntel([])
    } finally {
      setLoading(false)
    }
  }

  const runPivot = async (type, value) => {
    const config = pivotConfig(type, value)
    setPivot({ loading: true, error: '', result: null, type: config.resultType, value })
    try {
      const response = await client.post(config.path, config.body)
      setPivot({ loading: false, error: '', result: response.data, type: config.resultType, value })
    } catch (requestError) {
      setPivot({
        loading: false,
        error: getErrorMessage(requestError, 'Unable to enrich this IOC right now.'),
        result: null,
        type: config.resultType,
        value,
      })
    }
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
        message: getErrorMessage(
          requestError,
          'Unable to publish this analysis to the community feed.'
        ),
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

  return (
    <section style={{ minHeight: embedded ? 'auto' : 'calc(100vh - 140px)', position: 'relative', color: textColor }}>
      {!embedded ? <div className="hero-bg" /> : null}
      {!embedded ? <div className="grid-dots" /> : null}
      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 24 }}>
        {!embedded ? (
          <section className="portal-hero portal-hero-single investigation-hero fade-in" style={{ marginBottom: 8 }}>
            <div className="portal-hero-main">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 24px rgba(56,189,248,0.35)' }} />
                <span style={{ fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: '#38bdf8', fontWeight: 800 }}>
                  Analysis Studio
                </span>
              </div>
              <h1 style={{ fontSize: 35, lineHeight: 1.02, fontWeight: 900, color: textColor, marginBottom: 12 }}>
                Message <span className="gradient-text">Analysis</span>
              </h1>
              <p className="portal-hero-copy" style={{ color: mutedColor }}>
                Submit suspicious email, SMS, or WhatsApp content and get a clear verdict with direct pivots into IOC and infrastructure context.
              </p>
            </div>
          </section>
        ) : null}

        <div className="investigation-console-grid" style={{ alignItems: 'start' }}>
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
                  copy="Only suspicious and threat verdicts are kept here. Try a phishing-style subject or a message that includes a suspicious link to seed the public analysis flow."
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

          <div style={{ display: 'grid', gap: 24 }}>
            <div className="dossier-surface">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Result</div>
                  <h2 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 900 }}>Analysis outcome</h2>
                </div>
                {result ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 999, color: tone.color, border: `1px solid ${tone.border}`, background: tone.bg, fontWeight: 800 }}>
                    <ToneIcon size={16} />
                    {result.threatLevel}
                  </div>
                ) : null}
              </div>

              {!result ? (
                <IntelEmptyState
                  title="Run an analysis to generate an AI-backed verdict"
                  copy="Try a phishing-style subject, a suspicious SMS, or a WhatsApp lure with a short link."
                  icon={Radar}
                  examples={[
                    { label: 'Email fraud example', onClick: () => { setChannel('email'); setForm({ sender: 'finance-update@secure-paypaI.com', subject: 'Urgent invoice confirmation', phone: '', content: 'Review the updated invoice at https://secure-paypaI-login-check.com before end of day.' }) } },
                    { label: 'SMS lure example', onClick: () => { setChannel('sms'); setForm({ sender: '', subject: '', phone: '+1 202 555 0172', content: 'Your package is pending. Confirm delivery at https://fedex-secure-track-check.com' }) } },
                  ]}
                />
              ) : (
                <div className="split-dossier">
                  <div className="investigation-stat-grid">
                    <div className="investigation-stat">
                      <span className="analysis-meta-label">Threat Level</span>
                      <strong>{result.threatLevel}</strong>
                      <p>Current verdict for the submitted message.</p>
                    </div>
                    <div className="investigation-stat">
                      <span className="analysis-meta-label">Confidence</span>
                      <strong>{Math.round(result.confidence || 0)}%</strong>
                      <p>Model confidence for this analysis outcome.</p>
                    </div>
                  </div>

                  <div className="brief-panel intel-reading-block">
                    <strong style={{ display: 'block', marginBottom: 10, color: textColor }}>Summary</strong>
                    {result.summary}
                  </div>

                  <div className="brief-panel intel-reading-block">
                    <strong style={{ display: 'block', marginBottom: 10, color: textColor }}>Recommendation</strong>
                    {result.recommendation}
                    {result.related_threats_count > 0 ? (
                      <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 999, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(56,189,248,0.18)', color: '#bae6fd', fontWeight: 700 }}>
                        <ExternalLink size={15} />
                        Related threats detected: {result.related_threats_count}
                      </div>
                    ) : null}
                  </div>

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
                      <div className="analysis-meta-label">Public Actions</div>
                      <div style={{ color: mutedColor, marginTop: 6, lineHeight: 1.6 }}>Promote the strongest indicator to community intelligence when the verdict deserves shared visibility.</div>
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
              )}
            </div>

            <div className="dossier-surface">
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Technical Context</div>
                <h2 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900 }}>IOC enrichment pivots</h2>
              </div>
              {!allIocs.length ? (
                <div style={{ borderRadius: 20, border: `1px dashed ${borderColor}`, padding: 20, color: mutedColor, lineHeight: 1.7 }}>
                  URLs, IPs, domains, and hashes extracted from the message and returned indicators will appear here for one-click enrichment.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 18 }}>
                  <div className="artifact-chip-row">
                    {allIocs.map((item) => {
                      const enrichable = ['url', 'ip', 'hash', 'domain'].includes(item.type)
                      return (
                        <button key={`${item.type}-${item.value}`} type="button" className="artifact-chip" disabled={!enrichable} onClick={() => enrichable && runPivot(item.type, item.value)} style={{ opacity: enrichable ? 1 : 0.55, cursor: enrichable ? 'pointer' : 'default' }}>
                          {item.type.toUpperCase()}: {item.value}
                        </button>
                      )
                    })}
                  </div>
                  {pivot.loading ? <div style={{ borderRadius: 20, border: `1px solid ${borderColor}`, background: inputColor, padding: 20, color: mutedColor, display: 'flex', alignItems: 'center', gap: 12 }}><Loader2 size={18} className="analysis-spinner" />Enriching {pivot.value}...</div> : null}
                  {pivot.error ? <div style={{ borderRadius: 20, border: '1px solid rgba(56,189,248,0.2)', background: 'rgba(37,99,235,0.12)', padding: 16, color: '#bae6fd' }}>{pivot.error}</div> : null}
                  {pivot.result ? <ResultCard result={pivot.result} type={pivot.type} theme={theme} /> : null}
                </div>
              )}
            </div>

            <div className="dossier-surface">
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.18em' }}>IP Intelligence</div>
                <h2 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900 }}>Infrastructure pivot</h2>
              </div>
              {!ipIntel.length ? (
                <div style={{ borderRadius: 20, border: `1px dashed ${borderColor}`, padding: 20, color: mutedColor, lineHeight: 1.7 }}>
                  If the content exposes IP addresses, enhanced infrastructure intelligence will appear here automatically after the analysis completes.
                </div>
              ) : (
                <div className="result-stack" style={{ display: 'grid', gap: 14 }}>
                  {ipIntel.map((entry) => (
                    <div key={entry.ip} className="brief-panel">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 900, fontSize: 18 }}>{entry.ip}</div>
                        <div style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid rgba(56,189,248,0.2)', background: 'rgba(37,99,235,0.1)', color: '#bae6fd', fontWeight: 700 }}>
                          {normalizeThreatLevel(entry.data?.threat_level || 'unknown')}
                        </div>
                      </div>
                      <div style={{ color: mutedColor, lineHeight: 1.7 }}>{entry.data?.summary || 'Enhanced IP intelligence was collected for this indicator.'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
