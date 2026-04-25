import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Database, GitBranch, Radar } from 'lucide-react'

import ExpandableFeed from '../components/ExpandableFeed'
import IntelEmptyState from '../components/IntelEmptyState'
import PortalHero from '../components/PortalHero'
import Seo from '../components/Seo'
import { apiRequest } from '../services/api'
import { buildIocPath } from '../utils/intelTools'

function threatLabel(level) {
  const value = String(level || '').toLowerCase()
  return value || 'unknown'
}

function firstLabel(values, fallback = 'Waiting') {
  return values?.[0] || fallback
}

export default function ThreatIntelHub() {
  const [feed, setFeed] = useState([])
  const [trending, setTrending] = useState([])
  const [briefs, setBriefs] = useState([])
  const [collectionOverview, setCollectionOverview] = useState(null)
  const [collectionIndicators, setCollectionIndicators] = useState([])
  const [error, setError] = useState('')
  const [live, setLive] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')

  useEffect(() => {
    let active = true
    const loadIntel = () => {
      Promise.all([
        apiRequest('/api/community/threats'),
        apiRequest('/api/intelligence/trending-indicators?time_range=30d&limit=10'),
        apiRequest('/api/intelligence/public-incident-briefs?limit=6'),
        apiRequest('/api/intelligence/collection/overview'),
        apiRequest('/api/intelligence/collection/indicators?limit=8&threat_level=threat'),
      ])
        .then(([feedPayload, trendingPayload, briefsPayload, collectionPayload, indicatorsPayload]) => {
          if (!active) return
          setError('')
          setFeed(feedPayload || [])
          setTrending(trendingPayload.items || [])
          setBriefs(briefsPayload.items || [])
          setCollectionOverview(collectionPayload || null)
          setCollectionIndicators(indicatorsPayload.items || [])
        })
        .catch((err) => {
          if (active) setError(err.message)
        })
    }

    loadIntel()
    if (!live) return () => { active = false }
    const interval = setInterval(loadIntel, 30000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [live])

  const featuredBrief = briefs[0] || null
  const summary = collectionOverview?.summary || null
  const sourceBreakdown = collectionOverview?.source_breakdown || []
  const overviewCards = [
    {
      label: 'What matters now',
      value: featuredBrief?.title || 'Waiting for cluster activity',
      copy: featuredBrief?.summary || 'The strongest recurring brief will appear here first.',
    },
    {
      label: 'Fastest recurring signal',
      value: trending[0]?.indicator || 'No recurring indicator yet',
      copy: trending[0] ? `${trending[0].sightings} sightings across ${trending[0].sources?.length || 0} sources.` : 'Recurring indicators will surface here once the feed warms up.',
    },
    {
      label: 'Top country',
      value: firstLabel(featuredBrief?.countries, firstLabel(trending[0]?.countries, 'Global')),
      copy: 'Country emphasis is derived from clustered signals and recurring activity.',
    },
    {
      label: 'Collector health',
      value: summary?.latest_collection_at ? 'Collecting' : 'Waiting',
      copy: summary?.latest_collection_at ? `Latest run ${new Date(summary.latest_collection_at).toLocaleString()}.` : 'The collection pipeline has not produced a visible run yet.',
    },
  ]
  const sections = [
    { id: 'overview', label: 'Overview', count: featuredBrief ? 1 : 0 },
    { id: 'trending', label: 'Trending', count: trending.length },
    { id: 'briefs', label: 'Briefs', count: briefs.length },
    { id: 'latest', label: 'Latest', count: feed.length },
  ]
  return (
    <section className="intel-shell zone-threat-intel">
      <Seo
        title="Trustive AI | Threat Intelligence"
        description="Monitor recurring indicators, incident briefs, collected signals, and the latest intelligence published by Trustive AI."
        path="/threat-intel"
      />

      <PortalHero
        kicker="Threat Intelligence"
        title="Threat Intelligence"
        copy="Recurring indicators and incident briefs in one place."
        className="threat-intel-hero portal-hero-left fade-in"
        actions={
          <>
            <button className={`intel-button ${live ? 'primary' : 'ghost'}`} type="button" onClick={() => setLive((current) => !current)}>
              {live ? 'Live refresh on' : 'Live refresh off'}
            </button>
            <Link className="intel-button ghost" to="/campaign-clusters">Open campaign view</Link>
          </>
        }
      />

      {error ? <div className="intel-empty-card">{error}</div> : null}

      <div className="threat-intel-category-nav fade-in-delay-1">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`threat-intel-category-button ${activeSection === section.id ? 'is-active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span>{section.label}</span>
            {section.count ? <span className="threat-intel-category-count">{section.count}</span> : null}
          </button>
        ))}
      </div>

      {activeSection === 'overview' ? (
        <section className="threat-intel-editorial-row fade-in-delay-1">
          {overviewCards.map((card) => (
            <article key={card.label} className="threat-intel-editorial-card">
              <div className="signal-strip-label">{card.label}</div>
              <strong>{card.value}</strong>
              <p>{card.copy}</p>
            </article>
          ))}
        </section>
      ) : null}

      {activeSection === 'overview' && featuredBrief ? (
        <section className="featured-brief featured-brief-large fade-in-delay-1">
          <div className="featured-brief-summary">
            <div className="intel-eyebrow">Featured Incident Brief</div>
            <h2 className="intel-section-title" style={{ marginTop: 8 }}>{featuredBrief.title}</h2>
            <p className="intel-reading-block" style={{ marginTop: 4 }}>{featuredBrief.summary}</p>
            <div className="intel-tag-wrap" style={{ marginTop: 10 }}>
              {(featuredBrief.actor_tags || []).map((tag) => <span key={tag} className="intel-tag-chip">{tag}</span>)}
              {(featuredBrief.countries || []).map((country) => <span key={country} className="intel-tag-chip">{country}</span>)}
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
              <Link className="intel-inline-link" to={featuredBrief.details_path || '/campaign-clusters'}>Open full brief</Link>
              <Link className="intel-inline-link" to="/timeline">Open timeline context</Link>
            </div>
          </div>
          <div className="featured-brief-side">
            <div className="featured-brief-signal-grid">
              <article className="editorial-card compact">
                <div className="signal-strip-label">Signals</div>
                <strong>{featuredBrief.signal_count}</strong>
              </article>
              <article className="editorial-card compact">
                <div className="signal-strip-label">Countries</div>
                <strong>{featuredBrief.countries?.length || 0}</strong>
              </article>
              <article className="editorial-card compact">
                <div className="signal-strip-label">Actor tags</div>
                <strong>{featuredBrief.actor_tags?.length || 0}</strong>
              </article>
              <article className="editorial-card compact">
                <div className="signal-strip-label">Latest level</div>
                <strong>{threatLabel(featuredBrief.latest_threat_level)}</strong>
              </article>
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === 'overview' && summary ? (
        <section className="intel-section-card threat-intel-collection-section fade-in-delay-1">
          <div className="intel-section-head">
            <div className="intel-eyebrow"><Database size={14} />Collection Pipeline</div>
            <h2 className="intel-section-title">Collection pipeline</h2>
          </div>

          {!summary.indicators && summary.latest_collection_at ? (
            <div className="intel-empty-inline">
              The collection pipeline has run, but no persisted indicators are visible yet. Fresh data should appear here after the next successful collector write.
            </div>
          ) : null}

          <div className="signal-strip">
            <article className="signal-strip-item">
              <div className="signal-strip-label">Raw items</div>
              <strong className="signal-strip-value">{summary.raw_items || 0}</strong>
              <div className="signal-strip-copy">Feed items stored before normalization.</div>
            </article>
            <article className="signal-strip-item">
              <div className="signal-strip-label">Indicators</div>
              <strong className="signal-strip-value">{summary.indicators || 0}</strong>
              <div className="signal-strip-copy">Normalized indicators tracked across sources.</div>
            </article>
            <article className="signal-strip-item">
              <div className="signal-strip-label">Actionable</div>
              <strong className="signal-strip-value">{summary.actionable_indicators || 0}</strong>
              <div className="signal-strip-copy">Indicators currently marked suspicious or threat.</div>
            </article>
            <article className="signal-strip-item">
              <div className="signal-strip-label">Sources</div>
              <strong className="signal-strip-value">{summary.sources || 0}</strong>
              <div className="signal-strip-copy">Active collectors feeding the intelligence pipeline.</div>
            </article>
            <article className="signal-strip-item">
              <div className="signal-strip-label">Latest run</div>
              <strong className="signal-strip-value">{summary.latest_collection_at ? new Date(summary.latest_collection_at).toLocaleString() : 'Waiting'}</strong>
              <div className="signal-strip-copy">Most recent scheduled or manual collection window.</div>
            </article>
          </div>

          <div className="threat-intel-collection-grid">
            <div className="brief-panel">
              <div className="analysis-meta-label">Source activity</div>
              {!sourceBreakdown.length ? (
                <p>No collector output has been recorded yet.</p>
              ) : (
                <div className="collection-source-list">
                  {sourceBreakdown.slice(0, 6).map((item) => (
                    <div key={item.source} className="collection-source-row">
                      <strong>{item.source}</strong>
                      <span>{item.count} items</span>
                      <span>confidence {Math.round((item.confidence_score || 0) * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="brief-panel">
              <div className="analysis-meta-label">Collector spotlight</div>
              {!collectionIndicators.length ? (
                <p>No high-severity collected indicators yet.</p>
              ) : (
                <ExpandableFeed
                  items={collectionIndicators}
                  initialCount={4}
                  className="flat-rail"
                  renderItem={(item) => (
                    <article key={`${item.indicator_type}-${item.indicator}`} className={`flat-rail-row ${threatLabel(item.threat_level)}`}>
                      <div className="flat-rail-main">
                        <div className="flat-rail-title">{item.indicator}</div>
                        <div className="flat-rail-meta">
                          {item.indicator_type} | {item.source_count} sources | {item.sightings} sightings
                        </div>
                        <div className="flat-rail-copy">{item.summary}</div>
                      </div>
                      <div className="flat-rail-side">Risk {item.risk_score}</div>
                      <div><span className={`platform-badge ${threatLabel(item.threat_level)}`}>{threatLabel(item.threat_level)}</span></div>
                      <div><Link className="intel-inline-link" to={buildIocPath(item.indicator_type, item.indicator)}>IOC details</Link></div>
                    </article>
                  )}
                />
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeSection === 'trending' ? (
      <section className="intel-section-card threat-intel-trending-section fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow"><Radar size={14} />Trending Indicators</div>
          <h2 className="intel-section-title">Trending indicators</h2>
        </div>
        {!trending.length ? <IntelEmptyState title="Trending indicators are still warming up" copy="As signals accumulate, recurring IPs, URLs, domains, and hashes will start clustering here automatically. Try the scanner or bulk IOC flow to seed more intelligence." actionLabel="Open Investigation Center" actionTo="/investigation-center/scanner" /> : (
          <ExpandableFeed
            items={trending}
            initialCount={5}
            className="compact-rail"
            renderItem={(item) => (
              <article key={`${item.ioc_type}-${item.indicator}`} className={`compact-rail-row ${threatLabel(item.latest_threat_level)}`}>
                <div className="compact-rail-main">
                  <div className="compact-rail-title">{item.indicator}</div>
                  <div className="compact-rail-meta">
                    {item.ioc_type} | {item.sightings} sightings | {item.sources.join(', ') || 'intel'} {item.countries.length ? `| ${item.countries.join(', ')}` : ''}
                  </div>
                  <div className="compact-rail-action">
                    <span className={`platform-badge ${threatLabel(item.latest_threat_level)}`}>{threatLabel(item.latest_threat_level)}</span>
                    <Link className="intel-inline-link" to={item.details_path || buildIocPath(item.ioc_type, item.indicator)}>IOC details</Link>
                  </div>
                </div>
              </article>
            )}
          />
        )}
      </section>
      ) : null}

      {activeSection === 'briefs' ? (
      <section className="intel-section-card threat-intel-briefs-section fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow"><GitBranch size={14} />Incident Briefs</div>
          <h2 className="intel-section-title">Incident briefs</h2>
        </div>
        {!briefs.length ? <IntelEmptyState title="No incident briefs yet" copy="Briefs appear after recurring indicators, shared actor tags, and overlapping sources form a cluster worth surfacing as broader context." actionLabel="Open Campaign View" actionTo="/campaign-clusters" /> : (
          <ExpandableFeed
            items={briefs}
            initialCount={4}
            className="flat-rail"
            renderItem={(item) => (
              <article key={item.id} className={`flat-rail-row ${threatLabel(item.latest_threat_level)}`}>
                <div className="flat-rail-main">
                  <div className="flat-rail-title">{item.title}</div>
                  <div className="flat-rail-meta">
                    {item.signal_count} signals {item.countries?.length ? `| ${item.countries.join(', ')}` : ''} {item.actor_tags?.length ? `| ${item.actor_tags.join(', ')}` : ''}
                  </div>
                  <div className="flat-rail-copy">{item.summary}</div>
                </div>
                <div><span className={`platform-badge ${threatLabel(item.latest_threat_level)}`}>{threatLabel(item.latest_threat_level)}</span></div>
                <div><Link className="intel-inline-link" to={item.details_path || '/campaign-clusters'}>Open cluster brief</Link></div>
              </article>
            )}
          />
        )}
      </section>
      ) : null}

      {activeSection === 'latest' ? (!feed.length && !error ? <IntelEmptyState title="No published intelligence items yet" copy="The automated feed collector is active. Fresh indicators from OTX, URLhaus, PhishTank, AbuseIPDB, and promoted community findings will appear here as soon as actionable signals land." actionLabel="View Timeline" actionTo="/timeline" /> : (
        <section className="intel-section-card threat-intel-latest-section fade-in-delay-3">
          <div className="intel-section-head">
            <div className="intel-eyebrow"><Radar size={14} />Latest Intelligence</div>
            <h2 className="intel-section-title">Latest published indicators</h2>
          </div>
          <ExpandableFeed
            items={feed}
            initialCount={6}
            className="flat-rail"
            renderItem={(item) => (
              <article key={item.id} className={`flat-rail-row ${threatLabel(item.threat_level)}`}>
                <div className="flat-rail-main">
                  <div className="flat-rail-title">{item.indicator}</div>
                  <div className="flat-rail-meta">Trustive AI intelligence stream</div>
                </div>
                <div className="flat-rail-side">Risk {item.risk_score}</div>
                <div><span className={`platform-badge ${threatLabel(item.threat_level)}`}>{threatLabel(item.threat_level)}</span></div>
                <div><Link className="intel-inline-link" to={buildIocPath(item.threat_type, item.indicator)}>IOC details</Link></div>
              </article>
            )}
          />
        </section>
      )) : null}
    </section>
  )
}
