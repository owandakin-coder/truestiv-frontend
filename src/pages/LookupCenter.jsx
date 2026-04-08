import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Building2, Globe2, Mail, MapPinned, Radar, ScanSearch, ShieldAlert, Waypoints } from 'lucide-react'

import { useTheme } from '../components/ThemeProvider'
import { apiRequest } from '../services/api'
import {
  buildDomainLookupPath,
  buildHeaderAnalyzerPath,
  buildIpLookupPath,
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

function StatCard({ icon: Icon, label, value, copy, accent }) {
  return (
    <article className="intel-stat-card">
      <Icon size={20} color={accent} />
      <div className="intel-stat-value">{value}</div>
      <div className="intel-stat-label">{label}</div>
      <p className="intel-stat-copy">{copy}</p>
    </article>
  )
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
    <div className="channel-grid" style={{ marginBottom: 24 }}>
      {tabs.map((tab) => {
        const active = activeMode === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '14px 18px',
              borderRadius: 18,
              fontWeight: 800,
              cursor: 'pointer',
              border: active ? '1px solid rgba(56,189,248,0.24)' : '1px solid rgba(148,163,184,0.14)',
              background: active ? 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(14,165,233,0.12))' : 'rgba(255,255,255,0.03)',
              color: active ? '#eff6ff' : 'rgba(191,219,254,0.82)',
              boxShadow: active ? '0 16px 40px rgba(14,165,233,0.18)' : 'none',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
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
  const headerAnalysis = headerPayload?.analysis

  return (
    <section className="intel-shell">
      <div className="intel-hero-card fade-in">
        <div className="intel-hero-content">
          <div className="intel-eyebrow">
            <span className="intel-eyebrow-dot" />
            Lookup Center
          </div>
          <h1 className="intel-title">
            One workspace for IP, domain,<br />and email header investigation
          </h1>
          <p className="intel-copy">
            Move between infrastructure enrichment and email-auth analysis without crowding the main navigation. Every tab keeps pivots into IOC details, threat map, and correlation workflows.
          </p>
        </div>
      </div>

      <section className="intel-section-card fade-in-delay-1">
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

      {!loading && activeMode === 'ip' && ipLookup ? (
        <>
          <div className="intel-stat-grid ip-lookup-stat-grid fade-in-delay-1">
            <StatCard icon={ShieldAlert} label="Threat Level" value={normalizeThreatLevel(ipLookup.threat_level)} copy={`Recommended action: ${ipLookup.recommendation || 'allow'}`} accent={levelColor(ipLookup.threat_level, palette)} />
            <StatCard icon={Radar} label="Risk Score" value={`${ipLookup.risk_score || 0}%`} copy={`${ipLookup.source_count || 0} providers contributed to this dossier.`} accent={palette.blue} />
            <StatCard icon={ScanSearch} label="Sightings" value={ipPayload?.sightings?.total || 0} copy="Scans, community, analyses, media, and telemetry." accent={palette.cyan} />
            <StatCard icon={MapPinned} label="Location" value={ipLookup.geo?.location_name || 'Unknown'} copy={ipLookup.geo?.organization || ipLookup.geo?.isp || 'Infrastructure details resolved from active providers.'} accent={palette.green} />
          </div>

          <div className="intel-two-column">
            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Infrastructure</div>
                <h2 className="intel-section-title">{ipLookup.ip}</h2>
                <p className="intel-section-copy">
                  Confidence {ipLookup.source_confidence_label || 'moderate'} ({ipLookup.source_confidence || 0}) across aggregated enrichment and internal sightings.
                </p>
              </div>
              <div className="intel-detail-grid">
                {[
                  ['Country', ipLookup.geo?.country || 'Unknown'],
                  ['Region', ipLookup.geo?.region || 'Unknown'],
                  ['City', ipLookup.geo?.city || 'Unknown'],
                  ['ASN', ipLookup.geo?.asn || 'Unknown'],
                  ['ISP', ipLookup.geo?.isp || 'Unknown'],
                  ['Organization', ipLookup.geo?.organization || 'Unknown'],
                ].map(([label, value]) => (
                  <div key={label} className="intel-detail-card">
                    <span className="intel-meta-label">{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
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

            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Continue</div>
                <h2 className="intel-section-title">Continue the investigation</h2>
                <p className="intel-section-copy">
                  Move directly into scanner, graph, and map views without copying the indicator between screens.
                </p>
              </div>
              <div className="intel-action-grid ip-lookup-action-grid">
                <Link to="/scanner" className="intel-action-card ip-lookup-action-card">
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
            </section>
          </div>
        </>
      ) : null}

      {!loading && activeMode === 'domain' && domainLookup ? (
        <>
          <div className="intel-stat-grid ip-lookup-stat-grid fade-in-delay-1">
            <StatCard icon={Building2} label="Registrar" value={domainLookup.registrar || 'Unknown'} copy="Registration metadata from RDAP." accent={palette.blue} />
            <StatCard icon={ShieldAlert} label="Threat Level" value={normalizeThreatLevel(domainLookup.threat_level)} copy={`Recommended action: ${domainLookup.recommendation || 'allow'}`} accent={levelColor(domainLookup.threat_level, palette)} />
            <StatCard icon={Radar} label="Risk Score" value={`${domainLookup.risk_score || 0}%`} copy={`${domainLookup.source_count || 0} providers contributed to this lookup.`} accent={palette.cyan} />
            <StatCard icon={MapPinned} label="Age" value={domainLookup.age_days != null ? `${domainLookup.age_days} days` : 'Unknown'} copy="Newly created domains often deserve closer review." accent={palette.green} />
          </div>

          <div className="intel-two-column">
            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Domain dossier</div>
                <h2 className="intel-section-title">{domainLookup.domain}</h2>
                <p className="intel-section-copy">
                  DNS, registration age, reputation, and related infrastructure from public intelligence providers.
                </p>
              </div>
              <div className="intel-detail-grid">
                {[
                  ['A Records', (domainPayload?.dns?.a || []).join(', ') || 'None'],
                  ['MX Records', (domainPayload?.dns?.mx || []).join(', ') || 'None'],
                  ['NS Records', (domainPayload?.dns?.ns || []).join(', ') || 'None'],
                  ['TXT Records', (domainPayload?.dns?.txt || []).slice(0, 2).join(' | ') || 'None'],
                  ['Sightings', String(domainPayload?.sightings?.total || 0)],
                  ['Confidence', `${Math.round(Number(domainLookup.source_confidence || 0) * 100)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="intel-detail-card">
                    <span className="intel-meta-label">{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
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
            </section>

            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Related IPs</div>
                <h2 className="intel-section-title">Infrastructure pivots</h2>
                <p className="intel-section-copy">
                  Move from the domain into IP enrichment, IOC details, and correlation workflows.
                </p>
              </div>
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
            </section>
          </div>
        </>
      ) : null}

      {!loading && activeMode === 'email-header' && headerAnalysis ? (
        <>
          <div className="intel-stat-grid ip-lookup-stat-grid fade-in-delay-1">
            <StatCard icon={Mail} label="Threat Level" value={normalizeThreatLevel(headerAnalysis.threat_level)} copy={`Recommended action: ${headerAnalysis.recommendation || 'review'}`} accent={levelColor(headerAnalysis.threat_level, palette)} />
            <StatCard icon={ShieldAlert} label="Risk Score" value={`${headerAnalysis.risk_score || 0}%`} copy="Header anomalies, auth failures, and sender alignment signals." accent={palette.blue} />
            <StatCard icon={Radar} label="Origin IP" value={headerAnalysis.origin_ip || 'Unknown'} copy="Extracted from the Received chain." accent={palette.cyan} />
            <StatCard icon={Building2} label="From Domain" value={headerAnalysis.from_domain || 'Unknown'} copy="Primary visible sender domain." accent={palette.green} />
          </div>

          <div className="intel-two-column">
            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Authentication</div>
                <h2 className="intel-section-title">SPF, DKIM, and DMARC</h2>
                <p className="intel-section-copy">
                  Header analysis focuses on sender alignment, auth failures, and the earliest observable transport IP.
                </p>
              </div>
              <div className="intel-detail-grid">
                {[
                  ['SPF', headerPayload?.authentication?.spf || 'unknown'],
                  ['DKIM', headerPayload?.authentication?.dkim || 'unknown'],
                  ['DMARC', headerPayload?.authentication?.dmarc || 'unknown'],
                  ['Reply-To', headerAnalysis.reply_to_domain || 'Unknown'],
                  ['Return-Path', headerAnalysis.return_path_domain || 'Unknown'],
                  ['Message-ID', headerAnalysis.message_id || 'Unknown'],
                ].map(([label, value]) => (
                  <div key={label} className="intel-detail-card">
                    <span className="intel-meta-label">{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
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

            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Pivots</div>
                <h2 className="intel-section-title">Continue the investigation</h2>
                <p className="intel-section-copy">
                  Jump directly into domain and IP investigation from the extracted header artifacts.
                </p>
              </div>
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
            </section>
          </div>

          {(headerPayload?.related_analyses || []).length ? (
            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Related analyses</div>
                <h2 className="intel-section-title">Recent message analysis matches</h2>
                <p className="intel-section-copy">
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
