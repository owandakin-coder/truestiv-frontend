import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch, Radar } from 'lucide-react'

import ExpandableFeed from '../components/ExpandableFeed'
import IntelEmptyState from '../components/IntelEmptyState'
import { apiRequest } from '../services/api'
import { buildIocPath } from '../utils/intelTools'

function threatLabel(level) {
  const value = String(level || '').toLowerCase()
  return value || 'unknown'
}

export default function ThreatIntelHub() {
  const [feed, setFeed] = useState([])
  const [trending, setTrending] = useState([])
  const [briefs, setBriefs] = useState([])
  const [error, setError] = useState('')
  const [live, setLive] = useState(true)

  useEffect(() => {
    let active = true
    const loadIntel = () => {
      Promise.all([
        apiRequest('/api/community/threats'),
        apiRequest('/api/intelligence/trending-indicators?time_range=30d&limit=10'),
        apiRequest('/api/intelligence/public-incident-briefs?limit=6'),
      ])
        .then(([feedPayload, trendingPayload, briefsPayload]) => {
          if (!active) return
          setError('')
          setFeed(feedPayload || [])
          setTrending(trendingPayload.items || [])
          setBriefs(briefsPayload.items || [])
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
  const mostActiveCountry = featuredBrief?.countries?.[0] || trending.find((item) => item.countries?.length)?.countries?.[0] || 'Pending'
  const fastestCluster = featuredBrief?.title || (briefs[1]?.title || 'Pending')
  const topBrand = trending.find((item) => (item.actor_tags || []).some((tag) => /brand|phish|imperson/i.test(String(tag))))?.indicator || 'Pending'
  const editorialCards = [
    { label: 'What matters now', value: featuredBrief?.title || 'No featured brief yet' },
    { label: 'Fastest growing cluster', value: fastestCluster },
    { label: 'Top impersonated brand', value: topBrand },
    { label: 'Most active country', value: mostActiveCountry },
  ]

  return (
    <section className="intel-shell zone-threat-intel">
      <div className="intel-hero-card portal-hero portal-hero-single threat-intel-hero fade-in">
        <div className="intel-hero-content portal-hero-main">
          <div className="portal-hero-kicker-row">
            <div className="portal-hero-kicker-dot" />
            <span className="portal-hero-kicker-label">Public Threat Intelligence</span>
          </div>
          <h1 className="portal-hero-title portal-hero-title-wide">External feed collection and public incident context.</h1>
          <p className="portal-hero-copy">Recurring indicators, public briefs, and live collection in one public surface.</p>
          <div className="intel-hero-actions">
            <button className={`intel-button ${live ? 'primary' : 'ghost'}`} type="button" onClick={() => setLive((current) => !current)}>
              {live ? 'Live refresh on' : 'Live refresh off'}
            </button>
            <Link className="intel-button ghost" to="/campaign-clusters">Open campaign view</Link>
          </div>
        </div>
      </div>

      {error ? <div className="intel-empty-card">{error}</div> : null}

      {featuredBrief ? (
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
                <p>Indicators grouped into this public brief.</p>
              </article>
              <article className="editorial-card compact">
                <div className="signal-strip-label">Countries</div>
                <strong>{featuredBrief.countries?.length || 0}</strong>
                <p>{featuredBrief.countries?.slice(0, 2).join(', ') || 'Unknown regions'}</p>
              </article>
              <article className="editorial-card compact">
                <div className="signal-strip-label">Actor tags</div>
                <strong>{featuredBrief.actor_tags?.length || 0}</strong>
                <p>{(featuredBrief.actor_tags || []).slice(0, 2).join(', ') || 'Pending tags'}</p>
              </article>
              <article className="editorial-card compact">
                <div className="signal-strip-label">Latest level</div>
                <strong>{threatLabel(featuredBrief.latest_threat_level)}</strong>
                <p>Current severity from the grouped public signals.</p>
              </article>
            </div>
          </div>
        </section>
      ) : null}

      <section className="fade-in-delay-1" style={{ marginTop: 20 }}>
        <div className="editorial-strip editorial-strip-tight">
          {editorialCards.map((card) => (
            <article key={card.label} className="editorial-card compact">
              <div className="signal-strip-label">{card.label}</div>
              <strong>{card.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="intel-section-card threat-intel-trending-section fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow"><Radar size={14} />Trending Indicators</div>
          <h2 className="intel-section-title">Repeated indicators across the public intelligence surface</h2>
        </div>
        {!trending.length ? <IntelEmptyState title="Trending indicators are still warming up" copy="As public signals accumulate, recurring IPs, URLs, domains, and hashes will start clustering here automatically. Try the scanner or bulk IOC flow to seed more intelligence." actionLabel="Open Investigation Center" actionTo="/investigation-center/scanner" /> : (
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

      <section className="intel-section-card threat-intel-briefs-section fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow"><GitBranch size={14} />Public Incident Briefs</div>
          <h2 className="intel-section-title">Clustered briefs built from recurring public signals</h2>
        </div>
        {!briefs.length ? <IntelEmptyState title="No public incident briefs yet" copy="Briefs appear after recurring indicators, shared actor tags, and overlapping sources form a cluster worth surfacing as public context." actionLabel="Open Campaign View" actionTo="/campaign-clusters" /> : (
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

      {!feed.length && !error ? <IntelEmptyState title="No published intelligence items yet" copy="The automated feed collector is active. Fresh indicators from OTX, URLhaus, PhishTank, AbuseIPDB, and promoted community findings will appear here as soon as actionable signals land." actionLabel="View Timeline" actionTo="/timeline" /> : (
        <section className="intel-section-card threat-intel-latest-section fade-in-delay-3">
          <div className="intel-section-head">
            <div className="intel-eyebrow"><Radar size={14} />Latest Intelligence</div>
            <h2 className="intel-section-title">Most recent published indicators</h2>
          </div>
          <ExpandableFeed
            items={feed}
            initialCount={6}
            className="flat-rail"
            renderItem={(item) => (
              <article key={item.id} className={`flat-rail-row ${threatLabel(item.threat_level)}`}>
                <div className="flat-rail-main">
                  <div className="flat-rail-title">{item.indicator}</div>
                  <div className="flat-rail-meta">Trustive AI public intelligence stream</div>
                </div>
                <div className="flat-rail-side">Risk {item.risk_score}</div>
                <div><span className={`platform-badge ${threatLabel(item.threat_level)}`}>{threatLabel(item.threat_level)}</span></div>
                <div><Link className="intel-inline-link" to={buildIocPath(item.threat_type, item.indicator)}>IOC details</Link></div>
              </article>
            )}
          />
        </section>
      )}
    </section>
  )
}
