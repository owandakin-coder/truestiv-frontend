import { useMemo, useRef, useState } from 'react'
import {
  AudioLines,
  FileImage,
  Film,
  ScanSearch,
  Sparkles,
  UploadCloud,
} from 'lucide-react'

import { useTheme } from '../components/ThemeProvider'
import { api } from '../services/api'

const mediaTabs = [
  { id: 'image', label: 'Image', icon: FileImage },
  { id: 'video', label: 'Video', icon: Film },
  { id: 'audio', label: 'Audio', icon: AudioLines },
]

function getPalette(theme) {
  const dark = theme !== 'light'
  return {
    dark,
    card: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)',
    cardStrong: dark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    border: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(15,23,42,0.08)',
    text: dark ? '#f8fafc' : '#0f172a',
    muted: dark ? 'rgba(255,255,255,0.64)' : '#475569',
    subtle: dark ? 'rgba(255,255,255,0.36)' : '#64748b',
    orange: '#ff6b35',
    red: '#ff5c5c',
    yellow: '#fbbf24',
    green: '#00e5a0',
  }
}

function levelColor(level, palette) {
  if (level === 'threat') return palette.red
  if (level === 'suspicious') return palette.yellow
  return palette.green
}

function mockMediaResult(file, mediaType) {
  const fileName = file?.name || 'upload'
  const extension = fileName.split('.').pop()?.toLowerCase()
  const suspiciousName = /(urgent|wire|invoice|secret|ceo|wallet|login)/i.test(fileName)
  const riskScore = suspiciousName ? 68 : mediaType === 'audio' ? 42 : 31
  const threatLevel = riskScore >= 65 ? 'threat' : riskScore >= 40 ? 'suspicious' : 'safe'

  return {
    filename: fileName,
    media_type: mediaType,
    threat_level: threatLevel,
    risk_score: riskScore,
    deepfake_score: mediaType === 'video' ? 71 : mediaType === 'image' ? 58 : 49,
    ocr_text: mediaType === 'image' ? 'Mock OCR fallback: suspicious payment instructions detected.' : '',
    detected_objects: mediaType === 'image' ? ['document', 'screen', 'text overlay'] : mediaType === 'video' ? ['face', 'screen'] : ['voice'],
    summary: `Fallback analysis for ${extension || mediaType} media because the scanner media endpoint is unavailable.`,
  }
}

export default function MediaLab() {
  const { theme } = useTheme()
  const palette = useMemo(() => getPalette(theme), [theme])
  const inputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('image')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runAnalysis = async (selectedFile) => {
    if (!selectedFile) return
    setLoading(true)
    setError('')
    setResult(null)

    const payload = new FormData()
    payload.append('media_type', activeTab)
    payload.append('file', selectedFile)

    try {
      const { data } = await api().post('/api/scanner/analyze-media', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
    } catch {
      setResult(mockMediaResult(selectedFile, activeTab))
      setError('Media endpoint unavailable. Showing a local fallback preview.')
    } finally {
      setLoading(false)
    }
  }

  const onFileSelected = async (selectedFile) => {
    setFile(selectedFile)
    await runAnalysis(selectedFile)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div className="hero-bg" />
      <div className="grid-dots" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <section className="fade-in" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: palette.orange, boxShadow: '0 0 24px rgba(255,107,53,0.35)' }} />
            <span style={{ fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: palette.orange, fontWeight: 800 }}>
              Media Threat Intelligence
            </span>
          </div>
          <h1 style={{ fontSize: 46, lineHeight: 1.02, fontWeight: 900, color: palette.text, marginBottom: 12 }}>
            Media <span className="gradient-text">Lab</span>
          </h1>
          <p style={{ color: palette.muted, maxWidth: 780, fontSize: 15 }}>
            Upload images, videos, or audio for deepfake scoring, OCR extraction, and object detection in one unified analyst view.
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
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: palette.orange,
                  fontWeight: 700,
                  background: 'rgba(255,107,53,0.12)',
                  border: '1px solid rgba(255,107,53,0.18)',
                  borderRadius: 999,
                  padding: '10px 14px',
                }}
              >
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
                      border: active ? '1px solid rgba(255,107,53,0.24)' : palette.border,
                      background: active ? 'linear-gradient(135deg, rgba(255,107,53,0.18), rgba(255,59,59,0.10))' : palette.cardStrong,
                      color: active ? palette.text : palette.muted,
                      boxShadow: active ? '0 16px 40px rgba(255,107,53,0.18)' : 'none',
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
                background: dragOver ? 'rgba(255,107,53,0.12)' : palette.cardStrong,
                border: dragOver ? '1px solid rgba(255,107,53,0.28)' : palette.border,
              }}
            >
              <UploadCloud size={32} color={palette.orange} />
              <h3 style={{ color: palette.text, fontSize: 22, fontWeight: 900, marginTop: 16 }}>
                Drag and drop a {activeTab} file
              </h3>
              <p style={{ color: palette.muted, marginTop: 8 }}>
                Or click to browse your local files for analysis.
              </p>
              <div
                style={{
                  marginTop: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: 40,
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #ff6b35, #ff3b3b)',
                  color: '#fff',
                  fontWeight: 800,
                  boxShadow: '0 16px 40px rgba(255,107,53,0.24)',
                }}
              >
                <ScanSearch size={16} />
                Select File
              </div>
              {file && (
                <p style={{ marginTop: 14, color: palette.subtle, fontSize: 13 }}>
                  Current file: {file.name}
                </p>
              )}
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

            {error && (
              <div
                style={{
                  marginTop: 20,
                  padding: '14px 16px',
                  borderRadius: 18,
                  background: 'rgba(251,191,36,0.12)',
                  border: '1px solid rgba(251,191,36,0.18)',
                  color: palette.yellow,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}
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
                Threat level, deepfake score, OCR output, and detected objects.
              </p>
            </div>

            {!result && !loading && (
              <div
                style={{
                  minHeight: 280,
                  borderRadius: 22,
                  border: palette.border,
                  background: palette.cardStrong,
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                  padding: 24,
                }}
              >
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
            )}

            {loading && (
              <div
                style={{
                  minHeight: 280,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 22,
                  background: palette.cardStrong,
                  border: palette.border,
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <span className="analysis-spinner" />
                  <p style={{ marginTop: 14, color: palette.muted }}>Analyzing {activeTab} media...</p>
                </div>
              </div>
            )}

            {result && !loading && (
              <div className="analysis-result-grid">
                <div style={{ background: palette.cardStrong, border: palette.border, borderRadius: 20, padding: 20 }}>
                  <span className="analysis-meta-label">Threat Level</span>
                  <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 999, background: `${levelColor(result.threat_level, palette)}16`, border: `1px solid ${levelColor(result.threat_level, palette)}24`, color: levelColor(result.threat_level, palette), fontWeight: 800 }}>
                    <Sparkles size={16} />
                    {result.threat_level}
                  </div>
                  <div style={{ marginTop: 18 }}>
                    <span className="analysis-meta-label">Summary</span>
                    <p style={{ color: palette.muted, lineHeight: 1.7, marginTop: 8 }}>
                      {result.summary}
                    </p>
                  </div>
                </div>

                <div style={{ background: palette.cardStrong, border: palette.border, borderRadius: 20, padding: 20 }}>
                  <span className="analysis-meta-label">Deepfake Score</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                    <div style={{ flex: 1, height: 10, borderRadius: 999, background: palette.dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}>
                      <div
                        style={{
                          width: `${Math.max(0, Math.min(100, result.deepfake_score || 0))}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, #ff6b35, #ff3b3b)',
                        }}
                      />
                    </div>
                    <strong style={{ color: palette.orange, fontSize: 20 }}>{result.deepfake_score || 0}%</strong>
                  </div>
                  <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
                    <div>
                      <span className="analysis-meta-label">Detected Objects</span>
                      <p style={{ color: palette.muted, marginTop: 8, lineHeight: 1.7 }}>
                        {(result.detected_objects || []).join(', ') || 'No objects reported.'}
                      </p>
                    </div>
                    <div>
                      <span className="analysis-meta-label">OCR Text</span>
                      <p style={{ color: palette.muted, marginTop: 8, lineHeight: 1.7 }}>
                        {result.ocr_text || 'No OCR text extracted.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
