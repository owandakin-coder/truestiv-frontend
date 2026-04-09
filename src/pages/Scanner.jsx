import { useEffect, useMemo, useState } from 'react'
import { Boxes, FileText, Globe, Hash, Link2, Radar, Search, Shield, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import ResultCard from '../components/ResultCard'
import { useTheme } from '../components/ThemeProvider'
import { api, getErrorMessage } from '../services/api'
import {
  buildCommunityPayload,
  buildDomainLookupPath,
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
  { id: 'bulk', label: 'Bulk IOC', icon: Boxes },
]

const initialForm = { url: '', ip: '', hash: '', filename: '', file_size: '', file_hash: '', bulk_input: '' }

function paletteFor(theme) {
  const dark = theme !== 'light'
  return {
    card: dark ? 'rgba(255,255,255,0.03)' : '#fff',
    strong: dark ? 'rgba(255,255,255,0.04)' : '#fff',
    border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(15,23,42,0.08)',
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? 'rgba(255,255,255,0.64)' : '#475569',
    subtle: dark ? 'rgba(255,255,255,0.36)' : '#64748b',
    blue: '#38bdf8',
    cyan: '#22d3ee',
    green: '#22c55e',
    yellow: '#fbbf24',
    red: '#fb7185',
  }
}

function tabDescription(tab) {
  if (tab === 'url') return 'Inspect suspicious links and obvious phishing patterns.'
  if (tab === 'ip') return 'Check infrastructure reputation with enhanced enrichment.'
  if (tab === 'hash') return 'Pivot file hashes into VirusTotal detections and original reports.'
  if (tab === 'file') return 'Run quick metadata triage for suspicious file names and hashes.'
  return 'Paste one IOC per line and run public enrichment in a single batch.'
}

function levelColor(level, palette) {
  const value = String(level || '').toLowerCase()
  if (value === 'threat') return palette.red
  if (value === 'suspicious') return palette.yellow
  if (value === 'unknown') return palette.cyan
  return palette.green
}

function currentValueForTab(tab, form) {
  if (tab === 'url') return form.url
  if (tab === 'ip') return form.ip
  if (tab === 'hash') return form.hash
  if (tab === 'file') return form.filename
  return form.bulk_input
}

function actionable(level) {
  return ['suspicious', 'threat'].includes(String(level || '').toLowerCase())
}

function Stat({ label, value, copy, accent }) {
  return (
    <article style={{ padding: 18, borderRadius: 20, border: '1px solid rgba(148,163,184,0.14)', background: 'rgba(255,255,255,0.03)', display: 'grid', gap: 8 }}>
      <span className="analysis-meta-label">{label}</span>
      <strong style={{ fontSize: 26, color: accent }}>{value}</strong>
      <span style={{ color: 'rgba(191,219,254,0.72)', lineHeight: 1.6 }}>{copy}</span>
    </article>
  )
}

export default function Scanner({ embedded = false }) {
  const { theme } = useTheme()
  const palette = useMemo(() => paletteFor(theme), [theme])
  const client = useMemo(() => api(), [])
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('url')
  const [form, setForm] = useState(initialForm)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')
  const [recentScans, setRecentScans] = useState([])
  const [publishState, setPublishState] = useState({ status: 'idle', message: '' })

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const loadHistory = async (scanType = 'all') => {
    setHistoryLoading(true)
    try {
      const response = await client.get('/api/intelligence/scan-history', {
        params: { limit: 8, time_range: '30d', scan_type: scanType === 'bulk' ? 'all' : scanType },
      })
      setRecentScans(response.data?.items || [])
    } catch {
      setRecentScans([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    setResult(null)
    setError('')
    setPublishState({ status: 'idle', message: '' })
    loadHistory(activeTab)
  }, [activeTab])

  const publishThreat = async (indicator, threatType, payload) => {
    if (!indicator || !threatType || !payload) return { duplicate: false }
    const response = await client.post('/api/community/publish-threat', buildCommunityPayload({ indicator, threatType, result: payload }))
    return response.data || { duplicate: false }
  }

  const publishBulk = async (items) => {
    const actionableItems = (items || []).filter((item) => ['ip', 'url', 'hash', 'domain'].includes(item.ioc_type) && actionable(item.threat_level))
    if (!actionableItems.length) return
    setPublishState({ status: 'loading', message: '' })
    try {
      const responses = await Promise.all(actionableItems.slice(0, 12).map((item) => publishThreat(item.indicator, item.ioc_type, item)))
      const duplicates = responses.filter((item) => item?.duplicate).length
      const created = responses.length - duplicates
      setPublishState({
        status: 'success',
        message: created > 0
          ? `${created} actionable indicators were promoted into Community and Threat Intel.${duplicates ? ` ${duplicates} duplicates were skipped.` : ''}`
          : 'All actionable indicators were already published earlier, so no duplicate entries were created.',
      })
    } catch (requestError) {
      setPublishState({ status: 'error', message: getErrorMessage(requestError, 'Unable to publish actionable bulk indicators right now.') })
    }
  }

  const runScan = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    setPublishState({ status: 'idle', message: '' })
    try {
      let response
      if (activeTab === 'url') response = await client.post('/api/scanner/url', { url: form.url })
      else if (activeTab === 'ip') response = await client.post('/api/scanner/ip/enhanced', { ip: form.ip })
      else if (activeTab === 'hash') response = await client.post('/api/scanner/hash', { hash: form.hash })
      else if (activeTab === 'file') response = await client.post('/api/scanner/file', { filename: form.filename, file_size: Number(form.file_size || 0), file_hash: form.file_hash })
      else response = await client.post('/api/scanner/bulk', { input: form.bulk_input })

      setResult(response.data)
      await loadHistory(activeTab)

      if (activeTab === 'bulk') {
        await publishBulk(response.data?.items || [])
      } else if (actionable(response.data?.threat_level)) {
        const indicator = getPrimaryIndicator(activeTab, response.data, currentValueForTab(activeTab, form))
        const publishResponse = await publishThreat(indicator, activeTab === 'file' ? 'file' : activeTab, response.data)
        setPublishState({
          status: 'success',
          message: publishResponse?.duplicate
            ? 'This suspicious indicator was already published earlier, so no duplicate entry was created.'
            : 'Suspicious result published automatically to Community and Threat Intel.',
        })
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Scan failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const loadRecentScan = (entry) => {
    const nextTab = ['url', 'ip', 'hash', 'file'].includes(entry.scan_type) ? entry.scan_type : 'url'
    setActiveTab(nextTab)
    if (entry.scan_type === 'url') updateField('url', entry.indicator)
    if (entry.scan_type === 'ip') updateField('ip', entry.indicator)
    if (entry.scan_type === 'hash') updateField('hash', entry.indicator)
    if (entry.scan_type === 'file') updateField('filename', entry.indicator)
  }

  const singleDetailPath = result && activeTab !== 'bulk'
    ? buildIocPath(activeTab === 'file' ? 'file' : activeTab, getPrimaryIndicator(activeTab, result, currentValueForTab(activeTab, form)))
    : ''
  const ipLookupPath = activeTab === 'ip' && result ? buildIpLookupPath(getPrimaryIndicator('ip', result, form.ip)) : ''

  return (
    <div style={{ position: 'relative' }}>
      {!embedded ? <div className="hero-bg" /> : null}
      {!embedded ? <div className="grid-dots" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} /> : null}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {!embedded ? (
          <section className="fade-in" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: palette.blue, boxShadow: '0 0 24px rgba(56,189,248,0.35)' }} />
              <span style={{ fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: palette.blue, fontWeight: 800 }}>Public IOC Scanner</span>
            </div>
            <h1 style={{ fontSize: 46, lineHeight: 1.02, fontWeight: 900, color: palette.text, marginBottom: 12 }}>Scanner <span className="gradient-text">Workspace</span></h1>
            <p style={{ color: palette.muted, maxWidth: 780, fontSize: 15 }}>Run single IOC checks or submit bulk lists to push high-signal findings into the public intelligence flow.</p>
          </section>
        ) : null}

        <div className="analysis-layout">
          <section className="fade-in" style={{ background: palette.card, border: palette.border, borderRadius: 24, padding: 28, backdropFilter: 'blur(20px)', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Run Public Scanner</h2>
              <p style={{ color: palette.muted, fontSize: 14 }}>{tabDescription(activeTab)}</p>
            </div>

            <div className="channel-grid" style={{ marginBottom: 20 }}>
              {tabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id
                return (
                  <button key={id} type="button" onClick={() => setActiveTab(id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 18px', borderRadius: 18, fontWeight: 800, cursor: 'pointer', border: active ? '1px solid rgba(56,189,248,0.24)' : palette.border, background: active ? 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(14,165,233,0.12))' : palette.strong, color: active ? palette.text : palette.muted, boxShadow: active ? '0 16px 40px rgba(14,165,233,0.18)' : 'none' }}>
                    <Icon size={16} color={active ? palette.blue : palette.subtle} />
                    {label}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {activeTab === 'url' ? <label className="analysis-field"><span>URL</span><input className="analysis-input" value={form.url} onChange={(event) => updateField('url', event.target.value)} placeholder="https://suspicious-login.example" /></label> : null}
              {activeTab === 'ip' ? <label className="analysis-field"><span>IP Address</span><input className="analysis-input" value={form.ip} onChange={(event) => updateField('ip', event.target.value)} placeholder="185.220.101.42" /></label> : null}
              {activeTab === 'hash' ? <label className="analysis-field"><span>MD5 / SHA1 / SHA256</span><input className="analysis-input" value={form.hash} onChange={(event) => updateField('hash', event.target.value)} placeholder="44d88612fea8a8f36de82e1278abb02f" /></label> : null}
              {activeTab === 'file' ? (
                <>
                  <label className="analysis-field"><span>Filename</span><input className="analysis-input" value={form.filename} onChange={(event) => updateField('filename', event.target.value)} placeholder="invoice-update.docm" /></label>
                  <div className="field-grid">
                    <label className="analysis-field"><span>File Size</span><input className="analysis-input" value={form.file_size} onChange={(event) => updateField('file_size', event.target.value)} placeholder="102400" /></label>
                    <label className="analysis-field"><span>Optional Hash</span><input className="analysis-input" value={form.file_hash} onChange={(event) => updateField('file_hash', event.target.value)} placeholder="Optional file hash" /></label>
                  </div>
                </>
              ) : null}
              {activeTab === 'bulk' ? <label className="analysis-field"><span>Bulk Indicators</span><textarea className="analysis-textarea" rows={10} value={form.bulk_input} onChange={(event) => updateField('bulk_input', event.target.value)} placeholder={'Paste one indicator per line.\nhttps://example.test/login\n185.220.101.42\n44d88612fea8a8f36de82e1278abb02f\nsuspicious-domain.example'} style={{ minHeight: 240 }} /></label> : null}
              {error ? <div style={{ borderRadius: 18, padding: '14px 16px', border: '1px solid rgba(248,113,113,0.28)', background: 'rgba(248,113,113,0.12)', color: '#fecaca', lineHeight: 1.6 }}>{error}</div> : null}
              <button type="button" onClick={runScan} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12, border: 'none', borderRadius: 999, padding: '14px 24px', background: 'linear-gradient(135deg, #2563eb, #0ea5e9)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: loading ? 'wait' : 'pointer', boxShadow: '0 20px 48px rgba(14,165,233,0.28)' }}>
                <Search size={18} />
                {loading ? 'Scanning...' : activeTab === 'bulk' ? 'Run Bulk Scan' : 'Run Scan'}
              </button>
            </div>

            <div style={{ marginTop: 24, padding: 18, borderRadius: 20, border: palette.border, background: palette.strong }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}><Zap size={16} color={palette.blue} /><span className="analysis-meta-label">Recent Scans</span></div>
              {historyLoading ? <p style={{ margin: 0, color: palette.muted, lineHeight: 1.7 }}>Loading recent scan history from the backend...</p> : !recentScans.length ? <p style={{ margin: 0, color: palette.muted, lineHeight: 1.7 }}>Recent actionable backend scan history will appear here after you run scanner requests.</p> : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {recentScans.map((entry) => (
                    <div key={entry.id} style={{ display: 'grid', gap: 10, padding: '12px 14px', borderRadius: 18, border: palette.border, background: 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => loadRecentScan(entry)} style={{ border: 'none', background: 'transparent', color: palette.text, cursor: 'pointer', textAlign: 'left', padding: 0, minWidth: 0 }}>
                          <strong style={{ display: 'block', marginBottom: 4 }}>{String(entry.scan_type || '').toUpperCase()}</strong>
                          <span style={{ color: palette.muted, wordBreak: 'break-word' }}>{entry.indicator}</span>
                        </button>
                        <span style={{ padding: '8px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, color: levelColor(entry.threat_level, palette), background: `${levelColor(entry.threat_level, palette)}12`, border: `1px solid ${levelColor(entry.threat_level, palette)}28` }}>{entry.threat_level}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ color: palette.subtle, fontSize: 13 }}>{formatRelativeDate(entry.created_at)}{entry.country ? ` | ${entry.country}` : ''}</span>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {entry.scan_type === 'ip' ? <button type="button" onClick={() => navigate(buildIpLookupPath(entry.indicator))} className="scanner-inline-button">IP lookup</button> : null}
                          {entry.scan_type === 'domain' ? <button type="button" onClick={() => navigate(buildDomainLookupPath(entry.indicator))} className="scanner-inline-button">Domain lookup</button> : null}
                          <button type="button" onClick={() => navigate(entry.details_path)} className="scanner-inline-button">IOC details</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="fade-in" style={{ background: palette.card, border: palette.border, borderRadius: 24, padding: 28, backdropFilter: 'blur(20px)', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{activeTab === 'bulk' ? 'Bulk Scan Results' : 'Scan Result'}</h2>
              <p style={{ color: palette.muted, fontSize: 14 }}>{activeTab === 'bulk' ? 'Grouped enrichment for mixed IOC lists with direct pivots into public intelligence context.' : 'Results adapt automatically for URL, IP, HASH, and file scans.'}</p>
            </div>

            {!result ? (
              <div style={{ minHeight: 280, borderRadius: 22, border: palette.border, background: palette.strong, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
                <div><Shield size={42} color={palette.blue} style={{ marginBottom: 14 }} /><h3 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Pick a scanner and run a request</h3><p style={{ color: palette.muted }}>{activeTab === 'bulk' ? 'Bulk IOC results will appear here with grouped counts, direct lookup pivots, and public cluster context.' : 'Your scan output will appear here with verdicts, scores, indicators, and a direct IOC details view.'}</p></div>
              </div>
            ) : activeTab === 'bulk' ? (
              <div style={{ display: 'grid', gap: 18 }}>
                <div className="scanner-bulk-grid">
                  <Stat label="Processed" value={result.summary?.processed || 0} copy={`${result.summary?.submitted || 0} lines submitted after de-duplication and normalization.`} accent={palette.blue} />
                  <Stat label="Actionable" value={result.summary?.actionable || 0} copy="Only suspicious or threat findings are auto-published into the public feed." accent={palette.yellow} />
                  <Stat label="Types Seen" value={Object.values(result.summary?.by_type || {}).filter(Boolean).length} copy="Unique IOC classes detected inside the pasted list." accent={palette.cyan} />
                </div>
                {publishState.message ? <div style={{ padding: '12px 14px', borderRadius: 16, color: publishState.status === 'success' ? palette.green : palette.yellow, background: publishState.status === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(37,99,235,0.12)', border: publishState.status === 'success' ? '1px solid rgba(34,197,94,0.22)' : '1px solid rgba(56,189,248,0.22)' }}>{publishState.message}</div> : null}
                <div className="scanner-bulk-table">
                  <div className="scanner-bulk-table-head"><span>Indicator</span><span>Type</span><span>Risk</span><span>Verdict</span><span>Next Step</span></div>
                  {(result.items || []).map((item) => (
                    <article key={`${item.ioc_type}-${item.indicator}`} className="scanner-bulk-row">
                      <div className="scanner-bulk-main"><strong>{item.indicator}</strong><p>{item.summary}</p></div>
                      <div>{String(item.ioc_type || 'unknown').toUpperCase()}</div>
                      <div>Risk {item.risk_score || 0}</div>
                      <div><span className="platform-badge" style={{ color: levelColor(item.threat_level, palette), borderColor: `${levelColor(item.threat_level, palette)}33`, background: `${levelColor(item.threat_level, palette)}12` }}>{item.threat_level}</span></div>
                      <div className="scanner-bulk-actions">
                        {item.lookup_path ? <button type="button" onClick={() => navigate(item.lookup_path)} className="scanner-inline-button">Lookup</button> : null}
                        {item.details_path ? <button type="button" onClick={() => navigate(item.details_path)} className="scanner-inline-button">IOC</button> : null}
                        {item.permalink ? <a href={item.permalink} target="_blank" rel="noreferrer" className="scanner-inline-button">Source</a> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 18 }}>
                <ResultCard result={result} type={activeTab} theme={theme} />
                <div style={{ padding: 18, borderRadius: 20, background: palette.strong, border: palette.border, display: 'grid', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><Radar size={16} color={palette.blue} /><span className="analysis-meta-label">Workflow</span></div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {ipLookupPath ? <button type="button" onClick={() => navigate(ipLookupPath)} className="scanner-inline-button">Open IP lookup</button> : null}
                      {singleDetailPath ? <button type="button" onClick={() => navigate(singleDetailPath)} className="scanner-inline-button">Open IOC details</button> : null}
                    </div>
                  </div>
                  {publishState.message ? <div style={{ padding: '12px 14px', borderRadius: 16, color: publishState.status === 'success' ? palette.green : levelColor(result.threat_level, palette), background: publishState.status === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(37,99,235,0.12)', border: publishState.status === 'success' ? '1px solid rgba(34,197,94,0.22)' : '1px solid rgba(56,189,248,0.22)' }}>{publishState.message}</div> : actionable(result.threat_level) ? <div style={{ padding: '12px 14px', borderRadius: 16, color: levelColor(result.threat_level, palette), background: `${levelColor(result.threat_level, palette)}12`, border: `1px solid ${levelColor(result.threat_level, palette)}28` }}>This suspicious result is published automatically into the Community and Threat Intel flow and becomes available in the unified timeline.</div> : null}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
