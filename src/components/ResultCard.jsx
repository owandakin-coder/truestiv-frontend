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
      badgeLabel: 'Threat',
      explainer: 'This destination is strongly associated with phishing or malicious behavior.',
    }
  }
  if (level === 'suspicious') {
    return {
      icon: <Eye size={26} />,
      color: palette.yellow,
      label: 'Suspicious',
      badgeLabel: 'Suspicious',
      explainer: 'Suspicious patterns were found and this result should be reviewed before it is trusted.',
    }
  }
  return {
    icon: <CheckCircle2 size={26} />,
    color: palette.green,
    label: 'Safe',
    badgeLabel: 'Safe',
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

function buildSummaryRows(result, type, sourceCount) {
  const rows = [['Summary', result.summary || 'No summary provided.']]

  if (type === 'hash') {
    rows.push(['Detections', `${result.positives ?? 0} / ${result.total ?? 0}`])
    rows.push(['Recommendation', result.recommendation || 'allow'])
  } else if (type === 'url') {
    rows.push(['Confidence', `${result.confidence ?? result.risk_score ?? 0}%`])
    rows.push(['Recommendation', result.recommendation || 'allow'])
  } else if (type === 'ip') {
    rows.push(['Recommendation', result.recommendation || 'allow'])
    rows.push(['Intelligence sources', String(sourceCount)])
  } else if (type === 'file') {
    rows.push(['Recommendation', result.recommendation || 'allow'])
    rows.push(['Detected type', result.file_type || result.detected_type || 'Unknown'])
  }

  return rows
}

function buildGeoRows(geo) {
  const country = geo.country && String(geo.country).trim().toLowerCase() !== 'country' ? geo.country : ''
  const city = geo.city || geo.region || ''
  const organization = geo.organization || geo.org || geo.isp || ''
  const rows = [
    ['Country', country],
    ['City / Region', city],
    ['Organization', organization],
    ['ASN', geo.asn || ''],
  ]

  return rows.filter(([, value]) => {
    if (!value) return false
    const normalized = String(value).trim().toLowerCase()
    return normalized && normalized !== 'unknown' && normalized !== 'n/a'
  })
}

function buildSignalLabels(result) {
  const raw = Array.isArray(result.indicators) ? result.indicators : []
  return raw
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .slice(0, 4)
}

function formatSignalLabel(signal) {
  if (signal.includes(':')) {
    const [label, ...rest] = signal.split(':')
    return {
      title: label.trim(),
      value: rest.join(':').trim(),
      hint: 'Provider field from upstream intelligence. Use it as supporting context rather than a final verdict.',
    }
  }

  return {
    title: signal,
    value: '',
    hint: 'Provider-derived intelligence label. Treat this as context that supports the overall risk score.',
  }
}

export default function ResultCard({ result, type, theme = 'dark' }) {
  if (!result) return null

  const palette = getPalette(theme)
  const level = getLevelConfig(result.threat_level, palette)
  const score = Math.max(0, Math.min(100, Number(getScore(result, type) || 0)))
  const identifier = getIdentifier(result, type)
  const vtLink = result.permalink
  const sourceCount = Array.isArray(result.sources) ? result.sources.length : 0
  const summaryRows = buildSummaryRows(result, type, sourceCount)
  const geoRows = type === 'ip' ? buildGeoRows(result.geo || {}) : []
  const signalLabels = buildSignalLabels(result)

  return (
    <article className="result-report-card fade-in">
      <div className="result-report-progress-track" aria-hidden="true">
        <div
          className="result-report-progress-fill"
          style={{ width: `${score}%`, background: level.color }}
        />
      </div>

      <header className="result-report-header">
        <div className="result-report-summary">
          <div className="result-report-kicker">
            <TypeIcon type={type} color={level.color} />
            <span>{getTypeLabel(type)}</span>
          </div>

          <div className="result-report-status-line">
            <div
              className="result-report-status-icon"
              style={{ color: level.color, borderColor: `${level.color}55` }}
            >
              {level.icon}
            </div>
            <div className="result-report-status-copy">
              <span
                className="result-report-status-badge"
                style={{ color: level.color, borderColor: `${level.color}55`, background: `${level.color}14` }}
              >
                {level.badgeLabel}
              </span>
              <h3 className="result-report-title">{identifier}</h3>
              <p className="result-report-description">{level.explainer}</p>
            </div>
          </div>
        </div>

        <aside className="result-report-score-card">
          <div className="result-report-score-topline">
            <span>Risk Score</span>
            <strong style={{ color: level.color }}>{score}%</strong>
          </div>
          <div className="result-report-score-bar">
            <div className="result-report-score-bar-fill" style={{ width: `${score}%`, background: level.color }} />
          </div>
          <p className="result-report-score-copy">
            {type === 'ip'
              ? `IP analyzed across ${sourceCount || 0} intelligence sources.`
              : 'Verdict reflects the strongest risk signal found in this scan.'}
          </p>
        </aside>
      </header>

      <div className="result-report-grid">
        <section className="result-report-panel">
          <div className="result-report-panel-label">Entity</div>
          <div className="result-report-identifier">{identifier}</div>
          {vtLink ? (
            <a
              href={vtLink}
              target="_blank"
              rel="noreferrer"
              className="result-report-link"
            >
              Open source context <ExternalLink size={14} />
            </a>
          ) : null}
        </section>

        <section className="result-report-panel">
          <div className="result-report-panel-label">Scan summary</div>
          <div className="result-report-table">
            {summaryRows.map(([label, value]) => (
              <div key={label} className="result-report-row">
                <div className="result-report-key">{label}</div>
                <div className="result-report-value">{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {(signalLabels.length || geoRows.length) ? (
        <div className="result-report-grid result-report-grid-secondary">
          {signalLabels.length ? (
            <section className="result-report-panel">
              <div className="result-report-panel-label">Threat labels and intelligence hints</div>
              <div className="result-report-chip-grid">
                {signalLabels.map((signal, index) => {
                  const formatted = formatSignalLabel(signal)
                  return (
                    <div key={`${signal}-${index}`} className="result-report-chip" title={formatted.hint}>
                      <strong>{formatted.title}</strong>
                      {formatted.value ? <span>{formatted.value}</span> : null}
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {geoRows.length ? (
            <section className="result-report-panel">
              <div className="result-report-panel-label">Geolocation and network</div>
              <div className="result-report-table">
                {geoRows.map(([label, value]) => (
                  <div key={label} className="result-report-row">
                    <div className="result-report-key">{label}</div>
                    <div className="result-report-value">{value}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
