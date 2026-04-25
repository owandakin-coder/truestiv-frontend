import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Globe2, Radar, ScanSearch, ShieldAlert, Waves } from 'lucide-react'

import { useTheme } from '../components/ThemeProvider'
import { apiRequest } from '../services/api'
import { buildIpLookupPath, formatRelativeDate } from '../utils/intelTools'

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

export default function IOCDetails() {
  const { theme } = useTheme()
  const palette = useMemo(() => paletteFor(theme), [theme])
  const { iocType = '', indicator = '' } = useParams()

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
            Full context for this {iocType?.toUpperCase()} across server-side scan history, community publications, analysis matches, media extraction, and infrastructure observations.
          </p>
        </div>
      </div>

      {error ? <div className="intel-empty-card">{error}</div> : null}
      {loading ? <div className="intel-empty-card">Loading indicator context...</div> : null}

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
              <div className="intel-feed-list">
                {payload.scan_history.map((item) => (
                  <article key={item.id} className="intel-feed-row intel-feed-row-wide">
                    <div className="intel-feed-row-main">
                      <div className="intel-indicator">{item.indicator}</div>
                      <div className="intel-feed-row-meta">
                        {formatRelativeDate(item.created_at)} | source {String(item.source || 'scanner').toUpperCase()}
                      </div>
                      <p style={{ marginTop: 10, color: palette.muted, lineHeight: 1.7 }}>{item.summary}</p>
                    </div>
                    <div className="intel-meta">{item.scan_type}</div>
                    <div className="intel-feed-row-risk">Risk {item.risk_score || 0}</div>
                    <div>
                      <span className="platform-badge" style={{ color: levelColor(item.threat_level, palette), borderColor: `${levelColor(item.threat_level, palette)}33`, background: `${levelColor(item.threat_level, palette)}12` }}>
                        {item.threat_level}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
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
              <div className="intel-feed-list">
                {payload.community.map((item) => (
                  <article key={item.id} className="intel-feed-row intel-feed-row-wide">
                    <div className="intel-feed-row-main">
                      <div className="intel-indicator">{item.indicator}</div>
                      <div className="intel-feed-row-meta">{formatRelativeDate(item.published_at)}</div>
                      <p style={{ marginTop: 10, color: palette.muted, lineHeight: 1.7 }}>{item.summary}</p>
                    </div>
                    <div className="intel-meta">{item.threat_type}</div>
                    <div className="intel-feed-row-risk">Risk {item.risk_score || 0}</div>
                    <div>
                      <span className="platform-badge" style={{ color: levelColor(item.threat_level, palette), borderColor: `${levelColor(item.threat_level, palette)}33`, background: `${levelColor(item.threat_level, palette)}12` }}>
                        {item.threat_level}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
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
              <div className="intel-feed-list">
                {payload.analyses.map((item) => (
                  <article key={item.id} className="intel-feed-row intel-feed-row-wide">
                    <div className="intel-feed-row-main">
                      <div className="intel-indicator">{item.subject || item.sender || 'Analysis match'}</div>
                      <div className="intel-feed-row-meta">
                        {String(item.channel || 'analysis').toUpperCase()} | {formatRelativeDate(item.created_at)}
                      </div>
                      <p style={{ marginTop: 10, color: palette.muted, lineHeight: 1.7 }}>{item.summary}</p>
                    </div>
                    <div className="intel-meta">{item.channel}</div>
                    <div />
                    <div>
                      <span className="platform-badge" style={{ color: levelColor(item.threat_level, palette), borderColor: `${levelColor(item.threat_level, palette)}33`, background: `${levelColor(item.threat_level, palette)}12` }}>
                        {item.threat_level}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Section>

          {payload.observations?.length ? (
            <Section
              title="Infrastructure observations"
              eyebrow={<><Globe2 size={14} /> Threat map</>}
              copy="Recent IP observations that can feed the geographic threat map."
            >
              <div className="intel-feed-list">
                {payload.observations.map((item) => (
                  <article key={item.id} className="intel-feed-row intel-feed-row-wide">
                    <div className="intel-feed-row-main">
                      <div className="intel-indicator">{item.ip}</div>
                      <div className="intel-feed-row-meta">
                        {formatRelativeDate(item.created_at)} | {item.city || 'Unknown city'} {item.country ? `, ${item.country}` : ''}
                      </div>
                    </div>
                    <div className="intel-meta">{item.source}</div>
                    <div className="intel-feed-row-risk">Risk {item.risk_score || 0}</div>
                    <div>
                      <span className="platform-badge" style={{ color: levelColor(item.threat_level, palette), borderColor: `${levelColor(item.threat_level, palette)}33`, background: `${levelColor(item.threat_level, palette)}12` }}>
                        {item.threat_level}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
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
