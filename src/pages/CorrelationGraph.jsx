import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GitBranch, Radar } from 'lucide-react'

import { useTheme } from '../components/ThemeProvider'
import { apiRequest } from '../services/api'

function paletteFor(theme) {
  const dark = theme !== 'light'
  return {
    text: dark ? '#eff6ff' : '#0f172a',
    muted: dark ? 'rgba(191,219,254,0.72)' : '#475569',
    blue: '#38bdf8',
    yellow: '#fbbf24',
    red: '#fb7185',
    green: '#22c55e',
  }
}

function groupColor(group, palette) {
  if (group === 'indicator') return palette.blue
  if (group === 'community') return palette.yellow
  if (group === 'analysis') return palette.green
  if (group === 'tag') return '#a78bfa'
  if (group === 'media') return '#f97316'
  return '#94a3b8'
}

export default function CorrelationGraph() {
  const { theme } = useTheme()
  const palette = useMemo(() => paletteFor(theme), [theme])
  const { iocType = '', indicator = '' } = useParams()
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiRequest(`/api/intelligence/correlation/${encodeURIComponent(iocType)}/${encodeURIComponent(indicator)}`)
      .then((response) => {
        if (active) setPayload(response)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [iocType, indicator])

  const nodes = payload?.nodes || []
  const indicatorNode = nodes.find((node) => node.group === 'indicator')
  const sideNodes = nodes.filter((node) => node.group !== 'indicator')

  return (
    <section className="intel-shell">
      <div className="intel-hero-card fade-in">
        <div className="intel-hero-content">
          <div className="intel-eyebrow">
            <span className="intel-eyebrow-dot" />
            Correlation Graph
          </div>
          <h1 className="intel-title">How this indicator connects across Trustive AI.</h1>
          <p className="intel-copy">
            This view links scans, analyses, media findings, community publications, and actor tags into one relationship graph.
          </p>
        </div>
      </div>

      {loading ? <div className="intel-empty-card">Loading correlation graph...</div> : null}
      {error ? <div className="intel-empty-card">{error}</div> : null}

      {!loading && !!payload ? (
        <section className="intel-section-card fade-in-delay-1">
          <div className="intel-section-head">
            <div className="intel-eyebrow">
              <GitBranch size={14} />
              Graph
            </div>
            <h2 className="intel-section-title">Operational relationships</h2>
            <p className="intel-section-copy">
              The center node is the IOC. Surrounding nodes represent where it was seen, how it was tagged, and which workflows it entered.
            </p>
          </div>

          <div className="correlation-shell">
            <div className="correlation-center">
              {indicatorNode ? (
                <article className="correlation-node correlation-node-primary">
                  <div className="correlation-node-type">{indicatorNode.type}</div>
                  <strong>{indicatorNode.label}</strong>
                  <span>{indicatorNode.threat_level}</span>
                </article>
              ) : null}
            </div>
            <div className="correlation-grid">
              {sideNodes.map((node) => (
                <article
                  key={node.id}
                  className="correlation-node"
                  style={{
                    borderColor: `${groupColor(node.group, palette)}33`,
                    background: `${groupColor(node.group, palette)}10`,
                  }}
                >
                  <div className="correlation-node-type" style={{ color: groupColor(node.group, palette) }}>
                    {node.group}
                  </div>
                  <strong>{node.label}</strong>
                  {node.summary ? <span>{node.summary}</span> : null}
                  {node.confidence ? <span>Confidence {Math.round(node.confidence * 100)}%</span> : null}
                </article>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <Link className="intel-inline-link" to={`/ioc/${encodeURIComponent(iocType)}/${encodeURIComponent(indicator)}`}>
              Back to IOC details
            </Link>
          </div>
        </section>
      ) : null}

      {!loading && payload && !sideNodes.length ? (
        <div className="intel-empty-card">
          <Radar size={20} color={palette.blue} style={{ marginBottom: 8 }} />
          No related contexts were found for this indicator yet.
        </div>
      ) : null}
    </section>
  )
}
