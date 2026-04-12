import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  Globe,
  Hash,
  Link2,
  ShieldAlert,
} from 'lucide-react'

function getPalette(theme) {
  const dark = theme !== 'light'
  return {
    dark,
    panel: dark ? '#07101f' : 'rgba(255,255,255,0.95)',
    panelStrong: dark ? '#08111f' : '#ffffff',
    border: dark ? '1px solid #0e2040' : '1px solid rgba(15,23,42,0.08)',
    text: dark ? '#e8f2ff' : '#0f172a',
    muted: dark ? '#c8d8f0' : '#475569',
    subtle: dark ? '#4a7ab5' : '#64748b',
    orange: '#5ba3f5',
    green: '#22c55e',
    yellow: '#f59e0b',
    red: '#f04040',
    blue: '#5ba3f5',
  }
}

function getLevelConfig(level, palette) {
  if (level === 'threat') {
    return {
      icon: <AlertTriangle size={26} />,
      color: palette.red,
      label: 'Threat',
      tint: 'rgba(255,92,92,0.12)',
    }
  }
  if (level === 'suspicious') {
    return {
      icon: <Eye size={26} />,
      color: palette.yellow,
      label: 'Suspicious',
      tint: 'rgba(251,191,36,0.12)',
    }
  }
  return {
    icon: <CheckCircle2 size={26} />,
    color: palette.green,
    label: 'Safe',
    tint: 'rgba(0,229,160,0.12)',
  }
}

function getTypeLabel(type) {
  if (type === 'url') return 'URL Scan'
  if (type === 'ip') return 'IP Reputation'
  if (type === 'hash') return 'Hash Scan'
  if (type === 'file') return 'File Scan'
  return 'Scan Result'
}

function getIdentifier(result, type) {
  if (type === 'url') return result.url
  if (type === 'ip') return result.ip
  if (type === 'hash') return result.hash
  if (type === 'file') return result.filename
  return result.indicator || 'Unknown'
}

function getScore(result, type) {
  if (type === 'ip') return result.aggregated_score ?? result.risk_score ?? 0
  if (type === 'hash') return result.risk_score ?? 0
  return result.risk_score ?? result.confidence ?? 0
}

function TypeIcon({ type, color }) {
  if (type === 'url') return <Link2 size={16} color={color} />
  if (type === 'ip') return <Globe size={16} color={color} />
  if (type === 'hash') return <Hash size={16} color={color} />
  return <ShieldAlert size={16} color={color} />
}

function DetailRow({ label, value, palette }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 120px) minmax(0, 1fr)',
        gap: 12,
        alignItems: 'start',
      }}
    >
      <span style={{ color: palette.subtle }}>{label}</span>
      <span
        style={{
          color: palette.text,
          textAlign: 'right',
          minWidth: 0,
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function buildSummaryRows(result, type, score, sourceCount) {
  const rows = [
    ['Threat level', String(result.threat_level || 'unknown').toUpperCase()],
    ['Risk score', `${score}%`],
    ['Summary', result.summary || 'No summary provided.'],
  ]

  if (type === 'hash') {
    rows.push(['Detections', `${result.positives ?? 0} / ${result.total ?? 0}`])
    rows.push(['Recommendation', result.recommendation || 'allow'])
  } else if (type === 'url') {
    rows.push(['Confidence', `${result.confidence ?? score}%`])
    rows.push(['Recommendation', result.recommendation || 'allow'])
  } else if (type === 'ip') {
    rows.push(['Recommendation', result.recommendation || 'allow'])
    rows.push(['Sources', String(sourceCount)])
  } else if (type === 'file') {
    rows.push(['Recommendation', result.recommendation || 'allow'])
    rows.push(['Detected type', result.file_type || result.detected_type || 'Unknown'])
  }

  return rows
}

export default function ResultCard({ result, type, theme = 'dark' }) {
  if (!result) return null

  const palette = getPalette(theme)
  const level = getLevelConfig(result.threat_level, palette)
  const score = Math.max(0, Math.min(100, Number(getScore(result, type) || 0)))
  const identifier = getIdentifier(result, type)
  const vtLink = result.permalink
  const geo = result.geo || {}
  const sourceCount = Array.isArray(result.sources) ? result.sources.length : 0
  const summaryRows = buildSummaryRows(result, type, score, sourceCount)

  return (
    <article
      className="fade-in"
      style={{
        background: palette.panel,
        border: palette.border,
        borderRadius: 10,
        padding: 18,
        boxShadow: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 16,
          padding: 14,
          borderRadius: 8,
          background: palette.panelStrong,
          border: `1px solid ${level.color}33`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              color: level.color,
              background: palette.panelStrong,
              border: `1px solid ${level.color}33`,
            }}
          >
            {level.icon}
          </div>
          <div>
            <p style={{ color: palette.subtle, fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'JetBrains Mono, monospace' }}>
              {getTypeLabel(type)}
            </p>
            <h3 style={{ color: palette.text, fontSize: 20, fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}>
              {level.label}
            </h3>
          </div>
        </div>

        <div style={{ minWidth: 140 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: palette.subtle, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5, textTransform: 'uppercase' }}>Risk Score</span>
            <strong style={{ color: level.color, fontFamily: 'JetBrains Mono, monospace' }}>{score}%</strong>
          </div>
          <div style={{ height: 8, borderRadius: 2, background: palette.dark ? '#0a1828' : 'rgba(15,23,42,0.08)' }}>
            <div
              style={{
                width: `${score}%`,
                height: '100%',
                borderRadius: 2,
                background: level.color,
              }}
            />
          </div>
        </div>
      </div>

      <div className="scanner-result-grid">
        <section
          style={{
            background: palette.panelStrong,
            border: palette.border,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TypeIcon type={type} color={palette.orange} />
            <span style={{ color: palette.subtle, fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2 }}>
              Identifier
            </span>
          </div>
          <div style={{ color: palette.text, fontSize: 12, lineHeight: 1.8, wordBreak: 'break-word', fontFamily: 'JetBrains Mono, monospace' }}>
            {identifier}
          </div>
          {vtLink && (
            <a
              href={vtLink}
              target="_blank"
              rel="noreferrer"
              style={{
                marginTop: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: palette.blue,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Open in VirusTotal <ExternalLink size={14} />
            </a>
          )}
        </section>

        <section
          style={{
            background: palette.panelStrong,
            border: palette.border,
            borderRadius: 8,
            padding: 16,
            display: 'grid',
            gap: 12,
          }}
        >
          <span style={{ color: palette.subtle, fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2 }}>
            Result Breakdown
          </span>
          <div className="intel-result-table">
            {summaryRows.map(([label, value]) => (
              <div key={label} className="intel-result-row">
                <div className="intel-result-key">{label}</div>
                <div className="intel-result-value">{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {type === 'ip' && (
        <section
          style={{
            marginTop: 18,
            background: palette.panelStrong,
            border: palette.border,
            borderRadius: 8,
            padding: 16,
            display: 'grid',
            gap: 10,
          }}
        >
          <span style={{ color: palette.subtle, fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2 }}>
            Geolocation and Network
          </span>
          <div className="intel-result-table">
            {[
              ['Country', geo.country || 'Unknown'],
              ['City', geo.city || 'Unknown'],
              ['ISP', geo.isp || 'Unknown'],
              ['Organization', geo.organization || geo.org || 'Unknown'],
              ['ASN', geo.asn || 'Unknown'],
            ].map(([label, value]) => (
              <div key={label} className="intel-result-row">
                <div className="intel-result-key">{label}</div>
                <div className="intel-result-value">{value}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(result.indicators) && result.indicators.length > 0 && (
        <section
          style={{
            marginTop: 18,
            background: palette.panelStrong,
            border: palette.border,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <span style={{ color: palette.subtle, fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2 }}>
            Indicators
          </span>
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {result.indicators.map((indicator, index) => (
              <div
                key={`${indicator}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  color: palette.muted,
                  lineHeight: 1.6,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    marginTop: 8,
                    borderRadius: '50%',
                    background: level.color,
                    flexShrink: 0,
                  }}
                />
                <span>{indicator}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
