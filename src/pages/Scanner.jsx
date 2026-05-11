import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight,
  ExternalLink, Eye, FileText, Globe, Hash, Play, Radio,
  RefreshCw, Search, SlidersHorizontal,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useTheme } from '../components/ThemeProvider'
import { api, getErrorMessage } from '../services/api'
import {
  buildCommunityPayload,
  detectBrandImpersonation,
  buildIpLookupPath,
  buildIocPath,
  getPrimaryIndicator,
} from '../utils/intelTools'

// ── Detection ─────────────────────────────────────────────────
function detectType(raw) {
  const v = raw.trim()
  if (!v) return null
  const lines = v.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length > 1) return 'bulk'
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) return 'ip'
  if (/^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(v)) return 'ip'
  if (/^[a-fA-F0-9]{64}$/.test(v)) return 'hash'
  if (/^[a-fA-F0-9]{40}$/.test(v)) return 'hash'
  if (/^[a-fA-F0-9]{32}$/.test(v)) return 'hash'
  if (/^https?:\/\//i.test(v)) return 'url'
  if (/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v)) return 'domain'
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(v) && !v.includes(' ')) return 'domain'
  if (/^[a-fA-F0-9]{32,64}$/.test(v)) return 'hash'
  if (v.length > 40 && v.includes(' ')) return 'message'
  return 'url'
}

const DETECT_ROW = ['URL', 'IP', 'DOMAIN', 'HASH', 'FILE']
function typeToRow(t) {
  if (t === 'url') return 'URL'
  if (t === 'ip') return 'IP'
  if (t === 'domain') return 'DOMAIN'
  if (t === 'hash') return 'HASH'
  if (t === 'file') return 'FILE'
  return null
}
function apiType(t) {
  if (t === 'domain') return 'url'
  if (t === 'message') return null
  return t
}

// ── Helpers ───────────────────────────────────────────────────
function timeAgo(val) {
  if (!val) return ''
  try {
    const diff = Date.now() - new Date(val).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch { return '' }
}
function formatSource(source) {
  if (!source) return 'Scanner'
  if (source.includes('_url')) return 'VirusTotal'
  if (source.includes('_hash')) return 'Hybrid Analysis'
  if (source.includes('_file')) return 'MetaDefender'
  if (source.includes('_ip') || source.includes('enhanced')) return 'AbuseIPDB'
  return 'Scanner'
}
function rowIcon(type) {
  if (type === 'ip') return Radio
  if (type === 'hash') return Hash
  if (type === 'file') return FileText
  return Globe
}

// ── Verdict helpers ───────────────────────────────────────────
function getLevel(raw) {
  const v = String(raw || '').toLowerCase()
  if (v === 'threat' || v === 'dangerous') return 'threat'
  if (v === 'suspicious') return 'suspicious'
  return 'safe'
}
const LEVEL = {
  threat:     { color: '#ef4444', label: 'THREAT',     icon: AlertTriangle,  explainer: 'This indicator is strongly associated with phishing or malicious activity.' },
  suspicious: { color: '#f59e0b', label: 'SUSPICIOUS', icon: Eye,            explainer: 'Suspicious patterns were detected. Review before trusting this indicator.' },
  safe:       { color: '#22c55e', label: 'SAFE',        icon: CheckCircle2,   explainer: 'No strong malicious signal was found. Context should still be reviewed.' },
}
function verdictColor(raw) { return LEVEL[getLevel(raw)]?.color ?? '#22c55e' }

function actionable(level) {
  return ['suspicious', 'threat', 'dangerous'].includes(String(level || '').toLowerCase())
}

function getTypeLabel(t) {
  if (t === 'url') return 'URL Scan'
  if (t === 'ip') return 'IP Reputation'
  if (t === 'hash') return 'Hash Analysis'
  if (t === 'file') return 'File Scan'
  return 'Scan Result'
}
function TypeIcon({ type }) {
  if (type === 'url') return <Globe size={14} />
  if (type === 'ip') return <Radio size={14} />
  if (type === 'hash') return <Hash size={14} />
  if (type === 'file') return <FileText size={14} />
  return <Globe size={14} />
}

function getScore(result, type) {
  if (type === 'ip') return result.aggregated_score ?? result.risk_score ?? 0
  return result.risk_score ?? result.confidence ?? 0
}
function getIdentifier(result, type) {
  if (type === 'url') return result.url || ''
  if (type === 'ip') return result.ip || ''
  if (type === 'hash') return result.hash || ''
  if (type === 'file') return result.filename || result.file_hash || ''
  return result.indicator || ''
}
function buildDetailRows(result, type) {
  const rows = []
  if (result.summary) rows.push(['Summary', result.summary])
  if (type === 'hash') {
    if (result.positives != null) rows.push(['Detections', `${result.positives} / ${result.total ?? '?'}`])
    if (result.recommendation) rows.push(['Recommendation', result.recommendation])
  } else if (type === 'url') {
    const conf = result.confidence ?? result.risk_score
    if (conf != null) rows.push(['Confidence', `${conf}%`])
    if (result.recommendation) rows.push(['Recommendation', result.recommendation])
  } else if (type === 'ip') {
    if (result.recommendation) rows.push(['Recommendation', result.recommendation])
    const sc = Array.isArray(result.sources) ? result.sources.length : null
    if (sc) rows.push(['Intelligence sources', String(sc)])
  } else if (type === 'file') {
    if (result.recommendation) rows.push(['Recommendation', result.recommendation])
    const ft = result.file_type || result.detected_type
    if (ft) rows.push(['Detected type', ft])
  }
  return rows
}
function buildGeoRows(geo = {}) {
  return [
    ['Country', geo.country],
    ['City / Region', geo.city || geo.region],
    ['Organization', geo.organization || geo.org || geo.isp],
    ['ASN', geo.asn],
  ].filter(([, v]) => v && String(v).toLowerCase() !== 'unknown')
}
function buildSignals(result) {
  return (Array.isArray(result.indicators) ? result.indicators : [])
    .map((v) => String(v || '').trim()).filter(Boolean).slice(0, 6)
}

const EXAMPLE_CHIPS = [
  { label: 'google-login-check.com', value: 'google-login-check.com' },
  { label: '185.220.101.45',         value: '185.220.101.45' },
  { label: 'f3a1d92c0e6b...',        value: 'f3a1d92c0e6b4d8a3c52b1e9f0d7a4c5b8e2f3a1' },
]

// ── Result Page ───────────────────────────────────────────────
function ScanResultPage({ result, scanApiType, input, publishState, onNewScan, navigate }) {
  const level = getLevel(result?.threat_level)
  const cfg = LEVEL[level]
  const VerdictIcon = cfg.icon
  const score = Math.min(100, Math.max(0, Number(getScore(result, scanApiType) || 0)))
  const identifier = getIdentifier(result, scanApiType) || input.trim()
  const detailRows = buildDetailRows(result, scanApiType)
  const geoRows = scanApiType === 'ip' ? buildGeoRows(result?.geo || {}) : []
  const signals = buildSignals(result)
  const vtLink = result?.permalink
  const ipPath = scanApiType === 'ip' ? buildIpLookupPath(identifier) : ''
  const detailPath = scanApiType !== 'bulk' ? buildIocPath(scanApiType, identifier) : ''

  const brandSignal = useMemo(() => {
    if (scanApiType !== 'url') return null
    const c = result?.brand_impersonation || detectBrandImpersonation(result?.domain || result?.url || input)
    return c?.active ? c : null
  }, [result, scanApiType, input])

  return (
    <div className="aip-rp-root fade-in">
      {/* Top bar */}
      <div className="aip-rp-topbar">
        <button type="button" className="aip-rp-back" onClick={onNewScan}>
          <ArrowLeft size={15} />
          <span>New Scan</span>
        </button>
        <span className="aip-rp-scanned-label" title={identifier}>{identifier}</span>
      </div>

      <div className="aip-rp-inner">
        {/* Verdict hero */}
        <div className={`aip-rp-verdict-card aip-rp-${level}`}>
          <div className="aip-rp-verdict-accent" style={{ background: cfg.color }} />

          <div className="aip-rp-verdict-body">
            <div className="aip-rp-type-kicker">
              <TypeIcon type={scanApiType} />
              <span>{getTypeLabel(scanApiType)}</span>
            </div>

            <div className="aip-rp-verdict-row">
              <div className="aip-rp-verdict-icon" style={{ borderColor: `${cfg.color}40`, color: cfg.color }}>
                <VerdictIcon size={28} />
              </div>
              <div className="aip-rp-verdict-copy">
                <span className="aip-rp-verdict-badge" style={{ color: cfg.color, borderColor: `${cfg.color}44`, background: `${cfg.color}14` }}>
                  {cfg.label}
                </span>
                <h2 className="aip-rp-indicator">{identifier}</h2>
                <p className="aip-rp-explainer">{cfg.explainer}</p>
              </div>
            </div>

            <div className="aip-rp-score-row">
              <span className="aip-rp-score-label">Risk Score</span>
              <div className="aip-rp-score-track">
                <div className="aip-rp-score-fill" style={{ width: `${score}%`, background: cfg.color }} />
              </div>
              <strong className="aip-rp-score-value" style={{ color: cfg.color }}>{score}%</strong>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="aip-rp-details-grid">
          {/* Technical details */}
          <div className="aip-rp-section">
            <div className="aip-rp-section-label">Technical Details</div>
            <div className="aip-rp-detail-row aip-rp-detail-row-entity">
              <span>Entity</span>
              <span className="aip-rp-entity-value">{identifier}</span>
            </div>
            {detailRows.map(([key, val]) => (
              <div key={key} className="aip-rp-detail-row">
                <span>{key}</span>
                <span>{val}</span>
              </div>
            ))}
            {vtLink ? (
              <a href={vtLink} target="_blank" rel="noreferrer" className="aip-rp-source-link">
                Open source context <ExternalLink size={12} />
              </a>
            ) : null}
          </div>

          {/* Geolocation (IP only) */}
          {geoRows.length > 0 && (
            <div className="aip-rp-section">
              <div className="aip-rp-section-label">Geolocation</div>
              {geoRows.map(([key, val]) => (
                <div key={key} className="aip-rp-detail-row">
                  <span>{key}</span>
                  <span>{val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Brand impersonation */}
          {brandSignal ? (
            <div className="aip-rp-section aip-rp-section-warn">
              <div className="aip-rp-section-label">Brand Impersonation</div>
              <div className="aip-rp-detail-row">
                <span>Brand</span>
                <span>{brandSignal.brand || '—'}</span>
              </div>
              <p className="aip-rp-brand-copy">
                {(brandSignal.summary || '').trim() || 'This URL contains typo or lure patterns used in brand impersonation campaigns.'}
              </p>
            </div>
          ) : null}
        </div>

        {/* Threat signals */}
        {signals.length > 0 && (
          <div className="aip-rp-signals">
            <div className="aip-rp-section-label" style={{ marginBottom: 10 }}>Threat Signals</div>
            <div className="aip-rp-signal-chips">
              {signals.map((s, i) => (
                <span key={i} className="aip-rp-signal-chip">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="aip-rp-actions">
          {ipPath ? (
            <button type="button" className="aip-rp-action-btn aip-rp-action-primary" onClick={() => navigate(ipPath)}>
              Open IP Lookup
            </button>
          ) : null}
          {detailPath ? (
            <button type="button" className="aip-rp-action-btn" onClick={() => navigate(detailPath)}>
              Open IOC Details
            </button>
          ) : null}
          {vtLink ? (
            <a href={vtLink} target="_blank" rel="noreferrer" className="aip-rp-action-btn">
              View Source <ExternalLink size={12} />
            </a>
          ) : null}
        </div>

        {/* Publish status */}
        {publishState.message ? (
          <div className={`aip-rp-pub-status ${publishState.status === 'success' ? 'aip-rp-pub-ok' : 'aip-rp-pub-warn'}`}>
            {publishState.message}
          </div>
        ) : actionable(result.threat_level) && publishState.status === 'idle' ? (
          <div className="aip-rp-pub-status aip-rp-pub-ok">
            Suspicious result published automatically to Community and Threat Intel.
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Bulk Result Page ──────────────────────────────────────────
function BulkResultPage({ result, publishState, onNewScan, navigate }) {
  return (
    <div className="aip-rp-root fade-in">
      <div className="aip-rp-topbar">
        <button type="button" className="aip-rp-back" onClick={onNewScan}>
          <ArrowLeft size={15} />
          <span>New Scan</span>
        </button>
        <span className="aip-rp-scanned-label">Bulk IOC Scan</span>
      </div>

      <div className="aip-rp-inner">
        <div className="aip-rp-bulk-stats">
          <div className="aip-rp-bulk-stat">
            <strong style={{ color: '#00E5FF' }}>{result.summary?.processed || 0}</strong>
            <span>Processed</span>
            <p>{result.summary?.submitted || 0} lines submitted</p>
          </div>
          <div className="aip-rp-bulk-stat">
            <strong style={{ color: '#f59e0b' }}>{result.summary?.actionable || 0}</strong>
            <span>Actionable</span>
            <p>Suspicious or threat findings</p>
          </div>
          <div className="aip-rp-bulk-stat">
            <strong style={{ color: '#22d3ee' }}>
              {Object.values(result.summary?.by_type || {}).filter(Boolean).length}
            </strong>
            <span>Types</span>
            <p>Unique IOC classes detected</p>
          </div>
        </div>

        {publishState.message ? (
          <div className={`aip-rp-pub-status ${publishState.status === 'success' ? 'aip-rp-pub-ok' : 'aip-rp-pub-warn'}`}>
            {publishState.message}
          </div>
        ) : null}

        <div className="aip-rp-bulk-table">
          <div className="aip-rp-bulk-head">
            <span>Indicator</span><span>Type</span><span>Risk</span><span>Verdict</span><span>Actions</span>
          </div>
          {(result.items || []).map((item) => {
            const color = verdictColor(item.threat_level)
            return (
              <div key={`${item.ioc_type}-${item.indicator}`} className="aip-rp-bulk-row">
                <div className="aip-rp-bulk-indicator">
                  <strong>{item.indicator}</strong>
                  {item.summary ? <p>{item.summary}</p> : null}
                </div>
                <span className="aip-rp-bulk-type">{String(item.ioc_type || '?').toUpperCase()}</span>
                <span className="aip-rp-bulk-risk">Risk {item.risk_score || 0}</span>
                <span className="aip-rp-bulk-badge" style={{ color, borderColor: `${color}33`, background: `${color}12` }}>
                  {String(item.threat_level || '?').toUpperCase()}
                </span>
                <div className="aip-rp-bulk-actions">
                  {item.lookup_path ? <button type="button" onClick={() => navigate(item.lookup_path)} className="aip-rp-tbl-btn">Lookup</button> : null}
                  {item.details_path ? <button type="button" onClick={() => navigate(item.details_path)} className="aip-rp-tbl-btn">IOC</button> : null}
                  {item.permalink ? <a href={item.permalink} target="_blank" rel="noreferrer" className="aip-rp-tbl-btn">Source</a> : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main Scanner ──────────────────────────────────────────────
export default function Scanner({ onAnalysis }) {
  const { theme } = useTheme()
  const client = useMemo(() => api(), [])
  const navigate = useNavigate()
  const textareaRef = useRef(null)

  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState('')
  const [recentScans, setRecentScans] = useState([])
  const [publishState, setPublishState] = useState({ status: 'idle', message: '' })
  const [showResult, setShowResult] = useState(false)

  const detected = useMemo(() => detectType(input), [input])
  const scanApiType = apiType(detected)
  const activeRowType = typeToRow(detected)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await client.get('/api/intelligence/scan-history', {
        params: { limit: 8, time_range: '30d', scan_type: 'all' },
      })
      setRecentScans(res.data?.items || [])
    } catch { setRecentScans([]) }
    finally { setHistoryLoading(false) }
  }, [client])

  useEffect(() => { loadHistory() }, [loadHistory])

  const autoGrow = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }
  const handleChange = (e) => { setInput(e.target.value); setTimeout(autoGrow, 0) }
  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && scanApiType && !loading) {
      e.preventDefault(); runScan()
    }
  }

  const publishThreat = async (indicator, threatType, payload) => {
    if (!indicator || !threatType || !payload) return { duplicate: false }
    const res = await client.post('/api/community/publish-threat',
      buildCommunityPayload({ indicator, threatType, result: payload })
    )
    return res.data || { duplicate: false }
  }

  const publishBulk = async (items) => {
    const ok = (items || []).filter((item) =>
      ['ip', 'url', 'hash', 'domain'].includes(item.ioc_type) && actionable(item.threat_level)
    )
    if (!ok.length) return
    setPublishState({ status: 'loading', message: '' })
    try {
      const results = await Promise.all(ok.slice(0, 12).map((item) => publishThreat(item.indicator, item.ioc_type, item)))
      const dupes = results.filter((r) => r?.duplicate).length
      const created = results.length - dupes
      setPublishState({
        status: 'success',
        message: created > 0
          ? `${created} actionable indicators promoted to Community and Threat Intel.${dupes ? ` ${dupes} duplicates skipped.` : ''}`
          : 'All actionable indicators were already published.',
      })
    } catch { setPublishState({ status: 'error', message: 'Unable to publish bulk indicators.' }) }
  }

  const runScan = async () => {
    if (!scanApiType) return
    const v = input.trim()
    setLoading(true)
    setError('')
    setResult(null)
    setPublishState({ status: 'idle', message: '' })
    try {
      let res
      if (scanApiType === 'ip')        res = await client.post('/api/scanner/ip/enhanced', { ip: v })
      else if (scanApiType === 'hash') res = await client.post('/api/scanner/hash', { hash: v })
      else if (scanApiType === 'bulk') res = await client.post('/api/scanner/bulk', { input: v })
      else                             res = await client.post('/api/scanner/url', { url: v })

      setResult(res.data)
      setShowResult(true)
      await loadHistory()

      if (scanApiType === 'bulk') {
        await publishBulk(res.data?.items || [])
      } else if (actionable(res.data?.threat_level)) {
        const indicator = getPrimaryIndicator(scanApiType, res.data, v)
        const pub = await publishThreat(indicator, scanApiType, res.data)
        setPublishState({
          status: 'success',
          message: pub?.duplicate
            ? 'This indicator was already published earlier.'
            : 'Suspicious result published automatically to Community and Threat Intel.',
        })
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Scan failed. Please try again.'))
    } finally { setLoading(false) }
  }

  const resetScan = () => {
    setResult(null)
    setShowResult(false)
    setError('')
    setPublishState({ status: 'idle', message: '' })
  }

  // ── Full-page result ───────────────────────────────────────
  if (showResult && result) {
    if (scanApiType === 'bulk') {
      return (
        <BulkResultPage
          result={result}
          publishState={publishState}
          onNewScan={resetScan}
          navigate={navigate}
        />
      )
    }
    return (
      <ScanResultPage
        result={result}
        scanApiType={scanApiType}
        input={input}
        publishState={publishState}
        onNewScan={resetScan}
        navigate={navigate}
      />
    )
  }

  // ── Scanner page ───────────────────────────────────────────
  return (
    <div className="aip-root">
      <div className="grid-dots aip-bg-dots" />
      <div className="aip-inner">

        {/* Hero */}
        <header className="aip-hero fade-in">
          <div className="aip-kicker">
            <span className="aip-kicker-dot" />
            <span className="aip-kicker-text">THREAT ANALYSIS HUB</span>
          </div>
          <h1 className="aip-title">Scanner - Threat Analysis </h1>
          <p className="aip-copy">
            Investigate indicators across multiple intelligence sources<br />and get real-time verdicts.
          </p>
        </header>

        {/* Search bar */}
        <div className={`aip-searchbar fade-in-delay-1${detected && detected !== 'message' ? ' aip-searchbar-lit' : ''}`}>
          <Search size={20} className="aip-search-icon" />
          <textarea
            ref={textareaRef}
            className="aip-search-input"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKey}
            placeholder="Paste URL, IP, domain, hash, or file hash..."
            rows={1}
            spellCheck={false}
            autoComplete="off"
          />
          <div className="aip-search-right">
            <button type="button" className="aip-filter-btn" title="Options">
              <SlidersHorizontal size={17} />
            </button>
            <span className="aip-vdivider" />
            <button type="button" className="aip-analyze-btn" onClick={runScan} disabled={loading || !scanApiType}>
              {loading ? <span className="aip-spin" /> : <Play size={13} fill="currentColor" />}
              <span>ANALYZE</span>
            </button>
          </div>
        </div>

        {/* Auto-detect row */}
        <div className="aip-detect-row fade-in-delay-1">
          <RefreshCw size={13} className="aip-detect-icon" />
          <span className="aip-detect-label">Auto-detect:</span>
          {DETECT_ROW.map((t, i) => (
            <span key={t} className="aip-detect-group">
              <span className={`aip-detect-type${activeRowType === t ? ' is-active' : (!activeRowType && t === 'URL' ? ' is-default' : '')}`}>{t}</span>
              {i < DETECT_ROW.length - 1 && <span className="aip-detect-sep">•</span>}
            </span>
          ))}
          {detected === 'message' && (
            <span className="aip-detect-msg">
              Looks like a message —&nbsp;
              <button type="button" className="aip-detect-link" onClick={onAnalysis}>use Message Analysis</button>
            </span>
          )}
        </div>

        {error ? (
          <div className="console-status aip-error" style={{ borderColor: 'rgba(240,64,64,0.28)', color: '#fca5a5' }}>{error}</div>
        ) : null}

        {/* Recent Activity */}
        <div className="aip-activity fade-in-delay-2">
          <div className="aip-activity-hd">
            <span className="aip-activity-label">RECENT ACTIVITY</span>
            <button type="button" className="aip-viewall" onClick={() => navigate('/timeline')}>
              View all <ChevronRight size={14} />
            </button>
          </div>

          {historyLoading ? (
            <p className="aip-loading">Loading scan history…</p>
          ) : recentScans.length > 0 ? (
            <>
              <div className="aip-thead">
                <span>INDICATOR</span><span>TYPE</span><span>VERDICT</span><span>SOURCE</span><span>TIME</span><span />
              </div>
              <div className="aip-tbody">
                {recentScans.map((entry) => {
                  const Icon = rowIcon(entry.scan_type)
                  const color = verdictColor(entry.threat_level)
                  const label = LEVEL[getLevel(entry.threat_level)]?.label ?? 'SAFE'
                  const dest = entry.details_path || buildIocPath(entry.scan_type, entry.indicator)
                  return (
                    <div key={entry.id} className="aip-trow" onClick={() => dest && navigate(dest)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && dest && navigate(dest)}>
                      <div className="aip-td-indicator">
                        <Icon size={15} className="aip-trow-icon" />
                        <span className="aip-trow-text">{entry.indicator}</span>
                      </div>
                      <div className="aip-td aip-td-type">{String(entry.scan_type || '').toUpperCase()}</div>
                      <div className="aip-td aip-td-verdict">
                        <span className="aip-verdict-dot" style={{ background: color }} />
                        <span className="aip-verdict-label" style={{ color }}>{label}</span>
                      </div>
                      <div className="aip-td aip-td-source">{formatSource(entry.source)}</div>
                      <div className="aip-td aip-td-time">{timeAgo(entry.created_at)}</div>
                      <div className="aip-td aip-td-arrow">›</div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}
        </div>

        {/* Empty / CTA */}
        <div className="aip-empty fade-in-delay-2">
          <Activity size={30} className="aip-empty-icon" strokeWidth={1.5} />
          <p className="aip-empty-title">No investigations yet</p>
          <p className="aip-empty-copy">Paste an indicator above to start your first analysis.</p>
          <div className="aip-empty-chips">
            {EXAMPLE_CHIPS.map((ex) => (
              <button key={ex.value} type="button" className="aip-chip" onClick={() => { setInput(ex.value); textareaRef.current?.focus() }}>
                {ex.label}
              </button>
            ))}
            <button type="button" className="aip-chip aip-chip-browse" onClick={() => navigate('/community')}>
              Browse examples ›
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
