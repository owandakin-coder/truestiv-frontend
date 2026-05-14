import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GitBranch, Radar } from 'lucide-react'

import Seo from '../components/Seo'
import { apiRequest } from '../services/api'

function groupColor(group) {
  if (group === 'indicator') return '#60a5fa'
  if (group === 'community') return '#fbbf24'
  if (group === 'analysis')  return '#22c55e'
  if (group === 'tag')       return '#a78bfa'
  if (group === 'media')     return '#f97316'
  return '#94a3b8'
}

export default function CorrelationGraph() {
  const { iocType = '', indicator = '' } = useParams()
  const [payload, setPayload] = useState(null)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    apiRequest(`/api/intelligence/correlation/${encodeURIComponent(iocType)}/${encodeURIComponent(indicator)}`)
      .then((r) => { if (active) setPayload(r) })
      .catch((e) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [iocType, indicator])

  const nodes = payload?.nodes || []
  const indicatorNode = nodes.find((n) => n.group === 'indicator')
  const sideNodes     = nodes.filter((n) => n.group !== 'indicator')

  return (
    <div className="aip-root">
      <Seo
        title={`Trustive AI | Correlation — ${indicator}`}
        description={`Relationship graph for ${iocType?.toUpperCase()} indicator ${indicator} across scans, analyses, community, and actor tags.`}
        path={`/correlation/${iocType}/${indicator}`}
      />
      <div className="grid-dots aip-bg-dots" />
      <div className="aip-inner">

        {/* Hero */}
        <header className="aip-hero fade-in">
          <div className="aip-kicker">
            <span className="aip-kicker-dot" />
            <span className="aip-kicker-text">CORRELATION GRAPH · {String(iocType).toUpperCase()}</span>
          </div>
          <h1 className="aip-title" style={{ fontSize: 'clamp(20px,3.5vw,34px)', wordBreak: 'break-all' }}>
            {indicator}
          </h1>
          <p className="aip-copy">
            Scans, analyses, media findings, community publications, and actor tags linked into one relationship view.
          </p>
        </header>

        {error   ? <p className="aip-error fade-in" style={{ borderColor: 'rgba(240,64,64,.28)', color: '#fca5a5' }}>{error}</p> : null}
        {loading ? <p className="aip-loading">Loading correlation graph…</p> : null}

        {!loading && payload ? (
          <div className="aip-activity fade-in-delay-1">
            <div className="aip-activity-hd">
              <span className="aip-activity-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <GitBranch size={12} />OPERATIONAL RELATIONSHIPS
              </span>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 10, color: 'rgba(148,163,184,.4)' }}>
                {sideNodes.length} nodes
              </span>
            </div>

            {/* Center node */}
            {indicatorNode ? (
              <div className="cg-center-node">
                <div className="cg-center-type">{indicatorNode.type || iocType}</div>
                <strong className="cg-center-label">{indicatorNode.label}</strong>
                {indicatorNode.threat_level ? (
                  <span className="cg-center-level">{indicatorNode.threat_level}</span>
                ) : null}
              </div>
            ) : null}

            {/* Side nodes grid */}
            {sideNodes.length > 0 ? (
              <div className="cg-nodes-grid">
                {sideNodes.map((node) => {
                  const color = groupColor(node.group)
                  return (
                    <div
                      key={node.id}
                      className="cg-node"
                      style={{ borderColor: `${color}33`, background: `${color}08` }}
                    >
                      <div className="cg-node-group" style={{ color }}>{node.group}</div>
                      <strong className="cg-node-label">{node.label}</strong>
                      {node.summary    ? <p className="cg-node-summary">{node.summary}</p> : null}
                      {node.confidence ? (
                        <span className="cg-node-conf" style={{ color: 'rgba(148,163,184,.5)' }}>
                          {Math.round(node.confidence * 100)}% confidence
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '28px 0', color: 'rgba(148,163,184,.4)', fontSize: 13 }}>
                <Radar size={18} />
                No related contexts were found for this indicator yet.
              </div>
            )}

            {/* Back link */}
            <div style={{ marginTop: 24 }}>
              <Link
                className="aip-viewall"
                to={`/ioc/${encodeURIComponent(iocType)}/${encodeURIComponent(indicator)}`}
              >
                ← Back to IOC details
              </Link>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  )
}
