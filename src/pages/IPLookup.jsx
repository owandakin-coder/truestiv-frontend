import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Globe2, MapPinned, Radar, ScanSearch, ShieldAlert, Waypoints } from 'lucide-react'

import { useTheme } from '../components/ThemeProvider'
import { apiRequest } from '../services/api'
import { buildIpLookupPath, formatRelativeDate, normalizeThreatLevel } from '../utils/intelTools'

function paletteFor(theme) {
  const dark = theme !== 'light'
  return {
    dark,
    text: dark ? '#eff6ff' : '#0f172a',
    muted: dark ? 'rgba(191,219,254,0.72)' : '#475569',
    subtle: dark ? 'rgba(191,219,254,0.5)' : '#64748b',
    blue: '#38bdf8',
    cyan: '#22d3ee',
    green: '#22c55e',
    yellow: '#fbbf24',
    red: '#fb7185',
    border: dark ? '1px solid rgba(148,163,184,0.14)' : '1px solid rgba(15,23,42,0.08)',
    card: dark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    cardStrong: dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.95)',
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

export default function IPLookup() {
  const { theme } = useTheme()
  const palette = useMemo(() => paletteFor(theme), [theme])
  const navigate = useNavigate()
  const { ip = '' } = useParams()

  const [query, setQuery] = useState(ip)
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(Boolean(ip))
  const [error, setError] = useState('')

  useEffect(() => {
    setQuery(ip || '')
  }, [ip])

  useEffect(() => {
    if (!ip) {
      setPayload(null)
      setLoading(false)
      setError('')
      return
    }

    let active = true
    setLoading(true)
    setError('')

    apiRequest(`/api/intelligence/ip-lookup/${encodeURIComponent(ip)}`)
      .then((response) => {
        if (active) setPayload(response)
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
  }, [ip])

  const submitLookup = (event) => {
    event.preventDefault()
    const normalized = query.trim()
    if (!normalized) return
    navigate(buildIpLookupPath(normalized))
  }

  const lookup = payload?.lookup || null
  const accent = levelColor(lookup?.threat_level, palette)
  const geo = lookup?.geo || {}
  const providers = payload?.providers || []
  const sightings = payload?.sightings || {}
  const related = payload?.related || {}
  const pivots = payload?.pivots || {}
  const recentEvents = payload?.recent_events || []

  return (
    <section className="intel-shell">
      <div className="intel-hero-card fade-in">
        <div className="intel-hero-content">
          <div className="intel-eyebrow">
            <span className="intel-eyebrow-dot" />
            IP Lookup
          </div>
          <h1 className="intel-title">
            Investigate IP reputation,<br />provider verdicts, and sightings
          </h1>
          <p className="intel-copy">
            Build an IP dossier with infrastructure metadata, source confidence, community context, and direct pivots into correlation and IOC details.
          </p>
        </div>

        <form onSubmit={submitLookup} className="intel-search-row" style={{ maxWidth: 720 }}>
          <input
            className="analysis-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter an IPv4 or IPv6 address"
            style={{ flex: 1, minWidth: 220 }}
          />
          <button
            type="submit"
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '12px 22px',
              fontWeight: 800,
              color: '#fff',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
              boxShadow: '0 16px 40px rgba(14,165,233,0.22)',
            }}
          >
            Run IP Lookup
          </button>
        </form>
      </div>

      {error ? <div className="intel-empty-card">{error}</div> : null}
      {loading ? <div className="intel-empty-card">Building IP dossier...</div> : null}

      {!loading && !payload && !error ? (
        <div className="intel-empty-card">
          Enter an IP address to inspect reputation, location, providers, and related intelligence sightings.
        </div>
      ) : null}

      {!loading && lookup ? (
        <>
          <div className="intel-stat-grid fade-in-delay-1">
            <StatCard
              icon={ShieldAlert}
              label="Threat Level"
              value={normalizeThreatLevel(lookup.threat_level)}
              copy={`Recommended action: ${lookup.recommendation || 'allow'}`}
              accent={accent}
            />
            <StatCard
              icon={Radar}
              label="Risk Score"
              value={`${lookup.risk_score || 0}%`}
              copy={`${lookup.source_count || 0} providers contributed to this dossier.`}
              accent={palette.blue}
            />
            <StatCard
              icon={ScanSearch}
              label="Sightings"
              value={sightings.total || 0}
              copy="Server-side scans, community feed, analyses, media, and telemetry."
              accent={palette.cyan}
            />
            <StatCard
              icon={MapPinned}
              label="Location"
              value={geo.location_name || 'Unknown'}
              copy={geo.organization || geo.isp || 'Infrastructure details resolved from active providers.'}
              accent={palette.green}
            />
          </div>

          <div className="intel-two-column">
            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Infrastructure</div>
                <h2 className="intel-section-title">{lookup.ip}</h2>
                <p className="intel-section-copy">
                  Confidence {lookup.source_confidence_label || 'moderate'} ({lookup.source_confidence || 0}) across aggregated enrichment and internal sightings.
                </p>
              </div>

              <div className="intel-detail-grid">
                <div className="intel-detail-card">
                  <span className="intel-meta-label">Country</span>
                  <strong>{geo.country || 'Unknown'}</strong>
                </div>
                <div className="intel-detail-card">
                  <span className="intel-meta-label">Region</span>
                  <strong>{geo.region || 'Unknown'}</strong>
                </div>
                <div className="intel-detail-card">
                  <span className="intel-meta-label">City</span>
                  <strong>{geo.city || 'Unknown'}</strong>
                </div>
                <div className="intel-detail-card">
                  <span className="intel-meta-label">ASN</span>
                  <strong>{geo.asn || 'Unknown'}</strong>
                </div>
                <div className="intel-detail-card">
                  <span className="intel-meta-label">ISP</span>
                  <strong>{geo.isp || 'Unknown'}</strong>
                </div>
                <div className="intel-detail-card">
                  <span className="intel-meta-label">Organization</span>
                  <strong>{geo.organization || 'Unknown'}</strong>
                </div>
              </div>

              {Array.isArray(lookup.threat_actor_tags) && lookup.threat_actor_tags.length ? (
                <div style={{ marginTop: 18 }}>
                  <div className="intel-meta-label" style={{ marginBottom: 10 }}>Threat actor tags</div>
                  <div className="intel-tag-row">
                    {lookup.threat_actor_tags.map((tag) => (
                      <RowTag key={tag.tag} value={`${tag.tag} ${(tag.confidence * 100).toFixed(0)}%`} />
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>
                <Link className="intel-pill-button" to={pivots.ioc_details_path || '#'}>
                  Open IOC Details
                </Link>
                <Link className="intel-pill-button" to={pivots.correlation_path || '#'}>
                  Open Correlation Graph
                </Link>
                <Link className="intel-pill-button" to={pivots.map_path || '/propagation'}>
                  Open Threat Map
                </Link>
              </div>
            </section>

            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Pivoting</div>
                <h2 className="intel-section-title">Related infrastructure</h2>
                <p className="intel-section-copy">
                  Use these pivots to continue investigation across scanners, map views, and correlation paths.
                </p>
              </div>

              <div className="intel-mini-list">
                <div className="intel-mini-item">
                  <span className="intel-meta-label">Related domains</span>
                  <div className="intel-tag-row">
                    {(related.domains || []).length ? related.domains.map((value) => <RowTag key={value} value={value} />) : <span style={{ color: palette.muted }}>No direct domain pivots were returned.</span>}
                  </div>
                </div>
                <div className="intel-mini-item">
                  <span className="intel-meta-label">Networks</span>
                  <div className="intel-tag-row">
                    {(related.networks || []).length ? related.networks.map((value) => <RowTag key={value} value={value} />) : <span style={{ color: palette.muted }}>No network pivots were returned.</span>}
                  </div>
                </div>
                <div className="intel-mini-item">
                  <span className="intel-meta-label">Organizations</span>
                  <div className="intel-tag-row">
                    {(related.organizations || []).length ? related.organizations.map((value) => <RowTag key={value} value={value} />) : <span style={{ color: palette.muted }}>No organization pivots were returned.</span>}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="intel-section-card">
            <div className="intel-section-head">
              <div className="intel-eyebrow">Providers</div>
              <h2 className="intel-section-title">Source-by-source reputation</h2>
              <p className="intel-section-copy">
                Every provider keeps its own score, confidence weight, and context so you can see why the aggregated verdict landed where it did.
              </p>
            </div>

            <div className="intel-provider-grid">
              {providers.map((provider) => {
                const providerAccent =
                  provider.status === 'error'
                    ? palette.red
                    : Number(provider.score || 0) >= 60
                      ? palette.red
                      : Number(provider.score || 0) >= 25
                        ? palette.yellow
                        : palette.green

                return (
                  <article
                    key={provider.source}
                    className="intel-provider-card"
                    style={{ borderColor: `${providerAccent}22` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <strong style={{ color: palette.text }}>{provider.source}</strong>
                      <span className="intel-provider-badge" style={{ color: providerAccent, borderColor: `${providerAccent}33` }}>
                        {provider.status === 'error' ? 'error' : `${provider.score ?? 0}%`}
                      </span>
                    </div>
                    <p style={{ margin: '10px 0 0', color: palette.muted, lineHeight: 1.7 }}>{provider.summary}</p>
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <span className="intel-meta-label">Confidence {provider.confidence_label}</span>
                      <span style={{ color: palette.subtle }}>{provider.confidence_score}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <div className="intel-two-column">
            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Sightings</div>
                <h2 className="intel-section-title">Recent intelligence activity</h2>
                <p className="intel-section-copy">
                  The latest actionable events tied to this IP across scans, community publications, analyses, media, and infrastructure telemetry.
                </p>
              </div>

              <div className="intel-row-feed">
                {recentEvents.length ? (
                  recentEvents.map((event, index) => (
                    <Link key={`${event.event_type}-${index}`} to={event.path || '#'} className="intel-row-item">
                      <div>
                        <div className="intel-row-title">{event.title}</div>
                        <div className="intel-row-copy">{event.summary}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="intel-row-badge">{normalizeThreatLevel(event.threat_level)}</div>
                        <div className="intel-row-date">{formatRelativeDate(event.created_at)}</div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="intel-empty-inline">No recent actionable events were linked to this IP yet.</div>
                )}
              </div>
            </section>

            <section className="intel-section-card">
              <div className="intel-section-head">
                <div className="intel-eyebrow">Counts</div>
                <h2 className="intel-section-title">Internal sightings breakdown</h2>
                <p className="intel-section-copy">
                  A quick read on how often this IP surfaced across the Trustive workspace.
                </p>
              </div>

              <div className="intel-bars">
                {[
                  ['Scanner history', sightings.scan_history || 0],
                  ['Community', sightings.community || 0],
                  ['Analyses', sightings.analyses || 0],
                  ['Media', sightings.media || 0],
                  ['Observations', sightings.observations || 0],
                ].map(([label, value]) => (
                  <div key={label} className="intel-bar-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ color: palette.text }}>{label}</span>
                      <span style={{ color: palette.muted }}>{value}</span>
                    </div>
                    <div className="intel-bar-track">
                      <div
                        className="intel-bar-fill"
                        style={{ width: `${Math.min(100, (Number(value) / Math.max(1, sightings.total || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="intel-section-card">
            <div className="intel-section-head">
              <div className="intel-eyebrow">Next steps</div>
              <h2 className="intel-section-title">Continue the investigation</h2>
              <p className="intel-section-copy">
                Move directly into the map, graph, or scanner to expand on the same indicator without copying values between screens.
              </p>
            </div>

            <div className="intel-action-grid">
              <Link to={`/scanner`} className="intel-action-card">
                <ScanSearch size={18} color={palette.blue} />
                <div>
                  <strong>Open Scanner</strong>
                  <p>Run a fresh enriched IP scan and compare the result with this dossier.</p>
                </div>
              </Link>
              <Link to={pivots.correlation_path || '#'} className="intel-action-card">
                <Waypoints size={18} color={palette.cyan} />
                <div>
                  <strong>Open Correlation Graph</strong>
                  <p>See how this IP connects to scans, publications, analyses, media, and actor tags.</p>
                </div>
              </Link>
              <Link to="/propagation" className="intel-action-card">
                <Globe2 size={18} color={palette.green} />
                <div>
                  <strong>Open Threat Map</strong>
                  <p>Pivot into the geographic layer to compare this IP with other active infrastructure markers.</p>
                </div>
              </Link>
            </div>
          </section>
        </>
      ) : null}
    </section>
  )
}
