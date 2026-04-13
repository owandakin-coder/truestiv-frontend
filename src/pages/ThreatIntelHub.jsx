import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, DatabaseZap, GitBranch, Radar } from 'lucide-react'

import ExpandableFeed from '../components/ExpandableFeed'
import IntelEmptyState from '../components/IntelEmptyState'
import { apiRequest } from '../services/api'
import { buildIocPath } from '../utils/intelTools'

function threatLabel(level) {
  const value = String(level || '').toLowerCase()
  return value || 'unknown'
}

export default function ThreatIntelHub() {
  const [sources, setSources] = useState([])
  const [feed, setFeed] = useState([])
  const [trends, setTrends] = useState({ by_source: [], by_country: [], by_ioc_type: [], timeline: [] })
  const [jobs, setJobs] = useState({ jobs: [], retry_queue: [] })
  const [trending, setTrending] = useState([])
  const [briefs, setBriefs] = useState([])
  const [error, setError] = useState('')
  const [live, setLive] = useState(true)

  useEffect(() => {
    let active = true
    const loadIntel = () => {
      Promise.all([
        apiRequest('/api/intelligence/sources-status'),
        apiRequest('/api/community/threats'),
        apiRequest('/api/intelligence/trends?time_range=30d'),
        apiRequest('/api/intelligence/jobs/status'),
        apiRequest('/api/intelligence/trending-indicators?time_range=30d&limit=10'),
        apiRequest('/api/intelligence/public-incident-briefs?limit=6'),
      ])
        .then(([sourcesPayload, feedPayload, trendsPayload, jobsPayload, trendingPayload, briefsPayload]) => {
          if (!active) return
          setError('')
          setSources(sourcesPayload.sources || [])
          setFeed(feedPayload || [])
          setTrends(trendsPayload || { by_source: [], by_country: [], by_ioc_type: [], timeline: [] })
          setJobs(jobsPayload || { jobs: [], retry_queue: [] })
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

  const stats = useMemo(() => {
    const activeSources = sources.length
    const publishedFeed = feed.length
    const highRisk = feed.filter((item) => ['threat', 'suspicious'].includes(String(item.threat_level || '').toLowerCase())).length
    return { activeSources, publishedFeed, highRisk }
  }, [feed, sources])
  const featuredBrief = briefs[0] || null
  const mostActiveCountry = (trends.by_country || [])[0]?.label || 'Pending'
  const fastestCluster = featuredBrief?.title || (briefs[1]?.title || 'Pending')
  const topBrand = trending.find((item) => (item.actor_tags || []).some((tag) => /brand|phish|imperson/i.test(String(tag))))?.indicator || 'Pending'
  const editorialCards = [
    { label: 'What matters now', value: featuredBrief?.title || 'No featured brief yet', copy: featuredBrief?.summary || 'A featured brief will appear here as recurring signals accumulate.' },
    { label: 'Fastest growing cluster', value: fastestCluster, copy: featuredBrief?.signal_count ? `${featuredBrief.signal_count} related signals` : 'Waiting for enough overlap to name a cluster.' },
    { label: 'Top impersonated brand', value: topBrand, copy: 'Brand impersonation signals are weighted from domain and URL analysis.' },
    { label: 'Most active country', value: mostActiveCountry, copy: 'Derived from suspicious and threat findings only.' },
  ]

  return (
    <section className="intel-shell zone-threat-intel">
      <div className="intel-hero-card portal-hero portal-hero-single threat-intel-hero fade-in">
        <div className="intel-hero-content portal-hero-main">
          <div className="intel-eyebrow"><span className="intel-eyebrow-dot" />Public Threat Intelligence</div>
          <h1 className="intel-title" style={{ fontSize: 30, lineHeight: 1.3 }}>
            External feed collection and public incident context<br />in one centered view.
          </h1>
          <p className="intel-copy intel-reading-block">This hub now combines live feeds, recurring indicators, public incident briefs, background jobs, and weighted source context for anyone exploring the platform.</p>
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
            <div className="brief-panel" style={{ marginTop: 8 }}>
              <strong>Why it matters now</strong>
              <p>
                This brief is currently the clearest public narrative inside the portal because it combines recurring signals, geographic spread, and overlapping source attribution in one place.
              </p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <Link className="intel-inline-link" to={featuredBrief.details_path || '/campaign-clusters'}>Open full brief</Link>
                <Link className="intel-inline-link" to="/timeline">Open timeline context</Link>
              </div>
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
                <p>{featuredBrief.countries?.join(', ') || 'Unknown regions'}</p>
              </article>
              <article className="editorial-card compact">
                <div className="signal-strip-label">Actor tags</div>
                <strong>{featuredBrief.actor_tags?.length || 0}</strong>
                <p>{(featuredBrief.actor_tags || []).slice(0, 2).join(', ') || 'Pending tags'}</p>
              </article>
              <article className="editorial-card compact">
                <div className="signal-strip-label">Follow-up</div>
                <strong>Campaign view</strong>
                <p>Use the cluster surface to inspect the full relationship set.</p>
              </article>
            </div>
          </div>
        </section>
      ) : null}

      <section className="fade-in-delay-1" style={{ marginTop: 20 }}>
        <div className="editorial-strip">
          {editorialCards.map((card) => (
            <article key={card.label} className="editorial-card compact">
              <div className="signal-strip-label">{card.label}</div>
              <strong>{card.value}</strong>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="intel-section-card threat-intel-trending-section fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow"><Radar size={14} />Trending Indicators</div>
          <h2 className="intel-section-title">Repeated indicators across the public intelligence surface</h2>
          <p className="intel-section-copy intel-reading-block">These rows highlight indicators that continue to reappear across published signals, making them strong candidates for immediate investigation.</p>
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
                  <div className="compact-rail-copy">Recurring across the public intelligence surface and worth immediate pivoting into IOC details or campaign context.</div>
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
          <p className="intel-section-copy intel-reading-block">Each brief aggregates related indicators, sources, countries, and actor tags into one public-facing narrative snapshot.</p>
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
                <div className="flat-rail-side">Brief</div>
                <div className="flat-rail-side">{item.signal_count} signals</div>
                <div><span className={`platform-badge ${threatLabel(item.latest_threat_level)}`}>{threatLabel(item.latest_threat_level)}</span></div>
                <div><Link className="intel-inline-link" to={item.details_path || '/campaign-clusters'}>Open cluster brief</Link></div>
              </article>
            )}
          />
        )}
      </section>

      <section className="intel-section-card threat-intel-trends-section fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow"><Activity size={14} />Threat Trends</div>
          <h2 className="intel-section-title">High-signal patterns by source, country, type, and time</h2>
          <p className="intel-section-copy intel-reading-block">These trend views are built only from suspicious and threat findings so the charts stay operationally useful.</p>
        </div>
        <div className="editorial-grid">
          <article className="editorial-card"><div className="signal-strip-label">Top Sources</div>{(trends.by_source || []).slice(0, 4).map((item) => <div key={item.label} className="intel-bar-row"><span>{item.label}</span><div className="intel-bar-track"><div className="intel-bar-fill" style={{ width: `${Math.min(100, item.count * 10)}%` }} /></div><strong>{item.count}</strong></div>)}</article>
          <article className="editorial-card"><div className="signal-strip-label">Top Countries</div>{(trends.by_country || []).slice(0, 4).map((item) => <div key={item.label} className="intel-bar-row"><span>{item.label}</span><div className="intel-bar-track"><div className="intel-bar-fill" style={{ width: `${Math.min(100, item.count * 12)}%` }} /></div><strong>{item.count}</strong></div>)}</article>
          <article className="editorial-card"><div className="signal-strip-label">IOC Types</div>{(trends.by_ioc_type || []).slice(0, 4).map((item) => <div key={item.label} className="intel-bar-row"><span>{item.label}</span><div className="intel-bar-track"><div className="intel-bar-fill" style={{ width: `${Math.min(100, item.count * 12)}%` }} /></div><strong>{item.count}</strong></div>)}</article>
          <article className="editorial-card"><div className="signal-strip-label">Recent Timeline</div>{(trends.timeline || []).slice(-4).map((item) => <div key={item.label} className="intel-bar-row"><span>{item.label}</span><div className="intel-bar-track"><div className="intel-bar-fill" style={{ width: `${Math.min(100, item.count * 16)}%` }} /></div><strong>{item.count}</strong></div>)}</article>
        </div>
      </section>

      <section className="intel-section-card threat-intel-jobs-section fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow"><DatabaseZap size={14} />Background Jobs</div>
          <h2 className="intel-section-title">What succeeded, what failed, and what is waiting in retry</h2>
          <p className="intel-section-copy intel-reading-block">This operational panel tracks the automated feed collection jobs and the retry queue behind the intelligence stream.</p>
        </div>
        <div className="intel-grid-two">
          {(jobs.jobs || []).map((item) => (
            <article key={item.job_name} className="intel-detail-card">
              <div className="intel-detail-label">{item.job_name}</div>
              <div className="intel-detail-value">{item.status}</div>
              <p className="intel-detail-copy">Last run: {item.finished_at || item.started_at || 'Unknown'}</p>
              <p className="intel-detail-copy">{item.message || 'No message'} {item.stats?.saved !== undefined ? `| saved ${item.stats.saved}` : ''}</p>
            </article>
          ))}
          <article className="intel-detail-card">
            <div className="intel-detail-label">Retry Queue</div>
            <div className="intel-detail-value">{(jobs.retry_queue || []).length}</div>
            <div className="intel-tag-wrap">
              {(jobs.retry_queue || []).slice(0, 6).map((item) => <span key={item.id} className="intel-tag-chip">{item.source} attempt {item.attempts}</span>)}
              {!jobs.retry_queue?.length ? <span className="intel-detail-copy">Retry queue is currently empty.</span> : null}
            </div>
          </article>
        </div>
      </section>

      <section className="intel-section-card threat-intel-sources-section fade-in-delay-2">
        <div className="intel-section-head">
          <div className="intel-eyebrow"><DatabaseZap size={14} />Source Confidence</div>
          <h2 className="intel-section-title">Weighted reliability by source</h2>
          <p className="intel-section-copy intel-reading-block">Not all sources are treated equally. These weights help Trustive AI score findings more realistically.</p>
        </div>
        <div className="intel-grid-two">
          {sources.map((item) => (
            <article key={item.key || item.name} className="intel-detail-card">
              <div className="intel-detail-label">{item.name}</div>
              <div className="intel-detail-value">{Math.round(Number(item.confidence_score || 0) * 100)}%</div>
              <p className="intel-detail-copy">{item.confidence_label || 'moderate'} confidence | {item.status}</p>
              {item.last_error ? <p className="intel-detail-copy">{item.last_error}</p> : null}
            </article>
          ))}
        </div>
      </section>

      {!feed.length && !error ? <IntelEmptyState title="No published intelligence items yet" copy="The automated feed collector is active. Fresh indicators from OTX, URLhaus, PhishTank, AbuseIPDB, and promoted community findings will appear here as soon as actionable signals land." actionLabel="View Timeline" actionTo="/timeline" /> : (
        <section className="intel-section-card threat-intel-latest-section fade-in-delay-3">
          <div className="intel-section-head">
            <div className="intel-eyebrow"><Radar size={14} />Latest Intelligence</div>
            <h2 className="intel-section-title">Most recent published indicators</h2>
            <p className="intel-section-copy intel-reading-block">A centered summary of the newest indicators coming from automated collection and community promotion.</p>
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
                  <div className="flat-rail-copy">Latest published indicator from automated collection or community promotion.</div>
                </div>
                <div className="flat-rail-side">{item.threat_type}</div>
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
