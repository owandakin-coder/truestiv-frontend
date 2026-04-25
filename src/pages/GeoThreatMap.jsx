import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { Globe2, MapPin, Radar } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

import ExpandableFeed from '../components/ExpandableFeed'
import PortalHero from '../components/PortalHero'
import { useTheme } from '../components/ThemeProvider'
import { api, getErrorMessage } from '../services/api'

function getPalette(theme) {
  const dark = theme !== 'light'
  return {
    dark,
    card: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)',
    border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(15,23,42,0.08)',
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? 'rgba(255,255,255,0.64)' : '#475569',
    subtle: dark ? 'rgba(255,255,255,0.36)' : '#64748b',
    blue: '#38bdf8',
    yellow: '#fbbf24',
    red: '#fb7185',
    green: '#22c55e',
  }
}

function markerColor(level, palette) {
  if (level === 'threat') return palette.red
  if (level === 'suspicious') return palette.yellow
  return palette.green
}

function clusterMarkers(markers) {
  if (!markers.length) return []
  if (markers.length < 30) return markers.map((marker) => ({ ...marker, cluster_count: 1 }))

  const buckets = new Map()
  markers.forEach((marker) => {
    const lat = Number(marker.latitude)
    const lng = Number(marker.longitude)
    const key = `${lat.toFixed(1)}:${lng.toFixed(1)}`
    const current = buckets.get(key)
    if (!current) {
      buckets.set(key, {
        ...marker,
        latitude: lat,
        longitude: lng,
        cluster_count: 1,
        indicators: [marker.indicator],
      })
      return
    }

    current.cluster_count += 1
    current.indicators.push(marker.indicator)
    current.risk_score = Math.max(Number(current.risk_score || 0), Number(marker.risk_score || 0))
    if (String(marker.threat_level || '').toLowerCase() === 'threat') current.threat_level = 'threat'
    else if (
      String(marker.threat_level || '').toLowerCase() === 'suspicious' &&
      String(current.threat_level || '').toLowerCase() !== 'threat'
    ) {
      current.threat_level = 'suspicious'
    }
    current.source = current.cluster_count > 1 ? 'clustered' : current.source
    current.details_path = current.cluster_count > 1 ? '' : current.details_path
  })
  return Array.from(buckets.values())
}

const timeRanges = ['24h', '7d', '30d', '90d', 'all']

export default function GeoThreatMap() {
  const { theme } = useTheme()
  const palette = useMemo(() => getPalette(theme), [theme])
  const [markers, setMarkers] = useState([])
  const [feedMarkers, setFeedMarkers] = useState([])
  const [facets, setFacets] = useState({ sources: [], countries: [], threat_levels: [] })
  const [playbackPoints, setPlaybackPoints] = useState([])
  const [playbackIndex, setPlaybackIndex] = useState(-1)
  const [countryDetails, setCountryDetails] = useState({ country: '', items: [] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(true)
  const [filters, setFilters] = useState({
    source: 'all',
    country: 'all',
    threat_level: 'all',
    time_range: '30d',
  })

  const loadMap = () => {
    let active = true
    setLoading(true)
    setError('')

    api()
      .get('/api/intelligence/geo-map', { params: filters })
      .then(({ data }) => {
        if (!active) return
        setMarkers(data.markers || [])
        setFacets(data.facets || { sources: [], countries: [], threat_levels: [] })
        setPlaybackPoints(data.playback_points || [])
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError, 'Failed to load geo map'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }

  useEffect(() => {
    return loadMap()
  }, [filters])

  useEffect(() => {
    let active = true
    api()
      .get('/api/intelligence/geo-map', {
        params: {
          source: 'all',
          country: 'all',
          threat_level: 'all',
          time_range: filters.time_range,
          limit: 120,
        },
      })
      .then(({ data }) => {
        if (active) setFeedMarkers(data.markers || [])
      })
      .catch(() => {
        if (active) setFeedMarkers([])
      })
    return () => {
      active = false
    }
  }, [filters.time_range, live])

  useEffect(() => {
    if (!live) return undefined
    const interval = setInterval(() => {
      loadMap()
    }, 30000)
    return () => clearInterval(interval)
  }, [live, filters])

  const playbackMarkers = useMemo(() => {
    if (playbackIndex < 0 || !playbackPoints.length) return markers
    const threshold = playbackPoints[Math.min(playbackIndex, playbackPoints.length - 1)]
    return markers.filter((marker) => String(marker.published_at || '').slice(0, 10) <= threshold)
  }, [markers, playbackIndex, playbackPoints])

  const center = useMemo(() => {
    const withCoords = playbackMarkers.filter((marker) => Number.isFinite(Number(marker.latitude)) && Number.isFinite(Number(marker.longitude)))
    if (!withCoords.length) return [20, 0]
    const latitude = withCoords.reduce((sum, marker) => sum + Number(marker.latitude), 0) / withCoords.length
    const longitude = withCoords.reduce((sum, marker) => sum + Number(marker.longitude), 0) / withCoords.length
    return [latitude, longitude]
  }, [playbackMarkers])

  const mapMarkers = useMemo(() => clusterMarkers(playbackMarkers), [playbackMarkers])
  const countryFlows = useMemo(() => {
    const counts = {}
    playbackMarkers.forEach((marker) => {
      const key = marker.country || 'Unknown'
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [playbackMarkers])
  const openCountry = async (country) => {
    try {
      const { data } = await api().get('/api/intelligence/geo-map/country-drilldown', {
        params: { country, time_range: filters.time_range },
      })
      setCountryDetails({ country, items: data.items || [] })
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to load country drilldown'))
    }
  }

  return (
    <div className="map-shell zone-propagation">
      <PortalHero
        kicker="Threat Geography"
        title="Geo Threat Map"
        copy="Real-world threat locations from community indicators and recent scanned IP activity."
        className="map-hero portal-hero-left fade-in"
        actions={
          <>

          </>
        }
      />

      <section className="console-surface propagation-ops-console fade-in-delay-1">
        <div className="console-heading">
          <h2>Propagation Filters and Playback</h2>
        </div>

        <div className="intel-filter-grid">
          <label className="intel-filter-field">
            <span>Source</span>
            <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}>
              <option value="all">ALL</option>
              {(facets.sources || []).map((option) => (
                <option key={option} value={option}>
                  {String(option).toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="intel-filter-field">
            <span>Country</span>
            <select value={filters.country} onChange={(event) => setFilters((current) => ({ ...current, country: event.target.value }))}>
              <option value="all">ALL</option>
              {(facets.countries || []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="intel-filter-field">
            <span>Threat Level</span>
            <select value={filters.threat_level} onChange={(event) => setFilters((current) => ({ ...current, threat_level: event.target.value }))}>
              <option value="all">ALL</option>
              {(facets.threat_levels || []).map((option) => (
                <option key={option} value={option}>
                  {String(option).toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="intel-filter-field">
            <span>Time Range</span>
            <select value={filters.time_range} onChange={(event) => setFilters((current) => ({ ...current, time_range: event.target.value }))}>
              {timeRanges.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>

        {playbackPoints.length ? (
          <div style={{ marginTop: 18 }} className="brief-panel">
            <div className="signal-strip-label">Playback</div>
            <input
              type="range"
              min="-1"
              max={Math.max(playbackPoints.length - 1, 0)}
              value={playbackIndex}
              onChange={(event) => setPlaybackIndex(Number(event.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ color: palette.muted }}>
              {playbackIndex < 0 ? 'Showing all available periods' : `Showing activity up to ${playbackPoints[playbackIndex]}`}
            </div>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="console-status" style={{ borderColor: 'rgba(240,64,64,0.3)', color: palette.red }}>
          {error}
        </div>
      ) : null}

      <div className="map-layout">
        <section className="dossier-surface propagation-map-panel">
          <div className="console-heading" style={{ marginBottom: 16 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Globe2 size={18} color={palette.blue} />
              World Map
            </h2>
            <p>{playbackMarkers.length} live markers, {mapMarkers.length} clustered points, {countryFlows.length} active countries.</p>
          </div>

          <div className="map-canvas">
            <MapContainer center={center} zoom={2} scrollWheelZoom className="map-leaflet">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {mapMarkers.map((marker) => {
                const color = markerColor(marker.threat_level, palette)
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
                        {marker.details_path ? (
                          <a href={marker.details_path} style={{ display: 'inline-block', marginTop: 8 }}>
                            Open IOC details
                          </a>
                        ) : null}
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>
          </div>
        </section>

        <section className="feed-surface propagation-feed-panel">
          <div className="console-heading" style={{ marginBottom: 16 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <MapPin size={18} color={palette.blue} />
              Marker Feed
            </h2>
            <p>This feed stays populated even before filters are applied.</p>
          </div>

          <div className="map-list">
            {loading ? (
              <div className="intel-empty-card" style={{ marginTop: 12 }}>
                Loading marker feed...
              </div>
            ) : null}
            {!loading &&
              <ExpandableFeed
                items={feedMarkers}
                initialCount={5}
                className="map-feed-rail"
                renderItem={(marker) => (
                  <div key={`${marker.indicator}-${marker.published_at}`} className="map-feed-row">
                    <div className="map-feed-severity" style={{ background: markerColor(marker.threat_level, palette) }} />
                    <div className="map-feed-main">
                      <strong>{marker.indicator}</strong>
                      <span className="map-feed-meta">
                        {(marker.location_name || 'Unknown location')} | {String(marker.source || 'intel').toUpperCase()}
                      </span>
                      <p className="map-feed-copy">
                        Risk {marker.risk_score} | {String(marker.threat_level || 'unknown').toUpperCase()}
                      </p>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        {marker.country ? (
                          <button type="button" onClick={() => openCountry(marker.country)} className="intel-inline-link">
                            Drill into {marker.country}
                          </button>
                        ) : null}
                        {marker.details_path ? (
                          <Link className="intel-inline-link" to={marker.details_path}>
                            IOC details
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className="platform-badge"
                      style={{
                        color: markerColor(marker.threat_level, palette),
                        borderColor: `${markerColor(marker.threat_level, palette)}33`,
                        background: `${markerColor(marker.threat_level, palette)}12`,
                      }}
                    >
                      {marker.threat_level}
                    </span>
                  </div>
                )}
              />
            }
            {!loading && !feedMarkers.length ? (
              <div className="intel-empty-card" style={{ marginTop: 12 }}>
                <Radar size={22} color={palette.blue} style={{ marginBottom: 10 }} />
                <div style={{ color: palette.muted }}>
                  No marker feed entries are available yet. Run more IP scans or wait for more intelligence to be collected.
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="fade-in-delay-2">
        <section className="operations-card propagation-drilldown-panel">
          <div className="intel-section-head">
            <div className="intel-eyebrow">
              <MapPin size={14} />
              Country Drilldown
            </div>
            <h2 className="intel-section-title">{countryDetails.country || 'Select a country from the map feed'}</h2>
          </div>
          {countryDetails.items.length ? (
            <ExpandableFeed
              items={countryDetails.items}
              initialCount={5}
              className="flat-rail"
              renderItem={(item) => (
                <article key={`${item.indicator}-${item.published_at}`} className={`flat-rail-row ${String(item.threat_level || 'info').toLowerCase()}`}>
                  <div className="flat-rail-main">
                    <div className="flat-rail-title">{item.indicator}</div>
                    <div className="flat-rail-meta">{item.location_name} | {String(item.source || 'intel').toUpperCase()}</div>
                    <div className="flat-rail-copy">Risk {item.risk_score} | {item.ioc_type}</div>
                  </div>
                  <div className="flat-rail-side">{item.ioc_type}</div>
                  <div className="flat-rail-side">Risk {item.risk_score}</div>
                  <div>
                    <span className="platform-badge" style={{ color: markerColor(item.threat_level, palette), borderColor: `${markerColor(item.threat_level, palette)}33`, background: `${markerColor(item.threat_level, palette)}12` }}>
                      {item.threat_level}
                    </span>
                  </div>
                  <div>
                    {item.details_path ? <Link className="intel-inline-link" to={item.details_path}>IOC details</Link> : null}
                  </div>
                </article>
              )}
            />
          ) : (
            <div className="intel-empty-inline">No country selected yet. Use the marker feed to open a country drilldown.</div>
          )}
        </section>
      </div>
    </div>
  )
}
