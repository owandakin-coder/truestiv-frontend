import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Globe2, ScanSearch, Waypoints } from 'lucide-react'

import IntelEmptyState from '../components/IntelEmptyState'
import { useTheme } from '../components/ThemeProvider'
import { apiRequest } from '../services/api'
import {
  buildDomainLookupPath,
  buildHeaderAnalyzerPath,
  buildIpLookupPath,
  detectBrandImpersonation,
  formatRelativeDate,
  normalizeThreatLevel,
} from '../utils/intelTools'

function paletteFor(theme) {
  const dark = theme !== 'light'
  return {
    text: dark ? '#eff6ff' : '#0f172a',
    muted: dark ? 'rgba(191,219,254,0.72)' : '#475569',
    subtle: dark ? 'rgba(191,219,254,0.5)' : '#64748b',
    blue: '#38bdf8',
    cyan: '#22d3ee',
    green: '#22c55e',
    yellow: '#fbbf24',
    red: '#fb7185',
  }
}

function levelColor(level, palette) {
  const value = String(level || '').toLowerCase()
  if (value === 'threat') return palette.red
  if (value === 'suspicious') return palette.yellow
  if (value === 'safe') return palette.green
  return palette.blue
}

function RowTag({ value }) {
  return <span className="intel-actor-tag">{value}</span>
}

function LookupTabs({ activeMode, navigate }) {
  const tabs = [
    { id: 'ip', label: 'IP Lookup', path: buildIpLookupPath('') },
    { id: 'domain', label: 'Domain Lookup', path: buildDomainLookupPath('') },
    { id: 'email-header', label: 'Email Header', path: buildHeaderAnalyzerPath() },
  ]

  return (
    <div className="lookup-tab-row">
      {tabs.map((tab) => {
        const active = activeMode === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigate(tab.path)}
            className={`lookup-tab-button ${active ? 'is-active' : ''}`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

function DossierTable({ rows }) {
  return (
    <div className="dossier-table">
      {rows.map(([label, value]) => (
        <div key={label} className="dossier-row">
          <div className="dossier-key">{label}</div>
          <div className="dossier-value">{value}</div>
        </div>
      ))}
    </div>
  )
}

function DossierSidePanel({ verdict, recommendation, copy, accent, children }) {
  return (
    <aside className="dossier-sidepanel">
      <div className="signal-strip-label">Verdict</div>
      <div className="dossier-verdict" style={{ color: accent }}>{verdict}</div>
      <div className="intel-reading-block">{copy}</div>
      <div className="signal-strip-label">Recommendation</div>
      <div className="dossier-value">{recommendation}</div>
      {children}
    </aside>
  )
}

function LookupCenter() {
  const { theme } = useTheme()
  const palette = useMemo(() => paletteFor(theme), [theme])
  const navigate = useNavigate()
  const { mode = 'ip', indicator = '' } = useParams()

  const activeMode = ['ip', 'domain', 'email-header'].includes(mode) ? mode : 'ip'

  const [ipQuery, setIpQuery] = useState(indicator)
  const [domainQuery, setDomainQuery] = useState(indicator)
  const [headerInput, setHeaderInput] = useState('')
  const [ipPayload, setIpPayload] = useState(null)
  const [domainPayload, setDomainPayload] = useState(null)
  const [headerPayload, setHeaderPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (activeMode === 'ip') setIpQuery(indicator || '')
    if (activeMode === 'domain') setDomainQuery(indicator || '')
  }, [activeMode, indicator])

  useEffect(() => {
    setError('')
    if (activeMode !== 'ip') setIpPayload(null)
    if (activeMode !== 'domain') setDomainPayload(null)
    if (activeMode !== 'email-header') setHeaderPayload(null)
    if (activeMode === 'email-header' || !indicator) {
      setLoading(false)
    }
  }, [activeMode, indicator])

  useEffect(() => {
    if (activeMode !== 'ip' || !indicator) {
      if (activeMode === 'ip') setIpPayload(null)
      return
    }
    let active = true
    setLoading(true)
    setError('')
    apiRequest(`/api/intelligence/ip-lookup/${encodeURIComponent(indicator)}`)
      .then((response) => {
        if (active) setIpPayload(response)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [activeMode, indicator])

  useEffect(() => {
    if (activeMode !== 'domain' || !indicator) {
      if (activeMode === 'domain') setDomainPayload(null)
      return
    }
    let active = true
    setLoading(true)
    setError('')
    apiRequest(`/api/intelligence/domain-lookup/${encodeURIComponent(indicator)}`)
      .then((response) => {
        if (active) setDomainPayload(response)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [activeMode, indicator])

  const runIpLookup = (event) => {
    event.preventDefault()
    const normalized = ipQuery.trim()
    if (!normalized) return
    navigate(buildIpLookupPath(normalized))
  }

  const runDomainLookup = (event) => {
    event.preventDefault()
    const normalized = domainQuery.trim()
    if (!normalized) return
    navigate(buildDomainLookupPath(normalized))
  }

  const runHeaderAnalysis = async (event) => {
    event.preventDefault()
    const normalized = headerInput.trim()
    if (!normalized) return
    setLoading(true)
    setError('')
    setHeaderPayload(null)
    try {
      const response = await apiRequest('/api/intelligence/email-header/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers: normalized }),
      })
      setHeaderPayload(response)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const ipLookup = ipPayload?.lookup
  const domainLookup = domainPayload?.lookup
  const domainBrandSignal = useMemo(() => {
    if (!domainLookup?.domain) return null
    return domainPayload?.brand_impersonation || domainLookup?.brand_impersonation || detectBrandImpersonation(domainLookup.domain, domainLookup.age_days)
  }, [domainLookup, domainPayload])
  const headerAnalysis = headerPayload?.analysis
  return (
    <section className="intel-shell zone-lookup">
      <div className="intel-hero-card portal-hero portal-hero-single lookup-hero fade-in">
        <div className="intel-hero-content portal-hero-main">
          <div className="intel-eyebrow">
            <span className="intel-eyebrow-dot" />
            Lookup Center
          </div>
          <h1 className="intel-title" style={{ fontSize: 30, lineHeight: 1.3 }}>
            One workspace for IP, domain,<br />and email header investigation
          </h1>
          <p className="intel-copy intel-reading-block">
            Move between IP, domain, and header enrichment without leaving the same desk.
          </p>
        </div>
      </div>

      <section className="intel-section-card lookup-intake-panel fade-in-delay-1">
        <LookupTabs activeMode={activeMode} navigate={navigate} />

        {activeMode === 'ip' ? (
          <form onSubmit={runIpLookup} className="intel-search-row" style={{ maxWidth: 760, margin: '0 auto' }}>
            <input
              className="analysis-input"
              value={ipQuery}
              onChange={(event) => setIpQuery(event.target.value)}
              placeholder="Enter an IPv4 or IPv6 address"
              style={{ flex: 1, minWidth: 220 }}
            />
            <button type="submit" className="intel-button primary">
              Run IP Lookup
            </button>
          </form>
        ) : null}

        {activeMode === 'domain' ? (
          <form onSubmit={runDomainLookup} className="intel-search-row" style={{ maxWidth: 760, margin: '0 auto' }}>
            <input
              className="analysis-input"
              value={domainQuery}
              onChange={(event) => setDomainQuery(event.target.value)}
              placeholder="Enter a domain like suspicious-example.com"
              style={{ flex: 1, minWidth: 220 }}
            />
            <button type="submit" className="intel-button primary">
              Run Domain Lookup
            </button>
          </form>
        ) : null}

        {activeMode === 'email-header' ? (
          <form onSubmit={runHeaderAnalysis} style={{ display: 'grid', gap: 16 }}>
            <textarea
              className="analysis-textarea"
              rows={10}
              value={headerInput}
              onChange={(event) => setHeaderInput(event.target.value)}
              placeholder={'Paste raw email headers here, including Received, Authentication-Results, Return-Path, Reply-To, and Message-ID.'}
            />
            <button type="submit" className="intel-button primary" style={{ justifySelf: 'center', minWidth: 220 }}>
              Analyze Email Header
            </button>
          </form>
        ) : null}
      </section>

      {error ? <div className="intel-empty-card">{error}</div> : null}
      {loading ? <div className="intel-empty-card">Running lookup...</div> : null}

      {!loading && !error && activeMode === 'ip' && !ipLookup ? (
        <IntelEmptyState
          title="Start with an IP address"
          copy="Use this workspace to inspect geolocation, source confidence, sightings, and pivots into the wider Trustive AI intelligence graph."
          examples={[
            { label: '185.220.101.42', onClick: () => navigate(buildIpLookupPath('185.220.101.42')) },
            { label: '8.8.8.8', onClick: () => navigate(buildIpLookupPath('8.8.8.8')) },
          ]}
        />
      ) : null}

      {!loading && !error && activeMode === 'domain' && !domainLookup ? (
        <IntelEmptyState
          title="Start with a domain"
          copy="Run a domain lookup to inspect registrar data, DNS, related IPs, sightings, and brand impersonation signals without opening multiple tools."
          examples={[
            { label: 'secure-paypaI-login-check.com', onClick: () => navigate(buildDomainLookupPath('secure-paypaI-login-check.com')) },
            { label: 'microsoft-billing-center-help.com', onClick: () => navigate(buildDomainLookupPath('microsoft-billing-center-help.com')) },
          ]}
        />
      ) : null}

      {!loading && !error && activeMode === 'email-header' && !headerAnalysis ? (
        <IntelEmptyState
          title="Paste raw email headers"
          copy="Received hops, SPF, DKIM, DMARC, Reply-To mismatches, and extracted domains or IPs will appear here after analysis."
          examples={[
            { label: 'Insert sample header', onClick: () => setHeaderInput('Received: from suspicious-mail.example (185.220.101.42) by mx.google.com;\nAuthentication-Results: spf=fail dkim=none dmarc=fail;\nReply-To: support@secure-paypaI-login-check.com') },
          ]}
        />
      ) : null}

      {!loading && activeMode === 'ip' && ipLookup ? (
        <>
          <div className="dossier-layout fade-in-delay-1">
            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Infrastructure</div>
                <h2 className="intel-section-title">{ipLookup.ip}</h2>
                <p className="intel-section-copy intel-reading-block">
                  Confidence {ipLookup.source_confidence_label || 'moderate'} ({ipLookup.source_confidence || 0}) across aggregated enrichment and internal sightings.
                </p>
              </div>
              <DossierTable
                rows={[
                  ['Country', ipLookup.geo?.country || 'Unknown'],
                  ['Region', ipLookup.geo?.region || 'Unknown'],
                  ['City', ipLookup.geo?.city || 'Unknown'],
                  ['ASN', ipLookup.geo?.asn || 'Unknown'],
                  ['ISP', ipLookup.geo?.isp || 'Unknown'],
                  ['Organization', ipLookup.geo?.organization || 'Unknown'],
                  ['Sightings', String(ipPayload?.sightings?.total || 0)],
                  ['Confidence', `${Math.round(Number(ipLookup.source_confidence || 0) * 100)}%`],
                ]}
              />
              {(ipLookup.threat_actor_tags || []).length ? (
                <div style={{ marginTop: 18 }}>
                  <div className="intel-meta-label" style={{ marginBottom: 10 }}>Threat actor tags</div>
                  <div className="intel-tag-row">
                    {ipLookup.threat_actor_tags.map((tag) => (
                      <RowTag key={tag.tag} value={`${tag.tag} ${(tag.confidence * 100).toFixed(0)}%`} />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <DossierSidePanel
              verdict={normalizeThreatLevel(ipLookup.threat_level)}
              recommendation={ipLookup.recommendation || 'allow'}
              copy={ipLookup.summary || ipLookup.geo?.organization || 'Infrastructure details resolved from active providers.'}
              accent={levelColor(ipLookup.threat_level, palette)}
            >
              <div className="signal-strip-label">Continue</div>
              <div className="intel-action-grid ip-lookup-action-grid">
                <Link to="/investigation-center/scanner" className="intel-action-card ip-lookup-action-card">
                  <div className="ip-lookup-action-icon" style={{ background: 'rgba(37,99,235,0.12)' }}>
                    <ScanSearch size={18} color={palette.blue} />
                  </div>
                  <div className="ip-lookup-action-body">
                    <strong>Open Scanner</strong>
                    <p>Run a fresh enriched IP scan and compare the result with this dossier.</p>
                  </div>
                </Link>
                <Link to={ipPayload?.pivots?.correlation_path || '#'} className="intel-action-card ip-lookup-action-card">
                  <div className="ip-lookup-action-icon" style={{ background: 'rgba(34,211,238,0.12)' }}>
                    <Waypoints size={18} color={palette.cyan} />
                  </div>
                  <div className="ip-lookup-action-body">
                    <strong>Open Correlation Graph</strong>
                    <p>See how this IP connects to scans, publications, analyses, media, and actor tags.</p>
                  </div>
                </Link>
                <Link to="/propagation" className="intel-action-card ip-lookup-action-card">
                  <div className="ip-lookup-action-icon" style={{ background: 'rgba(34,197,94,0.12)' }}>
                    <Globe2 size={18} color={palette.green} />
                  </div>
                  <div className="ip-lookup-action-body">
                    <strong>Open Threat Map</strong>
                    <p>Compare this IP with active infrastructure markers on the map.</p>
                  </div>
                </Link>
              </div>
            </DossierSidePanel>
          </div>
        </>
      ) : null}

      {!loading && activeMode === 'domain' && domainLookup ? (
        <>
          <div className="dossier-layout fade-in-delay-1">
            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Domain dossier</div>
                <h2 className="intel-section-title">{domainLookup.domain}</h2>
                <p className="intel-section-copy intel-reading-block">
                  DNS, registration age, reputation, and related infrastructure from public intelligence providers.
                </p>
              </div>
              <DossierTable
                rows={[
                  ['Registrar', domainLookup.registrar || 'Unknown'],
                  ['Age', domainLookup.age_days != null ? `${domainLookup.age_days} days` : 'Unknown'],
                  ['A Records', (domainPayload?.dns?.a || []).join(', ') || 'None'],
                  ['MX Records', (domainPayload?.dns?.mx || []).join(', ') || 'None'],
                  ['NS Records', (domainPayload?.dns?.ns || []).join(', ') || 'None'],
                  ['TXT Records', (domainPayload?.dns?.txt || []).slice(0, 2).join(' | ') || 'None'],
                  ['Sightings', String(domainPayload?.sightings?.total || 0)],
                  ['Confidence', `${Math.round(Number(domainLookup.source_confidence || 0) * 100)}%`],
                ]}
              />
              {(domainLookup.threat_actor_tags || []).length ? (
                <div style={{ marginTop: 18 }}>
                  <div className="intel-meta-label" style={{ marginBottom: 10 }}>Threat actor tags</div>
                  <div className="intel-tag-row">
                    {domainLookup.threat_actor_tags.map((tag) => (
                      <RowTag key={tag.tag} value={`${tag.tag} ${(tag.confidence * 100).toFixed(0)}%`} />
                    ))}
                  </div>
                </div>
              ) : null}
              {domainBrandSignal ? (
                <div
                  style={{
                    marginTop: 18,
                    borderRadius: 18,
                    border: domainBrandSignal.active
                      ? '1px solid rgba(251,191,36,0.3)'
                      : '1px solid rgba(148,163,184,0.2)',
                    background: domainBrandSignal.active
                      ? 'rgba(251,191,36,0.12)'
                      : 'rgba(255,255,255,0.03)',
                    padding: 16,
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <span className="intel-meta-label">Brand Impersonation</span>
                  <strong style={{ color: domainBrandSignal.active ? palette.yellow : palette.muted }}>
                    {domainBrandSignal.active
                      ? `Possible brand impersonation detected${domainBrandSignal.brand ? `: ${domainBrandSignal.brand}` : ''}`
                      : 'No high-risk brand impersonation pattern was detected.'}
                  </strong>
                  {domainBrandSignal.active ? (
                    <>
                      <div style={{ color: palette.muted, lineHeight: 1.6 }}>
                        {(domainBrandSignal.summary || '').trim() || 'This domain matches typo and lure patterns that are common in phishing operations.'}
                      </div>
                      {(domainBrandSignal.reasons || []).length ? (
                        <div style={{ color: palette.subtle, lineHeight: 1.6 }}>
                          {(domainBrandSignal.reasons || []).slice(0, 3).join(' ')}
                        </div>
                      ) : null}
                      <div style={{ color: palette.subtle }}>
                        Score: {domainBrandSignal.score || 0}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </section>

            <DossierSidePanel
              verdict={normalizeThreatLevel(domainLookup.threat_level)}
              recommendation={domainLookup.recommendation || 'allow'}
              copy={domainBrandSignal?.summary || 'Move from the domain into IP enrichment, IOC details, and correlation workflows.'}
              accent={levelColor(domainLookup.threat_level, palette)}
            >
              <div className="signal-strip-label">Infrastructure pivots</div>
              <div className="intel-mini-list">
                {(domainPayload?.related_ips || []).length ? (
                  domainPayload.related_ips.map((item) => (
                    <div key={item.ip} className="intel-mini-item">
                      <strong>{item.ip}</strong>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <Link className="intel-inline-link" to={item.lookup_path}>IP lookup</Link>
                        <Link className="intel-inline-link" to={item.ioc_path}>IOC details</Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="intel-empty-inline">No A record IPs were returned for this domain.</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link className="intel-pill-button" to={domainPayload?.pivots?.ioc_details_path || '#'}>
                  Open IOC Details
                </Link>
                <Link className="intel-pill-button" to={domainPayload?.pivots?.correlation_path || '#'}>
                  Open Correlation Graph
                </Link>
              </div>
            </DossierSidePanel>
          </div>
        </>
      ) : null}

      {!loading && activeMode === 'email-header' && headerAnalysis ? (
        <>
          <div className="dossier-layout fade-in-delay-1">
            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Authentication</div>
                <h2 className="intel-section-title">SPF, DKIM, and DMARC</h2>
                <p className="intel-section-copy intel-reading-block">
                  Header analysis focuses on sender alignment, auth failures, and the earliest observable transport IP.
                </p>
              </div>
              <DossierTable
                rows={[
                  ['SPF', headerPayload?.authentication?.spf || 'unknown'],
                  ['DKIM', headerPayload?.authentication?.dkim || 'unknown'],
                  ['DMARC', headerPayload?.authentication?.dmarc || 'unknown'],
                  ['Origin IP', headerAnalysis.origin_ip || 'Unknown'],
                  ['Reply-To', headerAnalysis.reply_to_domain || 'Unknown'],
                  ['Return-Path', headerAnalysis.return_path_domain || 'Unknown'],
                  ['Message-ID', headerAnalysis.message_id || 'Unknown'],
                  ['From Domain', headerAnalysis.from_domain || 'Unknown'],
                ]}
              />
              <div className="intel-mini-list">
                {(headerPayload?.findings || []).length ? (
                  headerPayload.findings.map((item, index) => (
                    <div key={`${item}-${index}`} className="intel-mini-item">
                      <strong>Finding {index + 1}</strong>
                      <p style={{ color: palette.muted, lineHeight: 1.7 }}>{item}</p>
                    </div>
                  ))
                ) : (
                  <div className="intel-empty-inline">No high-risk mismatches were detected in these headers.</div>
                )}
              </div>
            </section>

            <DossierSidePanel
              verdict={normalizeThreatLevel(headerAnalysis.threat_level)}
              recommendation={headerAnalysis.recommendation || 'review'}
              copy={headerAnalysis.summary || 'Jump directly into domain and IP investigation from the extracted header artifacts.'}
              accent={levelColor(headerAnalysis.threat_level, palette)}
            >
              <div className="signal-strip-label">Continue</div>
              <div className="intel-mini-list">
                <div className="intel-mini-item">
                  <span className="intel-meta-label">Domains</span>
                  <div className="intel-tag-row">
                    {(headerPayload?.pivot_domains || []).length ? (
                      headerPayload.pivot_domains.map((item) => (
                        <Link key={item.domain} className="intel-inline-link" to={item.lookup_path}>
                          {item.domain}
                        </Link>
                      ))
                    ) : (
                      <span style={{ color: palette.muted }}>No domains extracted from these headers.</span>
                    )}
                  </div>
                </div>
                <div className="intel-mini-item">
                  <span className="intel-meta-label">IPs</span>
                  <div className="intel-tag-row">
                    {(headerPayload?.pivot_ips || []).length ? (
                      headerPayload.pivot_ips.map((item) => (
                        <Link key={item.ip} className="intel-inline-link" to={item.lookup_path}>
                          {item.ip}
                        </Link>
                      ))
                    ) : (
                      <span style={{ color: palette.muted }}>No IPs extracted from the Received chain.</span>
                    )}
                  </div>
                </div>
              </div>
            </DossierSidePanel>
          </div>

          {(headerPayload?.related_analyses || []).length ? (
            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Related analyses</div>
                <h2 className="intel-section-title">Recent message analysis matches</h2>
                <p className="intel-section-copy intel-reading-block">
                  Suspicious or threat analyses that already referenced the sender domain from these headers.
                </p>
              </div>
              <div className="intel-row-feed">
                {headerPayload.related_analyses.map((item) => (
                  <div key={item.id} className="intel-row-item">
                    <div>
                      <div className="intel-row-title">{item.subject || item.sender || 'Analysis match'}</div>
                      <div className="intel-row-copy">{item.summary}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="intel-row-badge">{normalizeThreatLevel(item.threat_level)}</div>
                      <div className="intel-row-date">{formatRelativeDate(item.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

export default LookupCenter
