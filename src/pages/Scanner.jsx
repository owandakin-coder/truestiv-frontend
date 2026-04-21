import { useEffect, useMemo, useState } from 'react'
import { Boxes, FileText, Globe, Hash, Link2, Radar, Search, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import ExpandableFeed from '../components/ExpandableFeed'
import ResultCard from '../components/ResultCard'
import IntelEmptyState from '../components/IntelEmptyState'
import PortalHero from '../components/PortalHero'
import { useTheme } from '../components/ThemeProvider'
import { api, getErrorMessage } from '../services/api'
import {
  buildCommunityPayload,
  detectBrandImpersonation,
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

const initialForm = {
  url: '',
  ip: '',
  hash: '',
  filename: '',
  file_size: '',
  file_hash: '',
  bulk_input: '',
}

function paletteFor(theme) {
  const dark = theme !== 'light'
  return {
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
  const [showResultOnly, setShowResultOnly] = useState(false)

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const loadHistory = async (scanType = 'all') => {
    setHistoryLoading(true)
    try {
      const response = await client.get('/api/intelligence/scan-history', {
        params: { limit: 8, time_range: '30d', scan_type: scanType === 'bulk' ? 'all' : scanType },
      })
      setRecentScans((response.data?.items || []).filter((item) => actionable(item?.threat_level)))
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
    setShowResultOnly(false)
    loadHistory(activeTab)
  }, [activeTab])

  const publishThreat = async (indicator, threatType, payload) => {
    if (!indicator || !threatType || !payload) return { duplicate: false }
    const response = await client.post(
      '/api/community/publish-threat',
      buildCommunityPayload({ indicator, threatType, result: payload })
    )
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
      else if (activeTab === 'file') {
        response = await client.post('/api/scanner/file', {
          filename: form.filename,
          file_size: Number(form.file_size || 0),
          file_hash: form.file_hash,
        })
      } else {
        response = await client.post('/api/scanner/bulk', { input: form.bulk_input })
      }

      setResult(response.data)
      setShowResultOnly(true)
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

  const startNewScan = () => {
    setResult(null)
    setShowResultOnly(false)
    setError('')
    setPublishState({ status: 'idle', message: '' })
  }

  const singleDetailPath = result && activeTab !== 'bulk'
    ? buildIocPath(activeTab === 'file' ? 'file' : activeTab, getPrimaryIndicator(activeTab, result, currentValueForTab(activeTab, form)))
    : ''
  const ipLookupPath = activeTab === 'ip' && result ? buildIpLookupPath(getPrimaryIndicator('ip', result, form.ip)) : ''
  const scannerBrandSignal = useMemo(() => {
    if (!result || activeTab !== 'url') return null
    const candidate = result?.brand_impersonation || detectBrandImpersonation(result?.domain || result?.url || form.url)
    if (!candidate || !candidate.active) return null
    return candidate
  }, [activeTab, form.url, result])

  const bulkExamples = [
    {
      label: 'Mixed phishing set',
      onClick: () => updateField('bulk_input', 'https://secure-paypaI-login-check.com\n185.220.101.42\n44d88612fea8a8f36de82e1278abb02f\nmicrosoft-billing-center-help.com'),
    },
    {
      label: 'URL heavy list',
      onClick: () => updateField('bulk_input', 'https://apple-id-review-center.com\nhttps://secure-fedex-delivery-check.net\nhttps://microsoft-billing-update.info'),
    },
  ]

  return (
    <div style={{ position: 'relative' }}>
      {!embedded ? <div className="hero-bg" /> : null}
      {!embedded ? <div className="grid-dots" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} /> : null}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {!embedded ? (
          <PortalHero
            kicker="Public IOC Scanner"
            title="Scan Anything. Instantly."
            eyebrowItems={['URL', 'IP', 'Hash', 'File', 'Bulk IOC']}
            copy="Fast threat detection with real-time intelligence."
            className="investigation-hero fade-in"
            actions={(
              <button type="button" onClick={runScan} disabled={loading} className="console-cta portal-hero-primary">
                <Search size={18} />
                {loading ? 'Scanning...' : 'Start Scan'}
              </button>
            )}
          />
        ) : null}

        {!showResultOnly ? (
          <div className="investigation-centered-flow">
            <section className="console-surface fade-in scanner-console-centered">
              <div className="console-heading">
                <h2>Run Public Scanner</h2>
                <p>{tabDescription(activeTab)}</p>
              </div>

              <div className="console-tab-grid">
                {tabs.map(({ id, label, icon: Icon }) => {
                  const active = activeTab === id
                  return (
                    <button key={id} type="button" onClick={() => setActiveTab(id)} className={`console-tab ${active ? 'is-active' : ''}`}>
                      <Icon size={16} color={active ? palette.blue : palette.subtle} />
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="console-form-grid">
                {activeTab === 'url' ? (
                  <label className="console-input-group">
                    <span>URL</span>
                    <input className="analysis-input" value={form.url} onChange={(event) => updateField('url', event.target.value)} placeholder="https://suspicious-login.example" />
                  </label>
                ) : null}

                {activeTab === 'ip' ? (
                  <label className="console-input-group">
                    <span>IP Address</span>
                    <input className="analysis-input" value={form.ip} onChange={(event) => updateField('ip', event.target.value)} placeholder="185.220.101.42" />
                  </label>
                ) : null}

                {activeTab === 'hash' ? (
                  <label className="console-input-group">
                    <span>MD5 / SHA1 / SHA256</span>
                    <input className="analysis-input" value={form.hash} onChange={(event) => updateField('hash', event.target.value)} placeholder="44d88612fea8a8f36de82e1278abb02f" />
                  </label>
                ) : null}

                {activeTab === 'file' ? (
                  <>
                    <label className="console-input-group">
                      <span>Filename</span>
                      <input className="analysis-input" value={form.filename} onChange={(event) => updateField('filename', event.target.value)} placeholder="invoice-update.docm" />
                    </label>
                    <div className="field-grid">
                      <label className="console-input-group">
                        <span>File Size</span>
                        <input className="analysis-input" value={form.file_size} onChange={(event) => updateField('file_size', event.target.value)} placeholder="102400" />
                      </label>
                      <label className="console-input-group">
                        <span>Optional Hash</span>
                        <input className="analysis-input" value={form.file_hash} onChange={(event) => updateField('file_hash', event.target.value)} placeholder="Optional file hash" />
                      </label>
                    </div>
                  </>
                ) : null}

                {activeTab === 'bulk' ? (
                  <label className="console-input-group">
                    <span>Bulk Indicators</span>
                    <textarea
                      className="analysis-textarea"
                      rows={10}
                      value={form.bulk_input}
                      onChange={(event) => updateField('bulk_input', event.target.value)}
                      placeholder={'Paste one indicator per line.\nhttps://example.test/login\n185.220.101.42\n44d88612fea8a8f36de82e1278abb02f\nsuspicious-domain.example'}
                      style={{ minHeight: 240 }}
                    />
                  </label>
                ) : null}

                {error ? <div className="console-status" style={{ borderColor: 'rgba(240,64,64,0.3)', color: '#fecaca' }}>{error}</div> : null}

                <button type="button" onClick={runScan} disabled={loading} className="console-cta">
                  <Search size={18} />
                  {loading ? 'Scanning...' : activeTab === 'bulk' ? 'Run Bulk Scan' : 'Run Scan'}
                </button>
              </div>
            </section>

            <div className="feed-surface investigation-feed-centered" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Zap size={16} color={palette.blue} />
                <span className="analysis-meta-label">Recent Scans</span>
              </div>

              {historyLoading ? (
                <p style={{ margin: 0, color: palette.muted, lineHeight: 1.7 }}>Loading recent scan history...</p>
              ) : !recentScans.length ? (
                <IntelEmptyState
                  title="No actionable scans yet"
                  copy="Only suspicious and threat findings are shown here."
                  examples={activeTab === 'bulk' ? bulkExamples : [
                    { label: 'Try suspicious URL', onClick: () => { setActiveTab('url'); updateField('url', 'https://secure-paypaI-login-check.com') } },
                    { label: 'Try abuse IP', onClick: () => { setActiveTab('ip'); updateField('ip', '185.220.101.42') } },
                  ]}
                />
              ) : (
                <ExpandableFeed
                  items={recentScans}
                  initialCount={4}
                  className="recent-rail"
                  renderItem={(entry) => (
                    <div key={entry.id} className="recent-rail-item">
                      <div className="recent-rail-top">
                        <button type="button" onClick={() => loadRecentScan(entry)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', padding: 0, minWidth: 0, flex: 1 }}>
                          <div className="recent-rail-main">
                            <strong>{String(entry.scan_type || '').toUpperCase()}</strong>
                            <span className="recent-rail-meta">{entry.indicator}</span>
                          </div>
                        </button>
                        <span style={{ padding: '8px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, color: levelColor(entry.threat_level, palette), background: `${levelColor(entry.threat_level, palette)}12`, border: `1px solid ${levelColor(entry.threat_level, palette)}28` }}>
                          {entry.threat_level}
                        </span>
                      </div>
                      <div className="recent-rail-copy">{entry.summary || 'Public actionable scan retained in recent history.'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <span className="recent-rail-meta">{formatRelativeDate(entry.created_at)}{entry.country ? ` | ${entry.country}` : ''}</span>
                        <div className="investigation-actions">
                          {entry.scan_type === 'ip' ? <button type="button" onClick={() => navigate(buildIpLookupPath(entry.indicator))} className="scanner-inline-button">IP lookup</button> : null}
                          {entry.scan_type === 'domain' ? <button type="button" onClick={() => navigate(buildDomainLookupPath(entry.indicator))} className="scanner-inline-button">Domain lookup</button> : null}
                          <button type="button" onClick={() => navigate(entry.details_path)} className="scanner-inline-button">IOC details</button>
                        </div>
                      </div>
                    </div>
                  )}
                />
              )}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: activeTab === 'bulk' ? 1120 : 900, margin: '0 auto', width: '100%' }}>
            <div style={{ marginBottom: 24 }}>
              <button onClick={startNewScan} className="console-cta" style={{ marginBottom: 20 }}>
                ← New Scan
              </button>
            </div>

            {activeTab === 'bulk' ? (
              <div style={{ display: 'grid', gap: 18 }}>
                <div className="scanner-bulk-grid">
                  <article className="brief-panel">
                    <span className="analysis-meta-label">Processed</span>
                    <strong style={{ fontSize: 26, color: palette.blue }}>{result.summary?.processed || 0}</strong>
                    <p>{`${result.summary?.submitted || 0} lines submitted after normalization.`}</p>
                  </article>
                  <article className="brief-panel">
                    <span className="analysis-meta-label">Actionable</span>
                    <strong style={{ fontSize: 26, color: palette.yellow }}>{result.summary?.actionable || 0}</strong>
                    <p>Only suspicious and threat findings are promoted.</p>
                  </article>
                  <article className="brief-panel">
                    <span className="analysis-meta-label">Types Seen</span>
                    <strong style={{ fontSize: 26, color: palette.cyan }}>{Object.values(result.summary?.by_type || {}).filter(Boolean).length}</strong>
                    <p>Unique IOC classes detected in the batch.</p>
                  </article>
                </div>

                {publishState.message ? <div className="console-status" style={{ color: publishState.status === 'success' ? palette.green : palette.yellow }}>{publishState.message}</div> : null}

                <div className="scanner-bulk-table">
                  <div className="scanner-bulk-table-head"><span>Indicator</span><span>Type</span><span>Risk</span><span>Verdict</span><span>Next Step</span></div>
                  {(result.items || []).map((item) => (
                    <article key={`${item.ioc_type}-${item.indicator}`} className="scanner-bulk-row">
                      <div className="scanner-bulk-main">
                        <strong>{item.indicator}</strong>
                        <p>{item.summary}</p>
                      </div>
                      <div>{String(item.ioc_type || 'unknown').toUpperCase()}</div>
                      <div>Risk {item.risk_score || 0}</div>
                      <div>
                        <span className="platform-badge" style={{ color: levelColor(item.threat_level, palette), borderColor: `${levelColor(item.threat_level, palette)}33`, background: `${levelColor(item.threat_level, palette)}12` }}>
                          {item.threat_level}
                        </span>
                      </div>
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
              <div className="split-dossier">
                <ResultCard result={result} type={activeTab} theme={theme} />

                {scannerBrandSignal ? (
                  <div className="brief-panel" style={{ borderColor: 'rgba(251,191,36,0.28)' }}>
                    <strong>
                      Possible brand impersonation detected{scannerBrandSignal.brand ? `: ${scannerBrandSignal.brand}` : ''}
                    </strong>
                    <span style={{ color: palette.muted, lineHeight: 1.6 }}>
                      {(scannerBrandSignal.summary || '').trim() || 'This URL contains typo or lure patterns commonly used in brand impersonation campaigns.'}
                    </span>
                  </div>
                ) : null}

                <div className="brief-panel">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <Radar size={16} color={palette.blue} />
                      <span className="analysis-meta-label">Workflow</span>
                    </div>
                    <div className="investigation-actions">
                      {ipLookupPath ? <button type="button" onClick={() => navigate(ipLookupPath)} className="scanner-inline-button">Open IP lookup</button> : null}
                      {singleDetailPath ? <button type="button" onClick={() => navigate(singleDetailPath)} className="scanner-inline-button">Open IOC details</button> : null}
                    </div>
                  </div>

                  {publishState.message ? (
                    <div className="console-status" style={{ color: publishState.status === 'success' ? palette.green : levelColor(result.threat_level, palette) }}>
                      {publishState.message}
                    </div>
                  ) : actionable(result.threat_level) ? (
                    <div className="console-status" style={{ color: levelColor(result.threat_level, palette), borderColor: `${levelColor(result.threat_level, palette)}28` }}>
                      This suspicious result is published automatically into the Community and Threat Intel flow and becomes available in the unified timeline.
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
