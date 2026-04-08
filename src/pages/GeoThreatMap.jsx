import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { Filter, Globe2, MapPin, Radar } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

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
  const [facets, setFacets] = useState({ sources: [], countries: [], threat_levels: [] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    source: 'all',
    country: 'all',
    threat_level: 'all',
    time_range: '30d',
  })

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    api()
      .get('/api/intelligence/geo-map', { params: filters })
      .then(({ data }) => {
        if (!active) return
        setMarkers(data.markers || [])
        setFacets(data.facets || { sources: [], countries: [], threat_levels: [] })
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
  }, [filters])

  const center = useMemo(() => {
    const withCoords = markers.filter((marker) => Number.isFinite(Number(marker.latitude)) && Number.isFinite(Number(marker.longitude)))
    if (!withCoords.length) return [20, 0]
    const latitude = withCoords.reduce((sum, marker) => sum + Number(marker.latitude), 0) / withCoords.length
    const longitude = withCoords.reduce((sum, marker) => sum + Number(marker.longitude), 0) / withCoords.length
    return [latitude, longitude]
  }, [markers])

  const mapMarkers = useMemo(() => clusterMarkers(markers), [markers])

  return (
    <div className="map-shell">
      <section className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: palette.blue, boxShadow: '0 0 24px rgba(56,189,248,0.35)' }} />
          <span style={{ fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: palette.blue, fontWeight: 800 }}>
            Threat Geography
          </span>
        </div>
        <h1 style={{ fontSize: 42, lineHeight: 1.02, fontWeight: 900, color: palette.text, marginBottom: 12 }}>
          Geo <span className="gradient-text">Threat Map</span>
        </h1>
        <p style={{ color: palette.muted }}>
          Real-world threat locations from community indicators and recent scanned IP activity, with live filters by source, country, threat level, and time range.
        </p>
      </section>

      <section className="map-panel fade-in-delay-1" style={{ background: palette.card, border: palette.border }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Filter size={18} color={palette.blue} />
          <h2 style={{ color: palette.text, fontSize: 20, fontWeight: 900 }}>Map Filters</h2>
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
      </section>

      {error ? (
        <div style={{ padding: '14px 16px', borderRadius: 18, background: 'rgba(255,92,92,0.10)', border: '1px solid rgba(255,92,92,0.18)', color: palette.red, fontWeight: 600 }}>
          {error}
        </div>
      ) : null}

      <div className="map-layout">
        <section className="map-panel" style={{ background: palette.card, border: palette.border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Globe2 size={20} color={palette.blue} />
            <h2 style={{ color: palette.text, fontSize: 22, fontWeight: 900 }}>World Map</h2>
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

        <section className="map-panel" style={{ background: palette.card, border: palette.border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <MapPin size={20} color={palette.blue} />
            <h2 style={{ color: palette.text, fontSize: 22, fontWeight: 900 }}>Marker Feed</h2>
          </div>

          <div className="map-list">
            {loading ? (
              <div className="intel-empty-card" style={{ marginTop: 12 }}>
                Loading filtered threat markers...
              </div>
            ) : null}
            {!loading &&
              markers.map((marker) => (
                <div key={`${marker.indicator}-${marker.published_at}`} className="map-list-item" style={{ border: palette.border }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <strong style={{ color: palette.text }}>{marker.indicator}</strong>
                    <span style={{ color: markerColor(marker.threat_level, palette), fontWeight: 800 }}>{marker.threat_level}</span>
                  </div>
                  <p style={{ color: palette.muted, marginTop: 8 }}>{marker.location_name || 'Unknown location'}</p>
                  <p style={{ color: palette.subtle, marginTop: 6 }}>Risk score: {marker.risk_score} | Source: {marker.source || 'intel'}</p>
                  {marker.details_path ? (
                    <Link className="intel-inline-link" style={{ marginTop: 10, display: 'inline-flex' }} to={marker.details_path}>
                      IOC details
                    </Link>
                  ) : null}
                </div>
              ))}
            {!loading && !markers.length ? (
              <div className="intel-empty-card" style={{ marginTop: 12 }}>
                <Radar size={22} color={palette.blue} style={{ marginBottom: 10 }} />
                <div style={{ color: palette.muted }}>
                  No markers available for the current filters. Try widening the time range or running more IP scans.
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
