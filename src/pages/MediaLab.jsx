import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AudioLines,
  FileImage,
  Film,
  Loader2,
  ScanSearch,
  Sparkles,
  UploadCloud,
  Zap,
} from 'lucide-react'

import ResultCard from '../components/ResultCard'
import { useTheme } from '../components/ThemeProvider'
import { api, getErrorMessage } from '../services/api'
import {
  buildCommunityPayload,
  extractIocsFromText,
  flattenIocs,
  getPrimaryIndicator,
  makeStorageList,
  normalizeThreatLevel,
  readStorageList,
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

function mockMediaResult(file, mediaType) {
  const fileName = file?.name || 'upload'
  const suspiciousName = /(urgent|wire|invoice|secret|ceo|wallet|login)/i.test(fileName)
  const riskScore = suspiciousName ? 68 : mediaType === 'audio' ? 42 : 31
  const threatLevel = riskScore >= 65 ? 'threat' : riskScore >= 40 ? 'suspicious' : 'safe'
  return {
    filename: fileName,
    media_type: mediaType,
    threat_level: threatLevel,
    risk_score: riskScore,
    deepfake_score: mediaType === 'video' ? 71 : mediaType === 'image' ? 58 : 49,
    ocr_text:
      mediaType === 'image'
        ? 'Mock OCR fallback: suspicious payment instructions detected at https://wire-approval-access.example from 185.220.101.4.'
        : '',
    detected_objects:
      mediaType === 'image'
        ? ['document', 'screen', 'text overlay']
        : mediaType === 'video'
          ? ['face', 'screen']
          : ['voice'],
    summary: `Fallback analysis for ${fileName} because the media endpoint is unavailable.`,
  }
}

export default function MediaLab() {
  const { theme } = useTheme()
  const palette = useMemo(() => paletteFor(theme), [theme])
  const inputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('image')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState(localStorage.getItem('trustive_media_notes') || '')
  const [history, setHistory] = useState([])
  const [publishState, setPublishState] = useState({ status: 'idle', message: '' })
  const [pivot, setPivot] = useState({ loading: false, error: '', result: null, type: 'url', value: '' })

  useEffect(() => {
    localStorage.setItem('trustive_media_notes', notes)
  }, [notes])

  useEffect(() => {
    setHistory(readStorageList('trustive_media_history'))
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
      const { data } = await api().post('/api/scanner/analyze-media', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      const stored = makeStorageList(
        'trustive_media_history',
        {
          id: crypto.randomUUID(),
          filename: selectedFile.name,
          media_type: activeTab,
          threat_level: data?.threat_level || 'unknown',
          summary: data?.summary || '',
          created_at: new Date().toISOString(),
        },
        8
      )
      setHistory(stored)
    } catch {
      const fallback = mockMediaResult(selectedFile, activeTab)
      setResult(fallback)
      const stored = makeStorageList(
        'trustive_media_history',
        {
          id: crypto.randomUUID(),
          filename: selectedFile.name,
          media_type: activeTab,
          threat_level: fallback.threat_level,
          summary: fallback.summary,
          created_at: new Date().toISOString(),
        },
        8
      )
      setHistory(stored)
      setError('Media endpoint unavailable. Showing a local fallback preview.')
    } finally {
      setLoading(false)
    }
  }

  const onFileSelected = async (selectedFile) => {
    setFile(selectedFile)
    await runAnalysis(selectedFile)
  }

  const iocs = useMemo(() => flattenIocs(extractIocsFromText(result?.ocr_text, result?.summary, file?.name)), [result, file])

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
      <div className="hero-bg" />
      <div className="grid-dots" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <section className="fade-in" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: palette.orange, boxShadow: '0 0 24px rgba(56,189,248,0.35)' }} />
            <span style={{ fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: palette.orange, fontWeight: 800 }}>
              Media Threat Intelligence
            </span>
          </div>
          <h1 style={{ fontSize: 46, lineHeight: 1.02, fontWeight: 900, color: palette.text, marginBottom: 12 }}>
            Media <span className="gradient-text">Lab</span>
          </h1>
          <p style={{ color: palette.muted, maxWidth: 780, fontSize: 15 }}>
            Upload images, videos, or audio for deepfake scoring, OCR extraction, object detection, and quick pivots into URL or IP intelligence.
          </p>
        </section>

        <div className="analysis-layout">
          <section
            className="fade-in"
            style={{
              background: palette.card,
              border: palette.border,
              borderRadius: 24,
              padding: 28,
              backdropFilter: 'blur(20px)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 6 }}>
                  Upload suspicious media
                </h2>
                <p style={{ color: palette.muted, fontSize: 14 }}>
                  Choose a media type, drop a file, and inspect the forensic output.
                </p>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: palette.orange, fontWeight: 700, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(56,189,248,0.18)', borderRadius: 999, padding: '10px 14px' }}>
                <Sparkles size={16} />
                Deepfake and OCR
              </div>
            </div>

            <div className="channel-grid" style={{ marginBottom: 24 }}>
              {mediaTabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      padding: '14px 18px',
                      borderRadius: 18,
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: active ? '1px solid rgba(56,189,248,0.24)' : palette.border,
                      background: active ? 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(14,165,233,0.12))' : palette.cardStrong,
                      color: active ? palette.text : palette.muted,
                      boxShadow: active ? '0 16px 40px rgba(14,165,233,0.18)' : 'none',
                    }}
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
              <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 40, padding: '12px 24px', background: 'linear-gradient(135deg, #2563eb, #0ea5e9)', color: '#fff', fontWeight: 800, boxShadow: '0 16px 40px rgba(14,165,233,0.24)' }}>
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

            <label className="analysis-field" style={{ marginTop: 20 }}>
              <span>Analyst Notes</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Capture confidence notes, object anomalies, or follow-up actions." rows={4} className="analysis-textarea" />
            </label>

            <div style={{ marginTop: 20, padding: 18, borderRadius: 20, border: palette.border, background: palette.cardStrong }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Zap size={16} color={palette.orange} />
                <span className="analysis-meta-label">Recent Media Runs</span>
              </div>
              {!history.length ? (
                <p style={{ margin: 0, color: palette.muted, lineHeight: 1.7 }}>
                  Recent uploads are saved locally so you can revisit recurring forensic samples quickly.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {history.map((entry) => (
                    <div key={entry.id} style={{ padding: '12px 14px', borderRadius: 18, border: palette.border, background: 'transparent', color: palette.text }}>
                      <strong style={{ display: 'block', marginBottom: 4 }}>{entry.filename}</strong>
                      <div style={{ color: palette.muted, marginBottom: 8 }}>{entry.summary}</div>
                      <span style={{ padding: '8px 10px', borderRadius: 999, background: 'rgba(37,99,235,0.1)', color: palette.orange, fontWeight: 800, fontSize: 12 }}>
                        {normalizeThreatLevel(entry.threat_level)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error ? (
              <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 18, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.18)', color: '#fbbf24', fontWeight: 600 }}>
                {error}
              </div>
            ) : null}
          </section>

          <section
            className="fade-in"
            style={{
              background: palette.card,
              border: palette.border,
              borderRadius: 24,
              padding: 28,
              backdropFilter: 'blur(20px)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
            }}
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
              <div style={{ minHeight: 280, borderRadius: 22, border: palette.border, background: palette.cardStrong, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
                <div>
                  <ScanSearch size={42} color={palette.orange} style={{ marginBottom: 14 }} />
                  <h3 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
                    Upload media to begin analysis
                  </h3>
                  <p style={{ color: palette.muted }}>
                    The result panel will populate after a successful upload.
                  </p>
                </div>
              </div>
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
              <div style={{ display: 'grid', gap: 18 }}>
                <div className="analysis-result-grid">
                  <div style={{ background: palette.cardStrong, border: palette.border, borderRadius: 20, padding: 20 }}>
                    <span className="analysis-meta-label">Threat Level</span>
                    <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 999, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(56,189,248,0.24)', color: palette.orange, fontWeight: 800 }}>
                      <Sparkles size={16} />
                      {normalizeThreatLevel(result.threat_level)}
                    </div>
                    <div style={{ marginTop: 18 }}>
                      <span className="analysis-meta-label">Summary</span>
                      <p style={{ color: palette.muted, lineHeight: 1.7, marginTop: 8 }}>{result.summary}</p>
                    </div>
                  </div>

                  <div style={{ background: palette.cardStrong, border: palette.border, borderRadius: 20, padding: 20 }}>
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

                <div style={{ background: palette.cardStrong, border: palette.border, borderRadius: 20, padding: 20 }}>
                  <span className="analysis-meta-label">OCR Text</span>
                  <p style={{ color: palette.muted, marginTop: 8, lineHeight: 1.7 }}>
                    {result.ocr_text || 'No OCR text extracted.'}
                  </p>
                </div>

                <div style={{ background: palette.cardStrong, border: palette.border, borderRadius: 20, padding: 20, display: 'grid', gap: 14 }}>
                    <div>
                      <div className="analysis-meta-label">Analyst Actions</div>
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
                </div>

                <div style={{ background: palette.cardStrong, border: palette.border, borderRadius: 20, padding: 20, display: 'grid', gap: 16 }}>
                  <span className="analysis-meta-label">Extracted Artifacts</span>
                  {!iocs.length ? (
                    <div style={{ color: palette.muted, lineHeight: 1.7 }}>
                      OCR-derived URLs, IPs, domains, and hashes will appear here for one-click enrichment.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {iocs.map((item) => (
                          <button key={`${item.type}-${item.value}`} type="button" onClick={() => runPivot(item)} style={{ padding: '10px 14px', borderRadius: 999, border: palette.border, background: 'rgba(37,99,235,0.08)', color: palette.text, fontWeight: 700, cursor: 'pointer' }}>
                            {item.type.toUpperCase()}: {item.value}
                          </button>
                        ))}
                      </div>
                      {pivot.loading ? <div style={{ color: palette.muted, display: 'flex', alignItems: 'center', gap: 12 }}><Loader2 size={18} className="analysis-spinner" />Enriching {pivot.value}...</div> : null}
                      {pivot.error ? <div style={{ color: palette.orange }}>{pivot.error}</div> : null}
                      {pivot.result ? <ResultCard result={pivot.result} type={pivot.type} theme={theme} /> : null}
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
