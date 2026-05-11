import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { Globe2, MapPin } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

import Seo from '../components/Seo'
import { api, getErrorMessage } from '../services/api'
import { buildIocPath } from '../utils/intelTools'

const PALETTE = {
  threat:     '#ef4444',
  suspicious: '#f59e0b',
  safe:       '#22c55e',
  default:    '#60a5fa',
}

function levelColor(level) {
  const v = String(level || '').toLowerCase()
  return PALETTE[v] || PALETTE.default
}
function levelLabel(level) {
  const v = String(level || '').toLowerCase()
  if (v === 'threat')     return 'THREAT'
  if (v === 'suspicious') return 'SUSPICIOUS'
  if (v === 'safe')       return 'SAFE'
  return 'UNKNOWN'
}

function clusterMarkers(markers) {
  if (!markers.length) return []
  if (markers.length < 30) return markers.map((m) => ({ ...m, cluster_count: 1 }))
  const buckets = new Map()
  markers.forEach((marker) => {
    const lat = Number(marker.latitude)
    const lng = Number(marker.longitude)
    const key = `${lat.toFixed(1)}:${lng.toFixed(1)}`
    const cur = buckets.get(key)
    if (!cur) {
      buckets.set(key, { ...marker, latitude: lat, longitude: lng, cluster_count: 1, indicators: [marker.indicator] })
      return
    }
    cur.cluster_count += 1
    cur.indicators.push(marker.indicator)
    cur.risk_score = Math.max(Number(cur.risk_score || 0), Number(marker.risk_score || 0))
    if (String(marker.threat_level || '').toLowerCase() === 'threat') cur.threat_level = 'threat'
    else if (String(marker.threat_level || '').toLowerCase() === 'suspicious' && String(cur.threat_level || '').toLowerCase() !== 'threat') cur.threat_level = 'suspicious'
    cur.source = cur.cluster_count > 1 ? 'clustered' : cur.source
    cur.details_path = cur.cluster_count > 1 ? '' : cur.details_path
  })
  return Array.from(buckets.values())
}

const timeRanges = ['24h', '7d', '30d', '90d', 'all']

export default function GeoThreatMap() {
  const navigate = useNavigate()
  const [markers,        setMarkers]        = useState([])
  const [feedMarkers,    setFeedMarkers]    = useState([])
  const [facets,         setFacets]         = useState({ sources: [], countries: [], threat_levels: [] })
  const [playbackPoints, setPlaybackPoints] = useState([])
  const [playbackIndex,  setPlaybackIndex]  = useState(-1)
  const [countryDetails, setCountryDetails] = useState({ country: '', items: [] })
  const [error,          setError]          = useState('')
  const [loading,        setLoading]        = useState(true)
  const [live,           setLive]           = useState(true)
  const [filters,        setFilters]        = useState({ source: 'all', country: 'all', threat_level: 'all', time_range: '30d' })
  const [feedExpanded,   setFeedExpanded]   = useState(false)
  const [drillExpanded,  setDrillExpanded]  = useState(false)

  const FEED_INITIAL  = 10
  const DRILL_INITIAL = 10

  const loadMap = useCallback(() => {
    let active = true
    setLoading(true)
    setError('')
    api().get('/api/intelligence/geo-map', { params: filters })
      .then(({ data }) => {
        if (!active) return
        setMarkers(data.markers || [])
        setFacets(data.facets || { sources: [], countries: [], threat_levels: [] })
        setPlaybackPoints(data.playback_points || [])
      })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Failed to load geo map')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters])

  useEffect(() => loadMap(), [loadMap])

  useEffect(() => {
    let active = true
    api().get('/api/intelligence/geo-map', {
      params: { source: 'all', country: 'all', threat_level: 'all', time_range: filters.time_range, limit: 120 },
    })
      .then(({ data }) => { if (active) setFeedMarkers(data.markers || []) })
      .catch(() => { if (active) setFeedMarkers([]) })
    return () => { active = false }
  }, [filters.time_range, live])

  useEffect(() => {
    if (!live) return undefined
    const id = setInterval(loadMap, 30000)
    return () => clearInterval(id)
  }, [live, loadMap])

  const playbackMarkers = useMemo(() => {
    if (playbackIndex < 0 || !playbackPoints.length) return markers
    const threshold = playbackPoints[Math.min(playbackIndex, playbackPoints.length - 1)]
    return markers.filter((m) => String(m.published_at || '').slice(0, 10) <= threshold)
  }, [markers, playbackIndex, playbackPoints])

  const center = useMemo(() => {
    const valid = playbackMarkers.filter((m) => Number.isFinite(Number(m.latitude)) && Number.isFinite(Number(m.longitude)))
    if (!valid.length) return [20, 0]
    return [
      valid.reduce((s, m) => s + Number(m.latitude),  0) / valid.length,
      valid.reduce((s, m) => s + Number(m.longitude), 0) / valid.length,
    ]
  }, [playbackMarkers])

  const mapMarkers = useMemo(() => clusterMarkers(playbackMarkers), [playbackMarkers])

  const openCountry = async (country) => {
    try {
      const { data } = await api().get('/api/intelligence/geo-map/country-drilldown', {
        params: { country, time_range: filters.time_range },
      })
      setCountryDetails({ country, items: data.items || [] })
      setDrillExpanded(false)
    } catch (err) { setError(getErrorMessage(err, 'Failed to load country drilldown')) }
  }

  function setFilter(key, val) {
    setFilters((f) => ({ ...f, [key]: val }))
  }

  const visibleFeed  = feedExpanded  ? feedMarkers           : feedMarkers.slice(0, FEED_INITIAL)
  const visibleDrill = drillExpanded ? countryDetails.items  : countryDetails.items.slice(0, DRILL_INITIAL)

  return (
    <div className="aip-root">
      <Seo
        title="Trustive AI | Geo Threat Map"
        description="Track threat geography, marker feeds, and country drilldowns across Trustive AI intelligence signals."
        path="/propagation"
      />
      <div className="grid-dots aip-bg-dots" />
      <div className="aip-inner">

        {/* Hero */}
        <header className="aip-hero fade-in">
          <div className="aip-kicker">
            <span className="aip-kicker-dot" />
            <span className="aip-kicker-text">GEO THREAT MAP</span>
          </div>
          <h1 className="aip-title">Threat Geography.</h1>
          <p className="aip-copy">
            Real-world threat locations from community indicators and scanned IP activity.
            {markers.length ? ` ${markers.length} active markers.` : ''}
          </p>
        </header>

        {/* Filter bar */}
        <div className="aip-filter-bar fade-in-delay-1">
          <div className="aip-filter-group">
            <span className="aip-filter-label">SOURCE</span>
            <select className="aip-filter-select" value={filters.source} onChange={(e) => setFilter('source', e.target.value)}>
              <option value="all">ALL</option>
              {(facets.sources || []).map((o) => <option key={o} value={o}>{String(o).toUpperCase()}</option>)}
            </select>
          </div>
          <div className="aip-filter-group">
            <span className="aip-filter-label">COUNTRY</span>
            <select className="aip-filter-select" value={filters.country} onChange={(e) => setFilter('country', e.target.value)}>
              <option value="all">ALL</option>
              {(facets.countries || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="aip-filter-group">
            <span className="aip-filter-label">LEVEL</span>
            <select className="aip-filter-select" value={filters.threat_level} onChange={(e) => setFilter('threat_level', e.target.value)}>
              <option value="all">ALL</option>
              {(facets.threat_levels || []).map((o) => <option key={o} value={o}>{String(o).toUpperCase()}</option>)}
            </select>
          </div>
          <div className="aip-filter-group">
            <span className="aip-filter-label">RANGE</span>
            <select className="aip-filter-select" value={filters.time_range} onChange={(e) => setFilter('time_range', e.target.value)}>
              {timeRanges.map((o) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
            </select>
          </div>
          <span className="aip-filter-divider" />
          <button
            type="button"
            className={`aip-live-btn${live ? ' is-live' : ''}`}
            onClick={() => setLive((v) => !v)}
          >
            <span className="aip-live-dot" />
            {live ? 'LIVE' : 'PAUSED'}
          </button>
        </div>

        {error ? <p className="aip-error fade-in" style={{ borderColor: 'rgba(240,64,64,.28)', color: '#fca5a5' }}>{error}</p> : null}

        {/* Map + feed — two column */}
        <div className="geo-layout fade-in-delay-1">

          {/* Map canvas */}
          <div className="geo-map-panel">
            <div className="aip-activity-hd" style={{ marginBottom: 12 }}>
              <span className="aip-activity-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe2 size={13} />WORLD MAP
              </span>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'rgba(148,163,184,.4)' }}>
                {playbackMarkers.length} markers · {mapMarkers.length} clustered
              </span>
            </div>

            {/* Playback */}
            {playbackPoints.length ? (
              <div className="geo-playback">
                <span className="aip-filter-label">PLAYBACK</span>
                <input
                  type="range"
                  min="-1"
                  max={Math.max(playbackPoints.length - 1, 0)}
                  value={playbackIndex}
                  onChange={(e) => setPlaybackIndex(Number(e.target.value))}
                  className="geo-playback-slider"
                />
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: 'rgba(148,163,184,.5)' }}>
                  {playbackIndex < 0 ? 'All periods' : `Up to ${playbackPoints[playbackIndex]}`}
                </span>
              </div>
            ) : null}

            <div className="geo-map-canvas">
              <MapContainer center={center} zoom={2} scrollWheelZoom className="map-leaflet" style={{ width: '100%', height: '100%', borderRadius: 12, background: '#060a14' }}>
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapMarkers.map((marker) => {
                  const color = levelColor(marker.threat_level)
                  return (
                    <CircleMarker
                      key={`${marker.indicator}-${marker.latitude}-${marker.longitude}-${marker.cluster_count || 1}`}
                      center={[Number(marker.latitude), Number(marker.longitude)]}
                      radius={Math.max(6, Math.min(18, Number(marker.risk_score || 24) / 8 + Math.min((marker.cluster_count || 1) - 1, 4)))}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: 2 }}
                    >
                      <Popup>
                        <div style={{ minWidth: 200 }}>
                          <strong>{marker.cluster_count > 1 ? `${marker.cluster_count} indicators clustered` : marker.indicator}</strong>
                          <div>{marker.location_name || 'Unknown location'}</div>
                          <div>Risk: {marker.risk_score}</div>
                          <div>Level: {marker.threat_level}</div>
                          <div>Source: {marker.source || 'intel'}</div>
                          {marker.cluster_count > 1 ? <div>Examples: {(marker.indicators || []).slice(0, 3).join(', ')}</div> : null}
                          {marker.details_path ? <a href={marker.details_path} style={{ display: 'inline-block', marginTop: 8 }}>Open IOC details</a> : null}
                        </div>
                      </Popup>
                    </CircleMarker>
                  )
                })}
              </MapContainer>
            </div>
          </div>

          {/* Marker feed sidebar */}
          <div className="geo-feed-panel">
            <div className="aip-activity-hd" style={{ marginBottom: 0 }}>
              <span className="aip-activity-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} />MARKER FEED
              </span>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'rgba(148,163,184,.4)' }}>
                {feedMarkers.length}
              </span>
            </div>

            {loading ? <p className="aip-loading" style={{ padding: '16px 0' }}>Loading…</p> : null}

            {!loading && !feedMarkers.length ? (
              <p style={{ color: 'rgba(148,163,184,.4)', fontSize: 13, paddingTop: 16 }}>
                No markers yet. Run more IP scans or wait for intel collection.
              </p>
            ) : null}

            {!loading && feedMarkers.length ? (
              <>
                {visibleFeed.map((marker) => {
                  const color = levelColor(marker.threat_level)
                  const label = levelLabel(marker.threat_level)
                  return (
                    <div key={`${marker.indicator}-${marker.published_at}`} className="geo-feed-row">
                      <div className="geo-feed-dot" style={{ background: color }} />
                      <div className="geo-feed-body">
                        <span className="geo-feed-indicator">{marker.indicator}</span>
                        <span className="geo-feed-meta">{marker.location_name || 'Unknown'} · {String(marker.source || 'intel').toUpperCase()}</span>
                        <div className="geo-feed-actions">
                          {marker.country ? (
                            <button type="button" className="aip-viewall" onClick={() => openCountry(marker.country)}>
                              {marker.country} ›
                            </button>
                          ) : null}
                          {marker.details_path ? (
                            <Link className="aip-viewall" to={marker.details_path}>IOC ›</Link>
                          ) : null}
                        </div>
                      </div>
                      <div className="geo-feed-badge" style={{ color, borderColor: `${color}33`, background: `${color}10` }}>
                        {label}
                      </div>
                    </div>
                  )
                })}
                {feedMarkers.length > FEED_INITIAL ? (
                  <button type="button" className="aip-viewall" style={{ marginTop: 10 }} onClick={() => setFeedExpanded((v) => !v)}>
                    {feedExpanded ? 'Show less' : `Show ${feedMarkers.length - FEED_INITIAL} more`}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {/* Country drilldown — aip table */}
        <div className="aip-activity fade-in-delay-2">
          <div className="aip-activity-hd">
            <span className="aip-activity-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={13} />
              {countryDetails.country ? `COUNTRY DRILLDOWN · ${countryDetails.country}` : 'COUNTRY DRILLDOWN'}
            </span>
            {countryDetails.items.length ? (
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'rgba(148,163,184,.4)' }}>
                {countryDetails.items.length} items
              </span>
            ) : null}
          </div>

          {!countryDetails.country ? (
            <p style={{ color: 'rgba(148,163,184,.35)', fontSize: 13 }}>
              Click a country in the marker feed to drill down.
            </p>
          ) : countryDetails.items.length ? (
            <>
              <div className="aip-thead">
                <span>INDICATOR</span><span>TYPE</span><span>LEVEL</span><span>RISK</span><span>LOCATION</span><span />
              </div>
              <div className="aip-tbody">
                {visibleDrill.map((item) => {
                  const color = levelColor(item.threat_level)
                  const label = levelLabel(item.threat_level)
                  const path  = item.details_path || buildIocPath(item.ioc_type, item.indicator)
                  return (
                    <div
                      key={`${item.indicator}-${item.published_at}`}
                      className="aip-trow"
                      role="button"
                      tabIndex={0}
                      onClick={() => path && navigate(path)}
                      onKeyDown={(e) => e.key === 'Enter' && path && navigate(path)}
                      style={{ cursor: path ? 'pointer' : 'default' }}
                    >
                      <div className="aip-td-indicator">
                        <span className="aip-trow-text">{item.indicator}</span>
                      </div>
                      <div className="aip-td aip-td-type">{String(item.ioc_type || '—').toUpperCase()}</div>
                      <div className="aip-td aip-td-verdict">
                        <span className="aip-verdict-dot" style={{ background: color }} />
                        <span className="aip-verdict-label" style={{ color }}>{label}</span>
                      </div>
                      <div className="aip-td aip-td-source" style={{ color: '#60a5fa' }}>{item.risk_score ?? '—'}</div>
                      <div className="aip-td aip-td-time">{item.location_name || '—'}</div>
                      <div className="aip-td aip-td-arrow">›</div>
                    </div>
                  )
                })}
              </div>
              {countryDetails.items.length > DRILL_INITIAL ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 16 }}>
                  <button type="button" className="aip-viewall" onClick={() => setDrillExpanded((v) => !v)}>
                    {drillExpanded ? 'Show less' : `Show ${countryDetails.items.length - DRILL_INITIAL} more`}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p style={{ color: 'rgba(148,163,184,.35)', fontSize: 13 }}>No items found for {countryDetails.country}.</p>
          )}
        </div>

      </div>
    </div>
  )
}
