import { useEffect, useMemo, useState } from 'react'
import { Globe2, MapPin, Radar } from 'lucide-react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
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
    red: '#ff5c5c',
    green: '#22c55e',
  }
}

function markerColor(level, palette) {
  if (level === 'threat') return palette.red
  if (level === 'suspicious') return palette.yellow
  return palette.green
}

export default function GeoThreatMap() {
  const { theme } = useTheme()
  const palette = useMemo(() => getPalette(theme), [theme])
  const [markers, setMarkers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api().get('/api/intelligence/geo-map')
      .then(({ data }) => {
        if (active) setMarkers(data.markers || [])
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError, 'Failed to load geo map'))
      })
    return () => {
      active = false
    }
  }, [])

  const center = useMemo(() => {
    const withCoords = markers.filter((marker) => Number.isFinite(Number(marker.latitude)) && Number.isFinite(Number(marker.longitude)))
    if (!withCoords.length) return [20, 0]
    const latitude = withCoords.reduce((sum, marker) => sum + Number(marker.latitude), 0) / withCoords.length
    const longitude = withCoords.reduce((sum, marker) => sum + Number(marker.longitude), 0) / withCoords.length
    return [latitude, longitude]
  }, [markers])

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
          Real-world threat locations from community indicators and recent scanned IP activity, including named cities and countries when available.
        </p>
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
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {markers.map((marker) => {
                const color = markerColor(marker.threat_level, palette)
                return (
                  <CircleMarker
                    key={`${marker.indicator}-${marker.latitude}-${marker.longitude}`}
                    center={[Number(marker.latitude), Number(marker.longitude)]}
                    radius={Math.max(6, Math.min(14, Number(marker.risk_score || 24) / 8))}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: 2 }}
                  >
                    <Popup>
                      <div style={{ minWidth: 180 }}>
                        <strong>{marker.indicator}</strong>
                        <div>{marker.location_name || 'Unknown location'}</div>
                        <div>Risk: {marker.risk_score}</div>
                        <div>Level: {marker.threat_level}</div>
                        <div>Source: {marker.source || 'intel'}</div>
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
            {markers.map((marker) => (
              <div key={`${marker.indicator}-${marker.published_at}`} className="map-list-item" style={{ border: palette.border }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <strong style={{ color: palette.text }}>{marker.indicator}</strong>
                  <span style={{ color: markerColor(marker.threat_level, palette), fontWeight: 800 }}>{marker.threat_level}</span>
                </div>
                <p style={{ color: palette.muted, marginTop: 8 }}>{marker.location_name || 'Unknown location'}</p>
                <p style={{ color: palette.subtle, marginTop: 6 }}>Risk score: {marker.risk_score} | Source: {marker.source || 'intel'}</p>
              </div>
            ))}
            {!markers.length ? (
              <div className="intel-empty-card" style={{ marginTop: 12 }}>
                <Radar size={22} color={palette.blue} style={{ marginBottom: 10 }} />
                <div style={{ color: palette.muted }}>
                  No markers available yet. Run IP scans or wait for automated intelligence collection to surface geolocated IPs.
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
