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
    panel: dark ? '#101a2a' : 'rgba(255,255,255,0.97)',
    panelStrong: dark ? '#131f31' : '#ffffff',
    border: dark ? '1px solid rgba(0,229,255,0.14)' : '1px solid rgba(15,23,42,0.08)',
    text: dark ? '#E0E0E0' : '#0f172a',
    muted: dark ? 'rgba(224,224,224,0.82)' : '#475569',
    subtle: dark ? 'rgba(0,229,255,0.64)' : '#64748b',
    orange: '#f59e0b',
    green: '#22c55e',
    yellow: '#f59e0b',
    red: '#ef4444',
    blue: '#00E5FF',
  }
}

function getLevelConfig(level, palette) {
  if (level === 'threat') {
    return {
      icon: <AlertTriangle size={26} />,
      color: palette.red,
      label: 'Phishing',
      tint: 'rgba(239,68,68,0.14)',
      explainer: 'This destination is strongly associated with phishing or malicious behavior.',
    }
  }
  if (level === 'suspicious') {
    return {
      icon: <Eye size={26} />,
      color: palette.yellow,
      label: 'Suspicious',
      tint: 'rgba(245,158,11,0.14)',
      explainer: 'Suspicious patterns were found and this result should be reviewed before trust.',
    }
  }
  return {
    icon: <CheckCircle2 size={26} />,
    color: palette.green,
    label: 'Safe',
    tint: 'rgba(34,197,94,0.14)',
    explainer: 'No strong malicious signal was detected in this scan result.',
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
        borderRadius: 18,
        padding: 20,
        boxShadow: '0 16px 32px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: level.color,
          marginBottom: 18,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 16,
          padding: 16,
          borderRadius: 14,
          background: level.tint,
          border: `1px solid ${level.color}55`,
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
            <h3 style={{ color: palette.text, fontSize: 24, fontWeight: 700, fontFamily: 'Poppins, Inter, sans-serif' }}>
              {level.label}
            </h3>
            <p style={{ color: palette.muted, fontSize: 13, lineHeight: 1.55, marginTop: 6, maxWidth: 420 }}>
              {level.explainer}
            </p>
          </div>
        </div>

        <div style={{ minWidth: 140 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: palette.subtle, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5, textTransform: 'uppercase' }}>Risk Score</span>
            <strong style={{ color: level.color, fontFamily: 'JetBrains Mono, monospace' }}>{score}%</strong>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: palette.dark ? '#0b1523' : 'rgba(15,23,42,0.08)' }}>
            <div
              style={{
                width: `${score}%`,
                height: '100%',
                borderRadius: 999,
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
                fontFamily: 'Inter, sans-serif',
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
