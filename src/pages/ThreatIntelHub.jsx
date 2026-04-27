import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch, Radar } from 'lucide-react'

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

export default function ThreatIntelHub() {
  const [feed, setFeed] = useState([])
  const [trending, setTrending] = useState([])
  const [briefs, setBriefs] = useState([])
  const [collectionOverview, setCollectionOverview] = useState(null)
  const [error, setError] = useState('')
  const [live, setLive] = useState(true)
  const [activeSection, setActiveSection] = useState('trending')

  useEffect(() => {
    let active = true
    const loadIntel = () => {
      Promise.all([
        apiRequest('/api/community/threats'),
        apiRequest('/api/intelligence/trending-indicators?time_range=30d&limit=10'),
        apiRequest('/api/intelligence/public-incident-briefs?limit=6'),
        apiRequest('/api/intelligence/collection/overview'),
      ])
        .then(([feedPayload, trendingPayload, briefsPayload, collectionPayload]) => {
          if (!active) return
          setError('')
          setFeed(feedPayload || [])
          setTrending(trendingPayload.items || [])
          setBriefs(briefsPayload.items || [])
          setCollectionOverview(collectionPayload || null)
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
  const workspaceCards = [
    {
      label: 'Top recurring signal',
      value: trending[0]?.indicator || 'Waiting for recurring activity',
      copy: trending[0] ? `${trending[0].sightings} sightings across ${trending[0].sources?.length || 0} sources.` : 'Recurring indicators will surface here once the feed warms up.',
      action: '/timeline',
      actionLabel: 'Open timeline',
    },
    {
      label: 'Lead brief',
      value: featuredBrief?.title || 'No active brief yet',
      copy: featuredBrief?.summary || 'Incident briefs will appear here when collected signals cluster together.',
      action: featuredBrief?.details_path || '/campaign-clusters',
      actionLabel: 'Open brief',
    },
    {
      label: 'Collector status',
      value: summary?.latest_collection_at ? 'Collecting' : 'Waiting',
      copy: summary?.latest_collection_at ? `Latest run ${new Date(summary.latest_collection_at).toLocaleString()}.` : 'The collection pipeline has not produced a visible run yet.',
      action: '/search',
      actionLabel: 'Search indicators',
    },
  ]
  const sections = [
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

      <section className="threat-intel-workspace-strip fade-in-delay-1">
        {workspaceCards.map((card) => (
          <article key={card.label} className="threat-intel-workspace-card">
            <div className="signal-strip-label">{card.label}</div>
            <strong className="threat-intel-workspace-value">{card.value}</strong>
            <p className="threat-intel-workspace-copy">{card.copy}</p>
            <Link className="intel-inline-link" to={card.action}>{card.actionLabel}</Link>
          </article>
        ))}
      </section>

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
                <div className="flat-rail-actions">
                  <span className={`platform-badge ${threatLabel(item.latest_threat_level)}`}>{threatLabel(item.latest_threat_level)}</span>
                  <Link className="intel-inline-link" to={item.details_path || '/campaign-clusters'}>Open cluster brief</Link>
                </div>
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
                <div className="flat-rail-actions">
                  <span className="flat-rail-side">Risk {item.risk_score}</span>
                  <span className={`platform-badge ${threatLabel(item.threat_level)}`}>{threatLabel(item.threat_level)}</span>
                  <Link className="intel-inline-link" to={buildIocPath(item.threat_type, item.indicator)}>IOC details</Link>
                </div>
              </article>
            )}
          />
        </section>
      )) : null}
    </section>
  )
}
