import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DatabaseZap, Globe2, Radar, ScanSearch, ShieldAlert, Waves } from 'lucide-react'

import { useTheme } from '../components/ThemeProvider'
import { apiRequest } from '../services/api'
import { buildIpLookupPath, buildIocPath, formatRelativeDate } from '../utils/intelTools'

function paletteFor(theme) {
  const dark = theme !== 'light'
  return {
    dark,
    text: dark ? '#eff6ff' : '#0f172a',
    muted: dark ? 'rgba(191,219,254,0.72)' : '#475569',
    subtle: dark ? 'rgba(191,219,254,0.5)' : '#64748b',
    blue: '#38bdf8',
    green: '#22c55e',
    yellow: '#fbbf24',
    red: '#fb7185',
    border: dark ? '1px solid rgba(148,163,184,0.14)' : '1px solid rgba(15,23,42,0.08)',
  }
}

function levelColor(level, palette) {
  const value = String(level || '').toLowerCase()
  if (value === 'threat') return palette.red
  if (value === 'suspicious') return palette.yellow
  if (value === 'safe') return palette.green
  return palette.blue
}

function Section({ title, eyebrow, copy, children }) {
  return (
    <section className="intel-section-card">
      <div className="intel-section-head">
        <div className="intel-eyebrow">{eyebrow}</div>
        <h2 className="intel-section-title">{title}</h2>
        {copy ? <p className="intel-section-copy">{copy}</p> : null}
      </div>
      {children}
    </section>
  )
}

function truncateIndicator(value = '') {
  const normalized = String(value || '')
  if (normalized.length <= 48) return normalized
  return `${normalized.slice(0, 24)}...${normalized.slice(-12)}`
}

function inferIndicatorType(item, fallbackType) {
  const candidate = item?.indicator_type || item?.threat_type || item?.scan_type || item?.channel || fallbackType || 'indicator'
  return ['ip', 'url', 'hash', 'file', 'domain', 'email', 'phone', 'cve'].includes(String(candidate).toLowerCase())
    ? String(candidate).toLowerCase()
    : fallbackType || 'indicator'
}

function inferSource(item, fallback) {
  if (Array.isArray(item?.sources) && item.sources.length) return item.sources.join(', ')
  return item?.source || fallback || 'Trustive AI'
}

function riskPercent(value) {
  return Math.max(0, Math.min(100, Number(value || 0)))
}

function SignalTable({ title, rows, fallbackType, palette, onCopy }) {
  const navigate = useNavigate()

  const openCheck = (row) => {
    const rowType = inferIndicatorType(row, fallbackType)
    const indicator = row?.indicator || row?.ip || ''
    if (!indicator) return
    if (rowType === 'ip') {
      navigate(buildIpLookupPath(indicator))
      return
    }
    navigate(buildIocPath(rowType, indicator))
  }

  const openEnrichment = (row) => {
    if (row?.lookup_path) {
      navigate(row.lookup_path)
      return
    }
    const rowType = inferIndicatorType(row, fallbackType)
    const indicator = row?.indicator || row?.ip || ''
    if (rowType === 'ip' && indicator) {
      navigate(buildIpLookupPath(indicator))
      return
    }
    if (indicator) {
      navigate(buildIocPath(rowType, indicator))
    }
  }

  return (
    <div className="soc-table-surface">
      <div className="soc-table-title-row">
        <strong className="soc-table-title">{title}</strong>
      </div>
      <div className="soc-table-scroll">
        <div className="soc-table soc-table-five">
          <div className="soc-table-head">
            <span>Indicator</span>
            <span>Risk</span>
            <span>Sector &amp; Category</span>
            <span>Source &amp; Date</span>
            <span>Actions</span>
          </div>
          {rows.map((row) => {
            const indicator = row.indicator || row.ip || ''
            const rowType = inferIndicatorType(row, fallbackType)
            const source = inferSource(row, 'Trustive AI')
            const freshness = formatRelativeDate(
              row.last_seen_at || row.published_at || row.created_at || row.first_seen_at
            )
            const risk = riskPercent(row.risk_score)
            const level = String(row.threat_level || 'unknown').toLowerCase()
            const accent = levelColor(level, palette)
            const locationHint = [row.country, row.city, row.region].filter(Boolean).join(' / ')
            const categoryHint = row.summary || row.subject || row.sender || row.source || 'Recorded indicator context.'

            return (
              <div key={row.id || `${rowType}-${indicator}-${freshness}`} className="soc-table-row">
                <div className="soc-table-cell">
                  <div className="soc-indicator-stack">
                    <strong className="soc-indicator-value" title={indicator}>{truncateIndicator(indicator)}</strong>
                    <button type="button" className="soc-copy-button" onClick={() => onCopy(indicator)}>
                      Copy
                    </button>
                  </div>
                  {locationHint ? <div className="soc-indicator-meta">{locationHint}</div> : null}
                </div>
                <div className="soc-table-cell">
                  <div className="soc-risk-stack">
                    <div className="soc-risk-topline">
                      <strong>{risk}%</strong>
                      <span style={{ color: accent }}>{level}</span>
                    </div>
                    <div className="soc-risk-bar">
                      <div className="soc-risk-bar-fill" style={{ width: `${risk}%`, background: accent }} />
                    </div>
                  </div>
                </div>
                <div className="soc-table-cell">
                  <div className="soc-table-primary">{String(rowType || 'indicator').toUpperCase()}</div>
                  <div className="soc-table-secondary">{categoryHint}</div>
                </div>
                <div className="soc-table-cell">
                  <div className="soc-table-primary">{source}</div>
                  <div className="soc-table-secondary">{freshness}</div>
                </div>
                <div className="soc-table-cell">
                  <div className="soc-action-row">
                    <button type="button" className="soc-action-button soc-action-button-primary" onClick={() => openCheck(row)}>Check</button>
                    <button type="button" className="soc-action-button" onClick={() => onCopy(indicator)}>Block</button>
                    <button type="button" className="soc-action-button" onClick={() => openEnrichment(row)}>Enrich</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function IOCDetails() {
  const { theme } = useTheme()
  const palette = useMemo(() => paletteFor(theme), [theme])
  const { iocType = '', indicator = '' } = useParams()
  const [copiedIndicator, setCopiedIndicator] = useState('')

  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    apiRequest(`/api/intelligence/ioc/${encodeURIComponent(iocType)}/${encodeURIComponent(indicator)}`)
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
  }, [iocType, indicator])

  const ioc = payload?.ioc || null
  const accent = levelColor(ioc?.latest_threat_level, palette)

  const copyIndicator = async (value) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(String(value))
      setCopiedIndicator(String(value))
      window.setTimeout(() => {
        setCopiedIndicator((current) => (current === String(value) ? '' : current))
      }, 1800)
    } catch {
      setCopiedIndicator('')
    }
  }

  return (
    <section className="intel-shell">
      <div className="intel-hero-card fade-in">
        <div className="intel-hero-content">
          <div className="intel-eyebrow">
            <span className="intel-eyebrow-dot" />
            IOC Details
          </div>
          <h1 className="intel-title">{indicator}</h1>
          <p className="intel-copy">
            Full context for this {iocType?.toUpperCase()} across scan history, collected intelligence, community sightings, analysis matches, and infrastructure observations.
          </p>
        </div>
      </div>

      {error ? <div className="intel-empty-card">{error}</div> : null}
      {loading ? <div className="intel-empty-card">Loading indicator context...</div> : null}
      {copiedIndicator ? <div className="console-status" style={{ color: palette.green }}>Copied {truncateIndicator(copiedIndicator)} to clipboard.</div> : null}

      {!loading && ioc ? (
        <>
          <div className="intel-stat-grid fade-in-delay-1">
            <article className="intel-stat-card">
              <ShieldAlert size={20} color={accent} />
              <div className="intel-stat-value">{ioc.latest_threat_level || 'unknown'}</div>
              <div className="intel-stat-label">Latest Level</div>
              <p className="intel-stat-copy">Most recent verdict visible for this indicator.</p>
            </article>
            <article className="intel-stat-card">
              <Radar size={20} color={palette.blue} />
              <div className="intel-stat-value">{ioc.average_risk_score || 0}</div>
              <div className="intel-stat-label">Average Risk</div>
              <p className="intel-stat-copy">Average risk score across the collected contexts.</p>
            </article>
            <article className="intel-stat-card">
              <ScanSearch size={20} color={palette.green} />
              <div className="intel-stat-value">
                {Object.values(ioc.source_breakdown || {}).reduce((total, count) => total + Number(count || 0), 0)}
              </div>
              <div className="intel-stat-label">Matched Contexts</div>
              <p className="intel-stat-copy">Total findings tied to this indicator across Trustive AI.</p>
            </article>
            <article className="intel-stat-card">
              <Globe2 size={20} color={palette.blue} />
              <div className="intel-stat-value">{Math.round(Number(ioc.source_confidence || 0) * 100)}%</div>
              <div className="intel-stat-label">Source Confidence</div>
              <p className="intel-stat-copy">Weighted reliability score derived from the contributing intelligence sources.</p>
            </article>
          </div>

          <Section
            title="Confidence and tagging"
            eyebrow={<><ShieldAlert size={14} /> Source confidence</>}
            copy="Trustive AI weights different sources differently so risk is not treated as equally reliable in every context."
          >
            <div className="intel-grid-two">
              <article className="intel-detail-card">
                <div className="intel-detail-label">Confidence Model</div>
                <div className="intel-detail-value">{ioc.source_confidence_label || 'moderate'}</div>
                <p className="intel-detail-copy">
                  Composite source confidence: {Math.round(Number(ioc.source_confidence || 0) * 100)}%
                </p>
              </article>
              <article className="intel-detail-card">
                <div className="intel-detail-label">Threat Actor Tags</div>
                <div className="intel-tag-wrap">
                  {(ioc.threat_actor_tags || []).map((item) => (
                    <span key={item.tag} className="intel-tag-chip">
                      {item.tag} {Math.round(Number(item.confidence || 0) * 100)}%
                    </span>
                  ))}
                  {!ioc.threat_actor_tags?.length ? <span className="intel-detail-copy">No actor tags inferred yet.</span> : null}
                </div>
              </article>
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link className="intel-inline-link" to={`/correlation/${encodeURIComponent(iocType)}/${encodeURIComponent(indicator)}`}>
                  Open correlation graph
                </Link>
                {iocType === 'ip' ? (
                  <Link className="intel-inline-link" to={buildIpLookupPath(indicator)}>
                    Open IP lookup
                  </Link>
                ) : null}
              </div>
            </div>
          </Section>

          {ioc.geo ? (
            <Section
              title="Geographic context"
              eyebrow={<><Globe2 size={14} /> Geo intelligence</>}
              copy="Latest known location and network details for this IP indicator."
            >
              <div className="intel-grid-two">
                <article className="intel-detail-card">
                  <div className="intel-detail-label">Location</div>
                  <div className="intel-detail-value">{ioc.geo.location_name || 'Unknown location'}</div>
                  <p className="intel-detail-copy">
                    {ioc.geo.region || 'Region unavailable'} | {ioc.geo.country || 'Unknown country'}
                  </p>
                </article>
                <article className="intel-detail-card">
                  <div className="intel-detail-label">Network</div>
                  <div className="intel-detail-value">{ioc.geo.organization || ioc.geo.isp || 'Unknown network'}</div>
                  <p className="intel-detail-copy">
                    Latitude {ioc.geo.latitude}, Longitude {ioc.geo.longitude}
                  </p>
                </article>
              </div>
            </Section>
          ) : null}

          <Section
            title="Server-side scan history"
            eyebrow={<><Waves size={14} /> Scan history</>}
            copy="Every matching scanner execution recorded by the backend for this indicator."
          >
            {!payload.scan_history?.length ? (
              <div className="intel-empty-card">No server-side scan history is available for this indicator yet.</div>
            ) : (
              <SignalTable title="Server-side scan history" rows={payload.scan_history} fallbackType={iocType} palette={palette} onCopy={copyIndicator} />
            )}
          </Section>

          <Section
            title="Collected intelligence"
            eyebrow={<><DatabaseZap size={14} /> Collection pipeline</>}
            copy="Signals gathered by the Trustive collection engine before or beyond direct community publication."
          >
            {!payload.collected_signals?.length ? (
              <div className="intel-empty-card">No collected pipeline signals are attached to this indicator yet.</div>
            ) : (
              <SignalTable title="Collection pipeline" rows={payload.collected_signals} fallbackType={iocType} palette={palette} onCopy={copyIndicator} />
            )}
          </Section>

          <Section
            title="Community visibility"
            eyebrow={<><Radar size={14} /> Community</>}
            copy="Where this indicator has already been surfaced to the community feed."
          >
            {!payload.community?.length ? (
              <div className="intel-empty-card">This indicator has not been published to the community feed yet.</div>
            ) : (
              <SignalTable title="Community" rows={payload.community} fallbackType={iocType} palette={palette} onCopy={copyIndicator} />
            )}
          </Section>

          <Section
            title="Analysis matches"
            eyebrow={<><ShieldAlert size={14} /> Message analysis</>}
            copy="Message analyses where the indicator appeared in the analyzed content."
          >
            {!payload.analyses?.length ? (
              <div className="intel-empty-card">No analysis matches were found for this indicator.</div>
            ) : (
              <SignalTable title="Message analysis" rows={payload.analyses} fallbackType={iocType} palette={palette} onCopy={copyIndicator} />
            )}
          </Section>

          {payload.observations?.length ? (
            <Section
              title="Infrastructure observations"
              eyebrow={<><Globe2 size={14} /> Threat map</>}
              copy="Recent IP observations that can feed the geographic threat map."
            >
              <SignalTable title="Threat map" rows={payload.observations.map((item) => ({ ...item, indicator: item.ip, indicator_type: 'ip' }))} fallbackType="ip" palette={palette} onCopy={copyIndicator} />
            </Section>
          ) : null}

          {iocType === 'url' || iocType === 'domain' ? (
            <div className="intel-empty-card">
              Need another pivot? Open the scanner with this value prefilled in spirit: this IOC is now preserved in server-side history and will keep reappearing in the timeline when scanned again.
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
