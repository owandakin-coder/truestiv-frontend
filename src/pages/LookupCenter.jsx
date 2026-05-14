import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Globe2, Play, ScanSearch, Waypoints } from 'lucide-react'

import IntelEmptyState from '../components/IntelEmptyState'
import Seo from '../components/Seo'
import { apiRequest } from '../services/api'
import {
  buildDomainLookupPath,
  buildHeaderAnalyzerPath,
  buildIpLookupPath,
  detectBrandImpersonation,
  formatRelativeDate,
  levelColor,
  normalizeThreatLevel,
} from '../utils/intelTools'

// ── Shared sub-components ───────────────────────────────────────
function RowTag({ value }) {
  return <span className="lc-tag">{value}</span>
}

function DetailTable({ rows }) {
  return (
    <div className="lc-detail-table">
      {rows.map(([label, value]) => (
        <div key={label} className="lc-detail-row">
          <span className="lc-detail-key">{label}</span>
          <span className="lc-detail-val">{value}</span>
        </div>
      ))}
    </div>
  )
}

function VerdictSide({ verdict, recommendation, copy, accent, children }) {
  return (
    <aside className="lc-verdict-aside">
      <div className="lc-verdict-badge" style={{ color: accent, borderColor: `${accent}33`, background: `${accent}10` }}>
        {verdict}
      </div>
      <p className="lc-verdict-copy">{copy}</p>
      <div className="lc-verdict-rec-label">Recommendation</div>
      <div className="lc-verdict-rec">{recommendation}</div>
      {children}
    </aside>
  )
}

function SignalsTable({ items }) {
  if (!items?.length) return null
  return (
    <div className="aip-activity" style={{ marginTop: 32 }}>
      <div className="aip-activity-hd">
        <span className="aip-activity-label">RECENT SIGNALS</span>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'rgba(148,163,184,.4)' }}>
          {items.length} events
        </span>
      </div>
      <div className="aip-thead" style={{ gridTemplateColumns: 'minmax(0,2fr) 120px 140px 90px 20px' }}>
        <span>SIGNAL</span><span>TYPE</span><span>LEVEL</span><span>TIME</span><span />
      </div>
      <div className="aip-tbody">
        {items.map((item, i) => {
          const color = levelColor(item.threat_level)
          const label = normalizeThreatLevel(item.threat_level).toUpperCase()
          return (
            <div key={`${item.event_type}-${i}`} className="aip-trow" style={{ cursor: 'default' }}>
              <div className="aip-td-indicator">
                <span className="aip-trow-text">{item.title || 'Collected signal'}</span>
              </div>
              <div className="aip-td aip-td-type">{String(item.event_type || 'signal').replace(/_/g, ' ').toUpperCase()}</div>
              <div className="aip-td aip-td-verdict">
                <span className="aip-verdict-dot" style={{ background: color }} />
                <span className="aip-verdict-label" style={{ color }}>{label}</span>
              </div>
              <div className="aip-td aip-td-time">{formatRelativeDate(item.created_at)}</div>
              <div className="aip-td aip-td-arrow" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────
function LookupCenter() {
  const navigate = useNavigate()
  const { mode = 'ip', indicator = '' } = useParams()
  const activeMode = ['ip', 'domain', 'email-header'].includes(mode) ? mode : 'ip'

  const [ipQuery,      setIpQuery]      = useState(indicator)
  const [domainQuery,  setDomainQuery]  = useState(indicator)
  const [headerInput,  setHeaderInput]  = useState('')
  const [ipPayload,    setIpPayload]    = useState(null)
  const [domainPayload, setDomainPayload] = useState(null)
  const [headerPayload, setHeaderPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (activeMode === 'ip')     setIpQuery(indicator || '')
    if (activeMode === 'domain') setDomainQuery(indicator || '')
  }, [activeMode, indicator])

  useEffect(() => {
    setError('')
    if (activeMode !== 'ip')           setIpPayload(null)
    if (activeMode !== 'domain')       setDomainPayload(null)
    if (activeMode !== 'email-header') setHeaderPayload(null)
    if (activeMode === 'email-header' || !indicator) setLoading(false)
  }, [activeMode, indicator])

  useEffect(() => {
    if (activeMode !== 'ip' || !indicator) { if (activeMode === 'ip') setIpPayload(null); return }
    let active = true
    setLoading(true); setError('')
    apiRequest(`/api/intelligence/ip-lookup/${encodeURIComponent(indicator)}`)
      .then((r) => { if (active) setIpPayload(r) })
      .catch((e) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activeMode, indicator])

  useEffect(() => {
    if (activeMode !== 'domain' || !indicator) { if (activeMode === 'domain') setDomainPayload(null); return }
    let active = true
    setLoading(true); setError('')
    apiRequest(`/api/intelligence/domain-lookup/${encodeURIComponent(indicator)}`)
      .then((r) => { if (active) setDomainPayload(r) })
      .catch((e) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activeMode, indicator])

  const runIpLookup = (e) => { e.preventDefault(); const v = ipQuery.trim(); if (v) navigate(buildIpLookupPath(v)) }
  const runDomainLookup = (e) => { e.preventDefault(); const v = domainQuery.trim(); if (v) navigate(buildDomainLookupPath(v)) }
  const runHeaderAnalysis = async (e) => {
    e.preventDefault()
    const v = headerInput.trim()
    if (!v) return
    setLoading(true); setError(''); setHeaderPayload(null)
    try {
      const r = await apiRequest('/api/intelligence/email-header/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers: v }),
      })
      setHeaderPayload(r)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const ipLookup     = ipPayload?.lookup
  const domainLookup = domainPayload?.lookup
  const domainBrandSignal = useMemo(() => {
    if (!domainLookup?.domain) return null
    return domainPayload?.brand_impersonation || domainLookup?.brand_impersonation || detectBrandImpersonation(domainLookup.domain, domainLookup.age_days)
  }, [domainLookup, domainPayload])
  const headerAnalysis = headerPayload?.analysis

  const tabs = [
    { id: 'ip',           label: 'IP Lookup',     path: buildIpLookupPath('') },
    { id: 'domain',       label: 'Domain Lookup',  path: buildDomainLookupPath('') },
    { id: 'email-header', label: 'Email Header',   path: buildHeaderAnalyzerPath() },
  ]

  const placeholder = activeMode === 'ip'     ? 'Enter an IPv4 or IPv6 address…'
    : activeMode === 'domain' ? 'Enter a domain like suspicious-example.com…'
    : 'Paste raw email headers here…'

  return (
    <div className="aip-root">
      <Seo
        title={`Trustive AI | ${activeMode === 'domain' ? 'Domain Lookup' : activeMode === 'email-header' ? 'Email Header Analysis' : 'IP Lookup'}`}
        description="Investigate IPs, domains, and email headers with enrichment, recent signals, and linked intelligence context."
        path={indicator ? `/lookup-center/${activeMode}/${encodeURIComponent(indicator)}` : `/lookup-center/${activeMode}`}
      />
      <div className="grid-dots aip-bg-dots" />
      <div className="aip-inner">

        {/* Hero */}
        <header className="aip-hero fade-in">
          <div className="aip-kicker">
            <span className="aip-kicker-dot" />
            <span className="aip-kicker-text">LOOKUP CENTER</span>
          </div>
          <h1 className="aip-title">
            {activeMode === 'ip'           ? <>IP Lookup.</> :
             activeMode === 'domain'       ? <>Domain Lookup.</> :
                                             <>Email Header Analysis.</>}
          </h1>
          <p className="aip-copy">
            {activeMode === 'ip'           ? 'Inspect geolocation, ASN, sightings, and linked intelligence for any IP.' :
             activeMode === 'domain'       ? 'Inspect DNS, registration age, reputation, and brand impersonation.' :
                                             'Parse transport hops, auth failures, and extract pivot artifacts.'}
          </p>
        </header>

        {/* Tab bar */}
        <div className="aip-filter-bar fade-in-delay-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`aip-tab-btn${activeMode === tab.id ? ' is-active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        {activeMode !== 'email-header' ? (
          <form
            className={`aip-searchbar fade-in-delay-1${(activeMode === 'ip' ? ipQuery : domainQuery) ? ' aip-searchbar-lit' : ''}`}
            onSubmit={activeMode === 'ip' ? runIpLookup : runDomainLookup}
          >
            <input
              className="aip-search-input"
              style={{ fontFamily: 'var(--i-mono)', border: 'none', background: 'none', outline: 'none', flex: 1, color: 'inherit', fontSize: 14 }}
              value={activeMode === 'ip' ? ipQuery : domainQuery}
              onChange={(e) => activeMode === 'ip' ? setIpQuery(e.target.value) : setDomainQuery(e.target.value)}
              placeholder={placeholder}
              spellCheck={false}
              autoComplete="off"
            />
            <div className="aip-search-right">
              <button type="submit" className="aip-analyze-btn" disabled={loading}>
                {loading ? <span className="aip-spin" /> : <Play size={13} fill="currentColor" />}
                <span>LOOKUP</span>
              </button>
            </div>
          </form>
        ) : (
          <form className="lc-header-form fade-in-delay-1" onSubmit={runHeaderAnalysis}>
            <textarea
              className="aip-search-input lc-header-textarea"
              rows={8}
              value={headerInput}
              onChange={(e) => setHeaderInput(e.target.value)}
              placeholder={placeholder}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="aip-analyze-btn" disabled={loading}>
                {loading ? <span className="aip-spin" /> : <Play size={13} fill="currentColor" />}
                <span>ANALYZE</span>
              </button>
            </div>
          </form>
        )}

        {error   ? <p className="aip-error fade-in" style={{ borderColor: 'rgba(240,64,64,.28)', color: '#fca5a5' }}>{error}</p> : null}
        {loading ? <p className="aip-loading">Running lookup…</p> : null}

        {/* Empty states */}
        {!loading && !error && activeMode === 'ip' && !ipLookup ? (
          <IntelEmptyState
            title="Start with an IP address"
            copy="Inspect location, sightings, and pivots from one place."
            examples={[{ label: '185.220.101.42', onClick: () => navigate(buildIpLookupPath('185.220.101.42')) }]}
          />
        ) : null}
        {!loading && !error && activeMode === 'domain' && !domainLookup ? (
          <IntelEmptyState
            title="Start with a domain"
            copy="Inspect DNS, infrastructure, and brand impersonation in one place."
            examples={[{ label: 'secure-paypaI-login-check.com', onClick: () => navigate(buildDomainLookupPath('secure-paypaI-login-check.com')) }]}
          />
        ) : null}
        {!loading && !error && activeMode === 'email-header' && !headerAnalysis ? (
          <IntelEmptyState
            title="Paste raw email headers"
            copy="Parse transport hops, auth checks, and pivots."
            examples={[{ label: 'Insert sample header', onClick: () => setHeaderInput('Received: from suspicious-mail.example (185.220.101.42) by mx.google.com;\nAuthentication-Results: spf=fail dkim=none dmarc=fail;\nReply-To: support@secure-paypaI-login-check.com') }]}
          />
        ) : null}

        {/* ── IP result ── */}
        {!loading && activeMode === 'ip' && ipLookup ? (
          <>
            <div className="lc-result-grid fade-in">
              {/* Left: details */}
              <div className="lc-result-main">
                <div className="lc-section-label">INFRASTRUCTURE</div>
                <div className="lc-section-title">{ipLookup.ip}</div>
                <DetailTable rows={[
                  ['Country',      ipLookup.geo?.country      || 'Unknown'],
                  ['Region',       ipLookup.geo?.region       || 'Unknown'],
                  ['City',         ipLookup.geo?.city         || 'Unknown'],
                  ['ASN',          ipLookup.geo?.asn          || 'Unknown'],
                  ['ISP',          ipLookup.geo?.isp          || 'Unknown'],
                  ['Organization', ipLookup.geo?.organization || 'Unknown'],
                  ['Sightings',    String(ipPayload?.sightings?.total || 0)],
                  ['Confidence',   `${Math.round(Number(ipLookup.source_confidence || 0) * 100)}%`],
                ]} />
                {(ipLookup.threat_actor_tags || []).length ? (
                  <div className="lc-tags-row">
                    <div className="lc-section-label" style={{ marginBottom: 8 }}>THREAT ACTOR TAGS</div>
                    {ipLookup.threat_actor_tags.map((tag) => (
                      <RowTag key={tag.tag} value={`${tag.tag} ${(tag.confidence * 100).toFixed(0)}%`} />
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Right: verdict + pivots */}
              <VerdictSide
                verdict={normalizeThreatLevel(ipLookup.threat_level)}
                recommendation={ipLookup.recommendation || 'allow'}
                copy={ipLookup.summary || ipLookup.geo?.organization || 'Infrastructure details resolved from active providers.'}
                accent={levelColor(ipLookup.threat_level)}
              >
                <div className="lc-verdict-rec-label" style={{ marginTop: 20 }}>PIVOT</div>
                <div className="lc-pivot-list">
                  <Link to="/investigation-center/scanner" className="lc-pivot-btn">
                    <ScanSearch size={15} />Open Scanner
                  </Link>
                  {ipPayload?.pivots?.correlation_path ? (
                    <Link to={ipPayload.pivots.correlation_path} className="lc-pivot-btn">
                      <Waypoints size={15} />Correlation Graph
                    </Link>
                  ) : null}
                  <Link to="/propagation" className="lc-pivot-btn">
                    <Globe2 size={15} />Threat Map
                  </Link>
                </div>
              </VerdictSide>
            </div>

            <SignalsTable items={ipPayload?.recent_events || []} />
          </>
        ) : null}

        {/* ── Domain result ── */}
        {!loading && activeMode === 'domain' && domainLookup ? (
          <>
            <div className="lc-result-grid fade-in">
              <div className="lc-result-main">
                <div className="lc-section-label">DOMAIN DOSSIER</div>
                <div className="lc-section-title">{domainLookup.domain}</div>
                <DetailTable rows={[
                  ['Registrar',   domainLookup.registrar || 'Unknown'],
                  ['Age',         domainLookup.age_days != null ? `${domainLookup.age_days} days` : 'Unknown'],
                  ['A Records',   (domainPayload?.dns?.a  || []).join(', ')  || 'None'],
                  ['MX Records',  (domainPayload?.dns?.mx || []).join(', ')  || 'None'],
                  ['NS Records',  (domainPayload?.dns?.ns || []).join(', ')  || 'None'],
                  ['TXT Records', (domainPayload?.dns?.txt || []).slice(0, 2).join(' | ') || 'None'],
                  ['Sightings',   String(domainPayload?.sightings?.total || 0)],
                  ['Confidence',  `${Math.round(Number(domainLookup.source_confidence || 0) * 100)}%`],
                ]} />
                {(domainLookup.threat_actor_tags || []).length ? (
                  <div className="lc-tags-row">
                    <div className="lc-section-label" style={{ marginBottom: 8 }}>THREAT ACTOR TAGS</div>
                    {domainLookup.threat_actor_tags.map((tag) => (
                      <RowTag key={tag.tag} value={`${tag.tag} ${(tag.confidence * 100).toFixed(0)}%`} />
                    ))}
                  </div>
                ) : null}
                {domainBrandSignal ? (
                  <div className={`lc-brand-signal${domainBrandSignal.active ? ' is-active' : ''}`}>
                    <div className="lc-section-label">BRAND IMPERSONATION</div>
                    <strong style={{ color: domainBrandSignal.active ? '#f59e0b' : 'rgba(148,163,184,.6)', display: 'block', margin: '6px 0' }}>
                      {domainBrandSignal.active
                        ? `Detected${domainBrandSignal.brand ? `: ${domainBrandSignal.brand}` : ''}`
                        : 'No high-risk pattern detected.'}
                    </strong>
                    {domainBrandSignal.active ? (
                      <p style={{ color: 'rgba(148,163,184,.6)', lineHeight: 1.6, fontSize: 13, margin: 0 }}>
                        {(domainBrandSignal.summary || '').trim() || 'Matches typo and lure patterns common in phishing.'}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <VerdictSide
                verdict={normalizeThreatLevel(domainLookup.threat_level)}
                recommendation={domainLookup.recommendation || 'allow'}
                copy={domainBrandSignal?.summary || 'Pivot from this domain into IP enrichment, IOC details, and correlation.'}
                accent={levelColor(domainLookup.threat_level)}
              >
                <div className="lc-verdict-rec-label" style={{ marginTop: 20 }}>RELATED IPs</div>
                {(domainPayload?.related_ips || []).length ? (
                  <div className="lc-pivot-list">
                    {domainPayload.related_ips.map((item) => (
                      <Link key={item.ip} to={item.lookup_path} className="lc-pivot-btn">
                        {item.ip}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'rgba(148,163,184,.4)', fontSize: 12 }}>No A record IPs returned.</p>
                )}
                <div className="lc-verdict-rec-label" style={{ marginTop: 14 }}>PIVOT</div>
                <div className="lc-pivot-list">
                  {domainPayload?.pivots?.ioc_details_path ? (
                    <Link to={domainPayload.pivots.ioc_details_path} className="lc-pivot-btn">IOC Details</Link>
                  ) : null}
                  {domainPayload?.pivots?.correlation_path ? (
                    <Link to={domainPayload.pivots.correlation_path} className="lc-pivot-btn">Correlation Graph</Link>
                  ) : null}
                </div>
              </VerdictSide>
            </div>

            <SignalsTable items={domainPayload?.recent_events || []} />
          </>
        ) : null}

        {/* ── Email header result ── */}
        {!loading && activeMode === 'email-header' && headerAnalysis ? (
          <>
            <div className="lc-result-grid fade-in">
              <div className="lc-result-main">
                <div className="lc-section-label">AUTHENTICATION</div>
                <div className="lc-section-title">SPF · DKIM · DMARC</div>
                <DetailTable rows={[
                  ['SPF',          headerPayload?.authentication?.spf  || 'unknown'],
                  ['DKIM',         headerPayload?.authentication?.dkim || 'unknown'],
                  ['DMARC',        headerPayload?.authentication?.dmarc || 'unknown'],
                  ['Origin IP',    headerAnalysis.origin_ip            || 'Unknown'],
                  ['Reply-To',     headerAnalysis.reply_to_domain      || 'Unknown'],
                  ['Return-Path',  headerAnalysis.return_path_domain   || 'Unknown'],
                  ['Message-ID',   headerAnalysis.message_id           || 'Unknown'],
                  ['From Domain',  headerAnalysis.from_domain          || 'Unknown'],
                ]} />
                {(headerPayload?.findings || []).length ? (
                  <div style={{ marginTop: 16 }}>
                    <div className="lc-section-label" style={{ marginBottom: 10 }}>FINDINGS</div>
                    {headerPayload.findings.map((item, i) => (
                      <div key={`finding-${i}-${String(item).slice(0, 20)}`} className="lc-finding-row">
                        <span className="lc-finding-num">{i + 1}</span>
                        <p style={{ color: 'rgba(226,232,240,.75)', lineHeight: 1.65, fontSize: 13, margin: 0 }}>{item}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'rgba(148,163,184,.4)', fontSize: 13, marginTop: 16 }}>No high-risk mismatches were detected.</p>
                )}
              </div>

              <VerdictSide
                verdict={normalizeThreatLevel(headerAnalysis.threat_level)}
                recommendation={headerAnalysis.recommendation || 'review'}
                copy={headerAnalysis.summary || 'Jump into domain and IP investigation from the extracted artifacts.'}
                accent={levelColor(headerAnalysis.threat_level)}
              >
                {(headerPayload?.pivot_domains || []).length ? (
                  <>
                    <div className="lc-verdict-rec-label" style={{ marginTop: 20 }}>DOMAINS</div>
                    <div className="lc-pivot-list">
                      {headerPayload.pivot_domains.map((item) => (
                        <Link key={item.domain} to={item.lookup_path} className="lc-pivot-btn">{item.domain}</Link>
                      ))}
                    </div>
                  </>
                ) : null}
                {(headerPayload?.pivot_ips || []).length ? (
                  <>
                    <div className="lc-verdict-rec-label" style={{ marginTop: 14 }}>IPs</div>
                    <div className="lc-pivot-list">
                      {headerPayload.pivot_ips.map((item) => (
                        <Link key={item.ip} to={item.lookup_path} className="lc-pivot-btn">{item.ip}</Link>
                      ))}
                    </div>
                  </>
                ) : null}
              </VerdictSide>
            </div>

            {(headerPayload?.related_analyses || []).length ? (
              <div className="aip-activity" style={{ marginTop: 32 }}>
                <div className="aip-activity-hd">
                  <span className="aip-activity-label">RELATED ANALYSES</span>
                </div>
                <div className="aip-thead" style={{ gridTemplateColumns: 'minmax(0,2fr) 140px 90px 20px' }}>
                  <span>SUBJECT / SENDER</span><span>LEVEL</span><span>TIME</span><span />
                </div>
                <div className="aip-tbody">
                  {headerPayload.related_analyses.map((item) => {
                    const color = levelColor(item.threat_level)
                    return (
                      <div key={item.id} className="aip-trow" style={{ cursor: 'default' }}>
                        <div className="aip-td-indicator">
                          <span className="aip-trow-text">{item.subject || item.sender || 'Analysis match'}</span>
                        </div>
                        <div className="aip-td aip-td-verdict">
                          <span className="aip-verdict-dot" style={{ background: color }} />
                          <span className="aip-verdict-label" style={{ color }}>{normalizeThreatLevel(item.threat_level).toUpperCase()}</span>
                        </div>
                        <div className="aip-td aip-td-time">{formatRelativeDate(item.created_at)}</div>
                        <div className="aip-td aip-td-arrow" />
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </>
        ) : null}

      </div>
    </div>
  )
}

export default LookupCenter
