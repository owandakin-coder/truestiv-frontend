import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DatabaseZap, FileText, Globe, Globe2, Hash, Radio, Radar, ScanSearch, ShieldAlert, Waves } from 'lucide-react'

import Seo from '../components/Seo'
import { apiRequest } from '../services/api'
import { buildIpLookupPath, formatRelativeDate } from '../utils/intelTools'

// ── Helpers ────────────────────────────────────────────────────
function levelColor(level) {
  const v = String(level || '').toLowerCase()
  if (v === 'threat' || v === 'dangerous') return '#ef4444'
  if (v === 'suspicious') return '#f59e0b'
  if (v === 'safe') return '#22c55e'
  return '#60a5fa'
}
function levelLabel(level) {
  const v = String(level || '').toLowerCase()
  if (v === 'threat' || v === 'dangerous') return 'THREAT'
  if (v === 'suspicious') return 'SUSPICIOUS'
  if (v === 'safe') return 'SAFE'
  return 'UNKNOWN'
}
function rowIcon(type) {
  const t = String(type || '').toLowerCase()
  if (t === 'ip')   return Radio
  if (t === 'hash') return Hash
  if (t === 'file') return FileText
  return Globe
}
function truncate(value = '', max = 40) {
  const s = String(value || '')
  if (s.length <= max) return s
  return `${s.slice(0, 22)}…${s.slice(-10)}`
}
function inferType(row, fallback) {
  const c = row?.indicator_type || row?.threat_type || row?.scan_type || row?.channel || fallback || 'indicator'
  return ['ip','url','hash','file','domain','email','phone','cve'].includes(String(c).toLowerCase())
    ? String(c).toLowerCase() : (fallback || 'indicator')
}
function inferSource(row, fallback) {
  if (Array.isArray(row?.sources) && row.sources.length) return row.sources.join(', ')
  return row?.source || fallback || 'Trustive AI'
}
function risk(val) { return Math.max(0, Math.min(100, Number(val || 0))) }

const INITIAL = 8

// ── Signal table (aip style) ───────────────────────────────────
function SignalRows({ rows, fallbackType, navigate, onCopy, sectionKey }) {
  const [exp, setExp] = useState(false)
  const visible = exp ? rows : rows.slice(0, INITIAL)
  return (
    <>
      <div className="aip-tbody">
        {visible.map((row) => {
          const indicator = row.indicator || row.ip || ''
          const type      = inferType(row, fallbackType)
          const source    = inferSource(row, 'Trustive AI')
          const time      = formatRelativeDate(row.last_seen_at || row.published_at || row.created_at || row.first_seen_at)
          const riskVal   = risk(row.risk_score)
          const color     = levelColor(row.threat_level)
          const label     = levelLabel(row.threat_level)
          const Icon      = rowIcon(type)
          const path      = row.details_path || null

          return (
            <div
              key={row.id || `${type}-${indicator}-${time}`}
              className="aip-trow"
              role="button"
              tabIndex={0}
              onClick={() => path && navigate(path)}
              onKeyDown={(e) => e.key === 'Enter' && path && navigate(path)}
              style={{ cursor: path ? 'pointer' : 'default' }}
            >
              <div className="aip-td-indicator">
                <Icon size={14} className="aip-trow-icon" />
                <span className="aip-trow-text" title={indicator}>{truncate(indicator)}</span>
                <button
                  type="button"
                  className="ioc-copy-btn"
                  onClick={(e) => { e.stopPropagation(); onCopy(indicator) }}
                  tabIndex={-1}
                >
                  copy
                </button>
              </div>
              <div className="aip-td aip-td-type">{String(type).toUpperCase()}</div>
              <div className="aip-td aip-td-verdict">
                <span className="aip-verdict-dot" style={{ background: color }} />
                <span className="aip-verdict-label" style={{ color }}>{label}</span>
              </div>
              <div className="aip-td aip-td-source" style={{ color: '#60a5fa' }}>{riskVal}%</div>
              <div className="aip-td aip-td-source">{source}</div>
              <div className="aip-td aip-td-time">{time}</div>
              <div className="aip-td aip-td-arrow">›</div>
            </div>
          )
        })}
      </div>
      {rows.length > INITIAL ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 16 }}>
          <button type="button" className="aip-viewall" onClick={() => setExp((v) => !v)}>
            {exp ? 'Show less' : `Show ${rows.length - INITIAL} more`}
          </button>
        </div>
      ) : null}
    </>
  )
}

// ── Table section wrapper ───────────────────────────────────────
function TableSection({ label, icon: Icon, rows, fallbackType, navigate, onCopy, sectionKey }) {
  if (!rows?.length) return (
    <div className="aip-activity">
      <div className="aip-activity-hd">
        <span className="aip-activity-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
          {Icon && <Icon size={12} />}{label}
        </span>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'rgba(148,163,184,.35)' }}>0</span>
      </div>
      <p style={{ color:'rgba(148,163,184,.3)', fontSize:13 }}>No records found for this section.</p>
    </div>
  )
  return (
    <div className="aip-activity">
      <div className="aip-activity-hd">
        <span className="aip-activity-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
          {Icon && <Icon size={12} />}{label}
        </span>
        <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'rgba(148,163,184,.4)' }}>
          {rows.length}
        </span>
      </div>
      <div className="aip-thead" style={{ gridTemplateColumns:'minmax(0,2fr) 72px 140px 64px minmax(80px,.8fr) 72px 20px' }}>
        <span>INDICATOR</span><span>TYPE</span><span>LEVEL</span><span>RISK</span><span>SOURCE</span><span>TIME</span><span />
      </div>
      <SignalRows rows={rows} fallbackType={fallbackType} navigate={navigate} onCopy={onCopy} sectionKey={sectionKey} />
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────
export default function IOCDetails() {
  const navigate = useNavigate()
  const { iocType = '', indicator = '' } = useParams()
  const [copied,  setCopied]  = useState('')
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    apiRequest(`/api/intelligence/ioc/${encodeURIComponent(iocType)}/${encodeURIComponent(indicator)}`)
      .then((r) => { if (active) setPayload(r) })
      .catch((e) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [iocType, indicator])

  const ioc    = payload?.ioc || null
  const accent = levelColor(ioc?.latest_threat_level)

  const copyIndicator = async (value) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(String(value))
      setTimeout(() => setCopied((c) => c === String(value) ? '' : c), 1800)
    } catch { setCopied('') }
  }

  const totalContexts = ioc
    ? Object.values(ioc.source_breakdown || {}).reduce((t, c) => t + Number(c || 0), 0)
    : 0

  return (
    <div className="aip-root">
      <Seo
        title={`Trustive AI | IOC — ${indicator}`}
        description={`Full context for ${iocType?.toUpperCase()} indicator ${indicator} across scan history, intel, community, and analysis.`}
        path={`/ioc/${iocType}/${indicator}`}
      />
      <div className="grid-dots aip-bg-dots" />
      <div className="aip-inner">

        {/* Hero */}
        <header className="aip-hero fade-in">
          <div className="aip-kicker">
            <span className="aip-kicker-dot" />
            <span className="aip-kicker-text">IOC DETAILS · {String(iocType).toUpperCase()}</span>
          </div>
          <h1 className="aip-title" style={{ fontSize: 'clamp(20px,3.5vw,34px)', wordBreak: 'break-all' }}>
            {truncate(indicator, 60)}
          </h1>
          <p className="aip-copy">
            Full context across scan history, collected intelligence, community sightings, and analysis matches.
          </p>
        </header>

        {error   ? <p className="aip-error fade-in" style={{ borderColor:'rgba(240,64,64,.28)', color:'#fca5a5' }}>{error}</p> : null}
        {loading ? <p className="aip-loading">Loading indicator context…</p> : null}
        {copied  ? <p style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#4ade80', paddingBottom:8 }}>✓ Copied {truncate(copied)}</p> : null}

        {!loading && ioc ? (
          <>
            {/* Stat row */}
            <div className="cc-stats-row fade-in-delay-1" style={{ borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)', paddingTop:18, paddingBottom:18 }}>
              <div className="cc-stat">
                <strong className="cc-stat-val" style={{ color: accent }}>{ioc.latest_threat_level || 'unknown'}</strong>
                <span className="cc-stat-label">Level</span>
              </div>
              <div className="cc-stat">
                <strong className="cc-stat-val" style={{ color:'#60a5fa' }}>{ioc.average_risk_score || 0}</strong>
                <span className="cc-stat-label">Avg Risk</span>
              </div>
              <div className="cc-stat">
                <strong className="cc-stat-val">{totalContexts}</strong>
                <span className="cc-stat-label">Contexts</span>
              </div>
              <div className="cc-stat">
                <strong className="cc-stat-val">{Math.round(Number(ioc.source_confidence || 0) * 100)}%</strong>
                <span className="cc-stat-label">Confidence</span>
              </div>
              <div className="cc-stat">
                <strong className="cc-stat-val">{(ioc.threat_actor_tags || []).length}</strong>
                <span className="cc-stat-label">Actor Tags</span>
              </div>
            </div>

            {/* Confidence + tags — flat detail rows */}
            <div className="aip-activity fade-in-delay-1">
              <div className="aip-activity-hd">
                <span className="aip-activity-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <ShieldAlert size={12} />CONFIDENCE &amp; TAGGING
                </span>
              </div>
              <div className="lc-detail-table">
                <div className="lc-detail-row">
                  <span className="lc-detail-key">Confidence model</span>
                  <span className="lc-detail-val">{ioc.source_confidence_label || 'moderate'} · {Math.round(Number(ioc.source_confidence || 0) * 100)}%</span>
                </div>
                <div className="lc-detail-row">
                  <span className="lc-detail-key">Threat actor tags</span>
                  <span className="lc-detail-val">
                    {(ioc.threat_actor_tags || []).length ? (
                      <span style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {ioc.threat_actor_tags.map((t) => (
                          <span key={t.tag} className="lc-tag">{t.tag} {Math.round(Number(t.confidence || 0) * 100)}%</span>
                        ))}
                      </span>
                    ) : <span style={{ color:'rgba(148,163,184,.4)' }}>No actor tags inferred yet.</span>}
                  </span>
                </div>
                <div className="lc-detail-row">
                  <span className="lc-detail-key">Pivots</span>
                  <span className="lc-detail-val" style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                    <Link className="aip-viewall" to={`/correlation/${encodeURIComponent(iocType)}/${encodeURIComponent(indicator)}`}>
                      Correlation graph ›
                    </Link>
                    {iocType === 'ip' ? (
                      <Link className="aip-viewall" to={buildIpLookupPath(indicator)}>IP lookup ›</Link>
                    ) : null}
                    <Link className="aip-viewall" to="/investigation-center/scanner">
                      Open scanner ›
                    </Link>
                  </span>
                </div>
              </div>
            </div>

            {/* Geo — only for IP */}
            {ioc.geo ? (
              <div className="aip-activity fade-in-delay-1">
                <div className="aip-activity-hd">
                  <span className="aip-activity-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <Globe2 size={12} />GEO INTELLIGENCE
                  </span>
                </div>
                <div className="lc-detail-table">
                  <div className="lc-detail-row">
                    <span className="lc-detail-key">Location</span>
                    <span className="lc-detail-val">{ioc.geo.location_name || 'Unknown'}</span>
                  </div>
                  <div className="lc-detail-row">
                    <span className="lc-detail-key">Region / Country</span>
                    <span className="lc-detail-val">{ioc.geo.region || '—'} / {ioc.geo.country || '—'}</span>
                  </div>
                  <div className="lc-detail-row">
                    <span className="lc-detail-key">Network</span>
                    <span className="lc-detail-val">{ioc.geo.organization || ioc.geo.isp || '—'}</span>
                  </div>
                  <div className="lc-detail-row">
                    <span className="lc-detail-key">Coordinates</span>
                    <span className="lc-detail-val">{ioc.geo.latitude}, {ioc.geo.longitude}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Signal tables */}
            <TableSection label="SCAN HISTORY"              icon={Waves}       rows={payload.scan_history}    fallbackType={iocType} navigate={navigate} onCopy={copyIndicator} sectionKey="scan" />
            <TableSection label="COLLECTED INTELLIGENCE"   icon={DatabaseZap} rows={payload.collected_signals} fallbackType={iocType} navigate={navigate} onCopy={copyIndicator} sectionKey="intel" />
            <TableSection label="COMMUNITY VISIBILITY"     icon={Radar}       rows={payload.community}       fallbackType={iocType} navigate={navigate} onCopy={copyIndicator} sectionKey="community" />
            <TableSection label="ANALYSIS MATCHES"         icon={ShieldAlert} rows={payload.analyses}        fallbackType={iocType} navigate={navigate} onCopy={copyIndicator} sectionKey="analyses" />
            {payload.observations?.length ? (
              <TableSection
                label="INFRASTRUCTURE OBSERVATIONS"
                icon={Globe2}
                rows={payload.observations.map((o) => ({ ...o, indicator: o.ip, indicator_type: 'ip' }))}
                fallbackType="ip"
                navigate={navigate}
                onCopy={copyIndicator}
                sectionKey="observations"
              />
            ) : null}
          </>
        ) : null}

      </div>
    </div>
  )
}
