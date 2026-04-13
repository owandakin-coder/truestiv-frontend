import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AudioLines,
  ChevronDown,
  ChevronUp,
  FileImage,
  Film,
  Loader2,
  ScanSearch,
  Sparkles,
  UploadCloud,
  Zap,
} from 'lucide-react'

import ResultCard from '../components/ResultCard'
import ExpandableFeed from '../components/ExpandableFeed'
import IntelEmptyState from '../components/IntelEmptyState'
import SignalStrip from '../components/SignalStrip'
import { useTheme } from '../components/ThemeProvider'
import { api, getErrorMessage } from '../services/api'
import {
  buildCommunityPayload,
  extractIocsFromText,
  flattenIocs,
  getPrimaryIndicator,
  normalizeThreatLevel,
} from '../utils/intelTools'

const mediaTabs = [
  { id: 'image', label: 'Image', icon: FileImage },
  { id: 'video', label: 'Video', icon: Film },
  { id: 'audio', label: 'Audio', icon: AudioLines },
]

function paletteFor(theme) {
  const dark = theme !== 'light'
  return {
    dark,
    card: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)',
    cardStrong: dark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(15,23,42,0.08)',
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? 'rgba(255,255,255,0.64)' : '#475569',
    subtle: dark ? 'rgba(255,255,255,0.36)' : '#64748b',
    orange: '#38bdf8',
    green: '#22c55e',
  }
}

function isActionable(level) {
  return ['suspicious', 'threat', 'dangerous'].includes(String(level || '').toLowerCase())
}

export default function MediaLab({ embedded = false }) {
  const { theme } = useTheme()
  const palette = useMemo(() => paletteFor(theme), [theme])
  const inputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('image')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [publishState, setPublishState] = useState({ status: 'idle', message: '' })
  const [pivot, setPivot] = useState({ loading: false, error: '', result: null, type: 'url', value: '' })
  const [focusMode, setFocusMode] = useState(true)

  const loadHistory = async () => {
    try {
      const { data } = await api().get('/api/media/history')
      setHistory((data?.items || []).filter((item) => isActionable(item?.threat_level)))
    } catch {
      setHistory([])
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const runAnalysis = async (selectedFile) => {
    if (!selectedFile) return
    setLoading(true)
    setError('')
    setResult(null)
    setPublishState({ status: 'idle', message: '' })

    const payload = new FormData()
    payload.append('media_type', activeTab)
    payload.append('file', selectedFile)

    try {
      const { data } = await api().post('/api/media/analyze', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      setFocusMode(true)
      if (isActionable(data?.threat_level)) {
        await loadHistory()
      }
    } catch (requestError) {
      setResult(null)
      setPivot({ loading: false, error: '', result: null, type: 'url', value: '' })
      setError(getErrorMessage(requestError, 'Media analysis failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const onFileSelected = async (selectedFile) => {
    setFile(selectedFile)
    await runAnalysis(selectedFile)
  }

  const iocs = useMemo(() => flattenIocs(extractIocsFromText(result?.ocr_text, result?.summary, file?.name)), [result, file])
  const FocusIcon = focusMode ? ChevronDown : ChevronUp
  const stripItems = [
    { label: 'Media Type', value: activeTab.toUpperCase(), copy: 'Current analysis lane' },
    { label: 'Recent Runs', value: history.length, copy: 'Suspicious and threat only', live: true },
    { label: 'Verdict', value: result ? normalizeThreatLevel(result.threat_level) : 'Waiting', copy: 'Current result state' },
    { label: 'Deepfake', value: result ? `${result.deepfake_score || 0}%` : 'Pending', copy: 'Current deepfake score' },
    { label: 'Artifacts', value: iocs.length, copy: 'Extracted OCR-driven pivots' },
  ]

  const runPivot = async (item) => {
    const config =
      item.type === 'ip'
        ? { path: '/api/scanner/ip/enhanced', body: { ip: item.value }, type: 'ip' }
        : item.type === 'hash'
          ? { path: '/api/scanner/hash', body: { hash: item.value }, type: 'hash' }
          : { path: '/api/scanner/url', body: { url: item.type === 'domain' ? `https://${item.value}` : item.value }, type: 'url' }

    setPivot({ loading: true, error: '', result: null, type: config.type, value: item.value })
    try {
      const response = await api().post(config.path, config.body)
      setPivot({ loading: false, error: '', result: response.data, type: config.type, value: item.value })
    } catch (requestError) {
      setPivot({
        loading: false,
        error: getErrorMessage(requestError, 'Unable to enrich this artifact right now.'),
        result: null,
        type: config.type,
        value: item.value,
      })
    }
  }

  const publishThreat = async () => {
    if (!result) return
    const indicator = getPrimaryIndicator('media', result, file?.name || '')
    if (!indicator) return

    setPublishState({ status: 'loading', message: '' })
    try {
      await api().post(
        '/api/community/publish-threat',
        buildCommunityPayload({
          indicator,
          threatType: 'file',
          result,
        })
      )
      setPublishState({ status: 'success', message: 'Media finding promoted to the community feed.' })
    } catch (requestError) {
      setPublishState({
        status: 'error',
        message: getErrorMessage(requestError, 'Unable to publish this media finding.'),
      })
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {!embedded ? <div className="hero-bg" /> : null}
      {!embedded ? <div className="grid-dots" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} /> : null}

      <div style={{ position: 'relative', zIndex: 1 }}>
        {!embedded ? (
          <section className="portal-hero investigation-hero fade-in" style={{ marginBottom: 32 }}>
            <div className="portal-hero-main">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: palette.orange, boxShadow: '0 0 24px rgba(56,189,248,0.35)' }} />
                <span style={{ fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: palette.orange, fontWeight: 800 }}>
                  Media Threat Intelligence
                </span>
              </div>
              <h1 style={{ fontSize: 35, lineHeight: 1.02, fontWeight: 900, color: palette.text, marginBottom: 12 }}>
                Media <span className="gradient-text">Lab</span>
              </h1>
              <p className="portal-hero-copy" style={{ color: palette.muted }}>
                Upload images, videos, or audio for deepfake scoring, OCR extraction, object detection, and quick pivots into URL or IP intelligence.
              </p>
            </div>
            <div className="portal-hero-rail">
              <article className="portal-spotlight-card">
                <span className="portal-spotlight-kicker">Best for</span>
                <strong>Visual and audio triage</strong>
                <p>Deepfake scoring, OCR, object detection, and artifact pivots stay inside the same investigation language as message and IOC triage.</p>
              </article>
              <article className="portal-spotlight-card">
                <span className="portal-spotlight-kicker">Signal policy</span>
                <strong>Actionable only</strong>
                <p>Recent Media Runs keeps only suspicious and threat findings so the public workspace stays focused.</p>
              </article>
            </div>
          </section>
        ) : null}

        <SignalStrip items={stripItems} />

        <div className="investigation-console-grid">
          <section
            className="console-surface fade-in"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ color: palette.text, fontSize: 18, fontWeight: 500, marginBottom: 6 }}>
                  Upload suspicious media
                </h2>
                <p style={{ color: palette.muted, fontSize: 14 }}>
                  Choose a media type, drop a file, and inspect the forensic output.
                </p>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: palette.orange, fontWeight: 500, background: '#08111f', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                <Sparkles size={16} />
                Deepfake and OCR
              </div>
            </div>

            <div className="console-tab-grid" style={{ marginBottom: 24 }}>
              {mediaTabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`console-tab ${active ? 'is-active' : ''}`}
                  >
                    <Icon size={16} color={active ? palette.orange : palette.subtle} />
                    {label}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="media-dropzone"
              onDragOver={(event) => {
                event.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={async (event) => {
                event.preventDefault()
                setDragOver(false)
                const selectedFile = event.dataTransfer.files?.[0]
                if (selectedFile) await onFileSelected(selectedFile)
              }}
              onClick={() => inputRef.current?.click()}
              style={{
                width: '100%',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(37,99,235,0.12)' : palette.cardStrong,
                border: dragOver ? '1px solid rgba(56,189,248,0.28)' : palette.border,
              }}
            >
              <UploadCloud size={32} color={palette.orange} />
              <h3 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginTop: 16 }}>
                Drag and drop a {activeTab} file
              </h3>
              <p style={{ color: palette.muted, marginTop: 8 }}>
                Or click to browse your local files for analysis.
              </p>
              <div className="console-cta" style={{ marginTop: 18, display: 'inline-flex' }}>
                <ScanSearch size={16} />
                Select File
              </div>
              {file ? <p style={{ marginTop: 14, color: palette.subtle, fontSize: 13 }}>Current file: {file.name}</p> : null}
            </button>

            <input
              ref={inputRef}
              type="file"
              hidden
              accept={activeTab === 'image' ? 'image/*' : activeTab === 'video' ? 'video/*' : 'audio/*'}
              onChange={async (event) => {
                const selectedFile = event.target.files?.[0]
                if (selectedFile) await onFileSelected(selectedFile)
              }}
            />

            <div className="feed-surface" style={{ marginTop: 20, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Zap size={16} color={palette.orange} />
                <span className="analysis-meta-label">Recent Media Runs</span>
              </div>
              {!history.length ? (
                <IntelEmptyState
                  title="No suspicious media runs yet"
                  copy="Only suspicious and threat media analyses are stored here. Try an image with embedded text, a suspicious voice clip, or a manipulated-looking video frame."
                  examples={[
                    { label: 'Try image analysis', onClick: () => setActiveTab('image') },
                    { label: 'Switch to audio triage', onClick: () => setActiveTab('audio') },
                  ]}
                />
              ) : (
                <ExpandableFeed
                  items={history.filter((entry) => isActionable(entry?.threat_level))}
                  initialCount={4}
                  className="recent-rail"
                  renderItem={(entry) => (
                    <div key={entry.id} className="recent-rail-item">
                      <div className="recent-rail-main">
                        <strong>{entry.filename}</strong>
                        <div className="recent-rail-copy">{entry.summary}</div>
                      </div>
                      <span style={{ padding: '8px 10px', borderRadius: 999, background: 'rgba(37,99,235,0.1)', color: palette.orange, fontWeight: 800, fontSize: 12, width: 'fit-content' }}>
                        {normalizeThreatLevel(entry.threat_level)}
                      </span>
                    </div>
                  )}
                />
              )}
            </div>

            {error ? (
              <div className="console-status" style={{ marginTop: 20, borderColor: 'rgba(251,191,36,0.18)', color: '#fbbf24', fontWeight: 600 }}>
                {error}
              </div>
            ) : null}
          </section>

          <section
            className="dossier-surface fade-in"
          >
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
                Media Analysis Result
              </h2>
              <p style={{ color: palette.muted, fontSize: 14 }}>
                Threat level, deepfake score, OCR output, detected objects, and investigator actions.
              </p>
            </div>

            {!result && !loading ? (
              <IntelEmptyState
                title="Upload media to begin analysis"
                copy="The result view will first surface verdict, summary, and recommended action. OCR text, artifacts, and community promotion stay tucked behind an expandable technical layer."
                icon={ScanSearch}
                examples={[
                  { label: 'Image workflow', onClick: () => setActiveTab('image') },
                  { label: 'Video workflow', onClick: () => setActiveTab('video') },
                ]}
              />
            ) : null}

            {loading ? (
              <div style={{ minHeight: 280, display: 'grid', placeItems: 'center', borderRadius: 22, background: palette.cardStrong, border: palette.border }}>
                <div style={{ textAlign: 'center', color: palette.muted }}>
                  <Loader2 size={24} className="analysis-spinner" />
                  <p style={{ marginTop: 14 }}>Analyzing {activeTab} media...</p>
                </div>
              </div>
            ) : null}

            {result && !loading ? (
              <div className="split-dossier">
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="intel-button ghost" onClick={() => setFocusMode((current) => !current)}>
                    <FocusIcon size={16} />
                    {focusMode ? 'Show technical details' : 'Hide technical details'}
                  </button>
                </div>
                <div className="split-dossier-row">
                  <div className="brief-panel">
                    <span className="analysis-meta-label">Threat Level</span>
                    <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 999, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(56,189,248,0.24)', color: palette.orange, fontWeight: 800 }}>
                      <Sparkles size={16} />
                      {normalizeThreatLevel(result.threat_level)}
                    </div>
                    <div className="intel-reading-block" style={{ marginTop: 18 }}>
                      <span className="analysis-meta-label">Summary</span>
                      <p style={{ color: palette.muted, lineHeight: 1.7, marginTop: 8 }}>{result.summary}</p>
                    </div>
                  </div>

                  <div className="brief-panel">
                    <span className="analysis-meta-label">Deepfake Score</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                      <div style={{ flex: 1, height: 10, borderRadius: 999, background: palette.dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}>
                        <div style={{ width: `${Math.max(0, Math.min(100, result.deepfake_score || 0))}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #2563eb, #0ea5e9)' }} />
                      </div>
                      <strong style={{ color: palette.orange, fontSize: 20 }}>{result.deepfake_score || 0}%</strong>
                    </div>
                    <div style={{ marginTop: 18 }}>
                      <span className="analysis-meta-label">Detected Objects</span>
                      <p style={{ color: palette.muted, marginTop: 8, lineHeight: 1.7 }}>
                        {(result.detected_objects || []).join(', ') || 'No objects reported.'}
                      </p>
                    </div>
                  </div>
                </div>

                {!focusMode ? <div className="brief-panel">
                  <span className="analysis-meta-label">OCR Text</span>
                  <p className="intel-reading-block" style={{ color: palette.muted, marginTop: 8, lineHeight: 1.7 }}>
                    {result.ocr_text || 'No OCR text extracted.'}
                  </p>
                </div> : null}

                {!focusMode ? <div className="brief-panel">
                    <div>
                      <div className="analysis-meta-label">Public Actions</div>
                      <div style={{ color: palette.muted, marginTop: 6, lineHeight: 1.6 }}>
                        Promote the strongest media sample to community intelligence when it reveals useful public indicators.
                      </div>
                    </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button type="button" onClick={publishThreat} disabled={publishState.status === 'loading'} style={{ border: 'none', borderRadius: 999, padding: '12px 18px', background: 'linear-gradient(135deg, #2563eb, #0ea5e9)', color: '#fff', fontWeight: 800, cursor: publishState.status === 'loading' ? 'wait' : 'pointer' }}>
                      {publishState.status === 'loading' ? 'Publishing...' : 'Promote to Community'}
                    </button>
                  </div>
                  {publishState.message ? (
                    <div style={{ padding: '12px 14px', borderRadius: 16, color: publishState.status === 'success' ? palette.green : palette.orange, background: publishState.status === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(37,99,235,0.12)', border: publishState.status === 'success' ? '1px solid rgba(34,197,94,0.22)' : '1px solid rgba(56,189,248,0.22)' }}>
                      {publishState.message}
                    </div>
                  ) : null}
                </div> : null}

                {!focusMode ? <div className="brief-panel" style={{ display: 'grid', gap: 16 }}>
                  <span className="analysis-meta-label">Extracted Artifacts</span>
                  {!iocs.length ? (
                    <div style={{ color: palette.muted, lineHeight: 1.7 }}>
                      OCR-derived URLs, IPs, domains, and hashes will appear here for one-click enrichment.
                    </div>
                  ) : (
                    <>
                      <div className="artifact-chip-row">
                        {iocs.map((item) => (
                          <button key={`${item.type}-${item.value}`} type="button" className="artifact-chip" onClick={() => runPivot(item)}>
                            {item.type.toUpperCase()}: {item.value}
                          </button>
                        ))}
                      </div>
                      {pivot.loading ? <div style={{ color: palette.muted, display: 'flex', alignItems: 'center', gap: 12 }}><Loader2 size={18} className="analysis-spinner" />Enriching {pivot.value}...</div> : null}
                      {pivot.error ? <div style={{ color: palette.orange }}>{pivot.error}</div> : null}
                      {pivot.result ? <ResultCard result={pivot.result} type={pivot.type} theme={theme} /> : null}
                    </>
                  )}
                </div> : null}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
