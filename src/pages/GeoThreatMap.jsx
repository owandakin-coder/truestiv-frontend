import { useEffect, useMemo, useState } from 'react'
import { Globe2, MapPin } from 'lucide-react'

import { useTheme } from '../components/ThemeProvider'
import { api } from '../services/api'

function getPalette(theme) {
  const dark = theme !== 'light'
  return {
    dark,
    card: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)',
    border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(15,23,42,0.08)',
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? 'rgba(255,255,255,0.64)' : '#475569',
    subtle: dark ? 'rgba(255,255,255,0.36)' : '#64748b',
    orange: '#ff6b35',
    yellow: '#fbbf24',
    red: '#ff5c5c',
    green: '#00e5a0',
  }
}

function markerColor(level, palette) {
  if (level === 'threat') return palette.red
  if (level === 'suspicious') return palette.yellow
  return palette.green
}

function projectPosition(latitude, longitude) {
  const x = ((Number(longitude) + 180) / 360) * 100
  const y = ((90 - Number(latitude)) / 180) * 100
  return { left: `${x}%`, top: `${y}%` }
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
        if (active) setError(requestError.response?.data?.detail || requestError.message || 'Failed to load geo map')
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: palette.orange, boxShadow: '0 0 24px rgba(255,107,53,0.35)' }} />
          <span style={{ fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: palette.orange, fontWeight: 800 }}>
            Threat Geography
          </span>
        </div>
        <h1 style={{ fontSize: 42, lineHeight: 1.02, fontWeight: 900, color: palette.text, marginBottom: 12 }}>
          Geo <span className="gradient-text">Threat Map</span>
        </h1>
        <p style={{ color: palette.muted }}>
          Lightweight world-map projection that keeps production builds free of extra map runtime dependencies.
        </p>
      </section>

      {error && (
        <div style={{ padding: '14px 16px', borderRadius: 18, background: 'rgba(255,92,92,0.10)', border: '1px solid rgba(255,92,92,0.18)', color: palette.red, fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div className="analysis-layout">
        <section style={{ background: palette.card, border: palette.border, borderRadius: 24, padding: 24, backdropFilter: 'blur(20px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <Globe2 size={20} color={palette.orange} />
            <h2 style={{ color: palette.text, fontSize: 22, fontWeight: 900 }}>Projected World Map</h2>
          </div>

          <div
            style={{
              position: 'relative',
              minHeight: 420,
              borderRadius: 24,
              overflow: 'hidden',
              background:
                'radial-gradient(circle at 30% 30%, rgba(255,107,53,0.18), transparent 22%), radial-gradient(circle at 70% 35%, rgba(96,165,250,0.18), transparent 18%), radial-gradient(circle at 50% 65%, rgba(0,229,160,0.16), transparent 18%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
              border: palette.border,
            }}
          >
            <div style={{ position: 'absolute', inset: '12% 8%', borderRadius: '50%', border: palette.border, opacity: 0.45 }} />
            <div style={{ position: 'absolute', inset: '22% 18%', borderRadius: '50%', border: palette.border, opacity: 0.28 }} />
            <div style={{ position: 'absolute', inset: '35% 28%', borderRadius: '50%', border: palette.border, opacity: 0.18 }} />

            {markers.map((marker) => {
              const position = projectPosition(marker.latitude, marker.longitude)
              const color = markerColor(marker.threat_level, palette)
              return (
                <div
                  key={`${marker.indicator}-${marker.latitude}-${marker.longitude}`}
                  title={`${marker.indicator} • ${marker.country}`}
                  style={{
                    position: 'absolute',
                    ...position,
                    transform: 'translate(-50%, -50%)',
                    width: Math.max(12, Math.min(28, (marker.risk_score || 30) / 4)),
                    height: Math.max(12, Math.min(28, (marker.risk_score || 30) / 4)),
                    borderRadius: '50%',
                    background: `${color}33`,
                    border: `2px solid ${color}`,
                    boxShadow: `0 0 24px ${color}66`,
                  }}
                />
              )
            })}
          </div>
        </section>

        <section style={{ background: palette.card, border: palette.border, borderRadius: 24, padding: 24, backdropFilter: 'blur(20px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <MapPin size={20} color={palette.orange} />
            <h2 style={{ color: palette.text, fontSize: 22, fontWeight: 900 }}>Live Marker Feed</h2>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {markers.map((marker) => (
              <div key={`${marker.indicator}-${marker.published_at}`} style={{ padding: 16, borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: palette.border }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <strong style={{ color: palette.text }}>{marker.indicator}</strong>
                  <span style={{ color: markerColor(marker.threat_level, palette), fontWeight: 800 }}>{marker.threat_level}</span>
                </div>
                <p style={{ color: palette.muted, marginTop: 8 }}>{marker.city}, {marker.country}</p>
                <p style={{ color: palette.subtle, marginTop: 6 }}>Risk score: {marker.risk_score}</p>
              </div>
            ))}
            {markers.length === 0 && (
              <p style={{ color: palette.muted }}>No markers available yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
