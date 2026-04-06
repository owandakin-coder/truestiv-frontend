import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import { apiRequest } from '../services/api'

function markerColor(level) {
  if (level === 'threat') return '#ef4444'
  if (level === 'suspicious') return '#f59e0b'
  return '#10b981'
}

export default function GeoThreatMap() {
  const [markers, setMarkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    apiRequest('/api/intelligence/geo-map')
      .then((payload) => {
        if (mounted) setMarkers(payload.markers || [])
      })
      .catch((err) => {
        if (mounted) setError(err.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <section className="platform-page">
      <div className="platform-hero">
        <div>
          <p className="platform-eyebrow">Priority 1</p>
          <h1>Geographic Threat Map</h1>
          <p>
            View IP-based community threats on a world map with live geolocation markers.
          </p>
        </div>
      </div>

      {error && <div className="platform-alert error">{error}</div>}

      <div className="platform-grid two-up">
        <article className="platform-panel">
          <h3>Map View</h3>
          {loading ? (
            <p>Loading threat coordinates...</p>
          ) : (
            <MapContainer center={[25, 10]} zoom={2} scrollWheelZoom className="intel-map">
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {markers.map((marker) => (
                <CircleMarker
                  key={`${marker.indicator}-${marker.latitude}-${marker.longitude}`}
                  center={[marker.latitude, marker.longitude]}
                  radius={Math.max(6, (marker.risk_score || 25) / 8)}
                  pathOptions={{
                    color: markerColor(marker.threat_level),
                    fillColor: markerColor(marker.threat_level),
                    fillOpacity: 0.55,
                  }}
                >
                  <Popup>
                    <strong>{marker.indicator}</strong>
                    <p>{marker.city}, {marker.country}</p>
                    <p>{marker.organization || marker.isp || 'Unknown network'}</p>
                    <p>Risk score: {marker.risk_score}</p>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </article>

        <article className="platform-panel">
          <h3>Marker Feed</h3>
          <div className="platform-list">
            {markers.map((marker) => (
              <div key={`${marker.indicator}-${marker.published_at}`} className="platform-list-item">
                <div>
                  <strong>{marker.indicator}</strong>
                  <p>{marker.city}, {marker.country}</p>
                </div>
                <span className={`platform-badge ${marker.threat_level}`}>{marker.threat_level}</span>
              </div>
            ))}
            {!loading && markers.length === 0 && <p>No geolocated IP threats available yet.</p>}
          </div>
        </article>
      </div>
    </section>
  )
}
