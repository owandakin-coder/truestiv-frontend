import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeInfo,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  Radar,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../components/ThemeProvider';

const channelOptions = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: MessageSquareText },
  { id: 'whatsapp', label: 'WhatsApp', icon: Phone },
];

const quickScenarios = {
  email: {
    sender: 'payroll@secure-mail-alerts.net',
    subject: 'Urgent bank detail change request',
    content:
      'Please update the CEO salary payment account before 17:00 today. Use IP 185.220.101.4 for the secure portal and reply only to this address.',
  },
  sms: {
    phone: '+1 202 555 0117',
    content:
      'Your package is on hold. Confirm delivery at hxxps://parcel-check-secure.com immediately or it will be returned.',
  },
  whatsapp: {
    phone: '+1 202 555 0151',
    content:
      'Hi, this is finance. I need you to review the attached transfer details now. Server fallback is 45.83.64.22 if the main portal fails.',
  },
};

const emptyResultText = 'Run an analysis to generate an AI-backed verdict.';

function extractIps(...sources) {
  const pattern = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
  const matches = sources
    .filter(Boolean)
    .flatMap((value) => String(value).match(pattern) || []);

  return [...new Set(matches)].slice(0, 3);
}

function normalizeThreatLevel(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'Unknown';
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeAnalysis(payload) {
  const source = payload?.result || payload?.analysis || payload || {};
  const indicators = source.indicators || source.flags || source.signals || [];

  return {
    threatLevel: normalizeThreatLevel(
      source.threat_level || source.threatLevel || source.verdict || source.risk_label
    ),
    confidence: Number(source.confidence || source.confidence_score || source.score || 0),
    summary:
      source.summary ||
      source.description ||
      source.message ||
      'The engine completed the review and returned a structured verdict.',
    indicators: Array.isArray(indicators)
      ? indicators.map((item) => (typeof item === 'string' ? item : item?.label || item?.value)).filter(Boolean)
      : [],
    recommendation:
      source.recommendation ||
      source.next_step ||
      source.action ||
      'Treat this content as suspicious until it is independently verified.',
    raw: source,
  };
}

function getThreatTone(level) {
  const normalized = String(level).toLowerCase();
  if (normalized.includes('high') || normalized.includes('critical') || normalized.includes('malicious')) {
    return {
      color: '#ff9770',
      border: 'rgba(248,113,113,0.3)',
      background: 'rgba(248,113,113,0.12)',
      icon: AlertTriangle,
    };
  }

  if (normalized.includes('low') || normalized.includes('safe') || normalized.includes('benign')) {
    return {
      color: '#86efac',
      border: 'rgba(74,222,128,0.3)',
      background: 'rgba(74,222,128,0.12)',
      icon: CheckCircle2,
    };
  }

  return {
    color: '#fdba74',
    border: 'rgba(251,146,60,0.3)',
    background: 'rgba(251,146,60,0.12)',
    icon: ShieldAlert,
  };
}

function SectionTitle({ eyebrow, title, copy }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          borderRadius: 999,
          background: 'rgba(255,107,53,0.12)',
          border: '1px solid rgba(255,107,53,0.2)',
          color: '#ffb089',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: '#ff6b35',
            boxShadow: '0 0 18px rgba(255,107,53,0.9)',
          }}
        />
        {eyebrow}
      </div>
      <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 3vw, 3rem)', fontWeight: 900 }}>{title}</h1>
      <p style={{ margin: '14px 0 0', maxWidth: 760, color: 'rgba(226,232,240,0.74)', lineHeight: 1.7 }}>
        {copy}
      </p>
    </div>
  );
}

function Analysis() {
  const { theme } = useTheme();
  const [channel, setChannel] = useState('email');
  const [form, setForm] = useState({
    sender: '',
    subject: '',
    phone: '',
    content: '',
  });
  const [result, setResult] = useState(null);
  const [ipIntel, setIpIntel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const client = useMemo(() => api(), []);

  const surfaceColor = theme === 'dark' ? '#050507' : '#f8fafc';
  const textColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const mutedColor = theme === 'dark' ? 'rgba(226,232,240,0.74)' : '#475569';
  const borderColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
  const panelColor = theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)';
  const inputColor = theme === 'dark' ? 'rgba(12,12,16,0.82)' : 'rgba(255,255,255,0.85)';
  const placeholderTone = theme === 'dark' ? 'rgba(148,163,184,0.72)' : '#64748b';

  const cardStyle = {
    borderRadius: 24,
    border: `1px solid ${borderColor}`,
    background: panelColor,
    backdropFilter: 'blur(18px)',
    boxShadow: '0 24px 70px rgba(0,0,0,0.24)',
  };

  const inputStyle = {
    width: '100%',
    borderRadius: 18,
    border: `1px solid ${borderColor}`,
    background: inputColor,
    color: textColor,
    padding: '14px 16px',
    outline: 'none',
    fontSize: 15,
  };

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const applyExample = () => {
    const preset = quickScenarios[channel];
    setForm((current) => ({
      ...current,
      sender: preset.sender || '',
      subject: preset.subject || '',
      phone: preset.phone || '',
      content: preset.content || '',
    }));
  };

  const fetchIpIntel = async (ips) => {
    if (!ips.length) {
      setIpIntel([]);
      return;
    }

    const responses = await Promise.all(
      ips.map(async (ip) => {
        try {
          const response = await client.get('/api/scanner/ip/enhanced', {
            params: { ip },
          });
          return { ip, data: response.data };
        } catch (requestError) {
          return {
            ip,
            data: {
              threat_level: 'Unavailable',
              summary: 'IP intelligence is currently unavailable for this indicator.',
            },
          };
        }
      })
    );

    setIpIntel(responses);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        channel,
        sender: form.sender,
        subject: form.subject,
        phone_number: form.phone,
        content: form.content,
      };

      const response = await client.post('/api/analysis/analyze', payload);
      const normalized = normalizeAnalysis(response.data);
      setResult(normalized);

      const ips = extractIps(form.sender, form.content);
      await fetchIpIntel(ips);
    } catch (requestError) {
      const detail =
        requestError?.response?.data?.detail ||
        requestError?.message ||
        'Unable to complete the analysis right now.';
      setError(detail);
      setResult(null);
      setIpIntel([]);
    } finally {
      setLoading(false);
    }
  };

  const tone = getThreatTone(result?.threatLevel);
  const ToneIcon = tone.icon;

  return (
    <section
      style={{
        minHeight: 'calc(100vh - 140px)',
        position: 'relative',
        color: textColor,
        background: surfaceColor,
      }}
    >
      <div className="hero-bg" />
      <div className="grid-dots" />

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 24 }}>
        <SectionTitle
          eyebrow="Analysis Studio"
          title="AI message triage built like the scanner."
          copy="This workspace now follows the same visual rhythm as the scanner page: a focused intake panel on the left, a live verdict pane on the right, and fast pivots into IP intelligence when the content exposes infrastructure."
        />

        <div className="analysis-layout" style={{ display: 'grid', gap: 24, alignItems: 'start' }}>
          <div style={{ ...cardStyle, padding: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 20,
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: '#ff9a62', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                  Intake
                </div>
                <h2 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 900 }}>Run Analysis</h2>
              </div>

              <button
                type="button"
                onClick={applyExample}
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(255,107,53,0.24)',
                  background: 'rgba(255,107,53,0.1)',
                  color: '#ffb089',
                  padding: '10px 16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Load Example
              </button>
            </div>

            <div
              className="channel-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
                marginBottom: 20,
              }}
            >
              {channelOptions.map((option) => {
                const Icon = option.icon;
                const active = channel === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setChannel(option.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      padding: '14px 16px',
                      borderRadius: 18,
                      border: active
                        ? '1px solid rgba(255,107,53,0.45)'
                        : `1px solid ${borderColor}`,
                      background: active
                        ? 'linear-gradient(135deg, #ff6b35, #ff914d)'
                        : inputColor,
                      color: active ? '#fff' : textColor,
                      cursor: 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    <Icon size={16} />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
              {channel === 'email' ? (
                <>
                  <label className="analysis-field" style={{ display: 'grid', gap: 8 }}>
                    <span className="analysis-meta-label" style={{ color: mutedColor, fontSize: 14, fontWeight: 700 }}>
                      Sender
                    </span>
                    <input
                      value={form.sender}
                      onChange={(event) => setField('sender', event.target.value)}
                      placeholder="alerts@company-security.com"
                      style={inputStyle}
                    />
                  </label>

                  <label className="analysis-field" style={{ display: 'grid', gap: 8 }}>
                    <span className="analysis-meta-label" style={{ color: mutedColor, fontSize: 14, fontWeight: 700 }}>
                      Subject
                    </span>
                    <input
                      value={form.subject}
                      onChange={(event) => setField('subject', event.target.value)}
                      placeholder="Urgent payment request"
                      style={inputStyle}
                    />
                  </label>
                </>
              ) : (
                <label className="analysis-field" style={{ display: 'grid', gap: 8 }}>
                  <span className="analysis-meta-label" style={{ color: mutedColor, fontSize: 14, fontWeight: 700 }}>
                    Phone Number
                  </span>
                  <input
                    value={form.phone}
                    onChange={(event) => setField('phone', event.target.value)}
                    placeholder="+1 202 555 0172"
                    style={inputStyle}
                  />
                </label>
              )}

              <label className="analysis-field" style={{ display: 'grid', gap: 8 }}>
                <span className="analysis-meta-label" style={{ color: mutedColor, fontSize: 14, fontWeight: 700 }}>
                  Content
                </span>
                <textarea
                  value={form.content}
                  onChange={(event) => setField('content', event.target.value)}
                  placeholder="Paste the email, message, or WhatsApp content here."
                  rows={10}
                  style={{
                    ...inputStyle,
                    minHeight: 220,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </label>

              {error ? (
                <div
                  style={{
                    borderRadius: 18,
                    padding: '14px 16px',
                    border: '1px solid rgba(248,113,113,0.28)',
                    background: 'rgba(248,113,113,0.12)',
                    color: '#fecaca',
                    lineHeight: 1.6,
                  }}
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="analysis-submit"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  border: 'none',
                  borderRadius: 999,
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #ff6b35, #ff914d)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: '0 20px 48px rgba(255,107,53,0.32)',
                }}
              >
                {loading ? <Loader2 size={18} className="analysis-spinner" /> : <Sparkles size={18} />}
                {loading ? 'Analyzing...' : 'Run Analysis'}
              </button>
            </form>
          </div>

          <div style={{ display: 'grid', gap: 24 }}>
            <div style={{ ...cardStyle, padding: 24 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: '#ff9a62', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                    Verdict
                  </div>
                  <h2 style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 900 }}>AI-backed outcome</h2>
                </div>

                {result ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      borderRadius: 999,
                      color: tone.color,
                      border: `1px solid ${tone.border}`,
                      background: tone.background,
                      fontWeight: 800,
                    }}
                  >
                    <ToneIcon size={16} />
                    {result.threatLevel}
                  </div>
                ) : null}
              </div>

              {!result ? (
                <div
                  style={{
                    minHeight: 320,
                    borderRadius: 22,
                    border: `1px dashed ${borderColor}`,
                    display: 'grid',
                    placeItems: 'center',
                    textAlign: 'center',
                    padding: 24,
                    color: placeholderTone,
                    lineHeight: 1.7,
                  }}
                >
                  <div style={{ display: 'grid', gap: 16, justifyItems: 'center', maxWidth: 420 }}>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 999,
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(255,107,53,0.12)',
                        border: '1px solid rgba(255,107,53,0.18)',
                        color: '#ff9a62',
                      }}
                    >
                      <Radar size={28} />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: textColor }}>
                      {emptyResultText}
                    </div>
                    <div>
                      The results panel will surface the threat level, confidence, analyst summary,
                      extracted indicators, recommendation, and any linked IP intelligence.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 18 }}>
                  <div className="analysis-result-grid" style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <div
                      style={{
                        borderRadius: 20,
                        border: `1px solid ${borderColor}`,
                        background: inputColor,
                        padding: 18,
                      }}
                    >
                      <div style={{ color: mutedColor, fontSize: 13, marginBottom: 8 }}>Threat Level</div>
                      <div style={{ fontSize: 24, fontWeight: 900 }}>{result.threatLevel}</div>
                    </div>

                    <div
                      style={{
                        borderRadius: 20,
                        border: `1px solid ${borderColor}`,
                        background: inputColor,
                        padding: 18,
                      }}
                    >
                      <div style={{ color: mutedColor, fontSize: 13, marginBottom: 8 }}>Confidence</div>
                      <div style={{ fontSize: 24, fontWeight: 900 }}>
                        {Number.isFinite(result.confidence) ? `${Math.round(result.confidence)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 22,
                      border: `1px solid ${borderColor}`,
                      background: inputColor,
                      padding: 20,
                      lineHeight: 1.7,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontWeight: 800 }}>
                      <BadgeInfo size={18} color="#ff9a62" />
                      Summary
                    </div>
                    <div style={{ color: mutedColor }}>{result.summary}</div>
                  </div>

                  <div
                    style={{
                      borderRadius: 22,
                      border: `1px solid ${borderColor}`,
                      background: inputColor,
                      padding: 20,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, fontWeight: 800 }}>
                      <Sparkles size={18} color="#ff9a62" />
                      Indicators
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {result.indicators.length ? (
                        result.indicators.map((item) => (
                          <span
                            key={item}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 999,
                              border: `1px solid ${borderColor}`,
                              background: 'rgba(255,107,53,0.08)',
                              color: textColor,
                              fontWeight: 700,
                            }}
                          >
                            {item}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: mutedColor }}>No structured indicators were returned for this analysis.</span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 22,
                      border: `1px solid ${borderColor}`,
                      background: inputColor,
                      padding: 20,
                      lineHeight: 1.7,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontWeight: 800 }}>
                      <ShieldAlert size={18} color="#ff9a62" />
                      Recommendation
                    </div>
                    <div style={{ color: mutedColor }}>{result.recommendation}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ ...cardStyle, padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: '#ff9a62', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
                  IP Intelligence
                </div>
                <h2 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 900 }}>Infrastructure pivot</h2>
              </div>

              {!ipIntel.length ? (
                <div
                  style={{
                    borderRadius: 20,
                    border: `1px dashed ${borderColor}`,
                    padding: 20,
                    color: mutedColor,
                    lineHeight: 1.7,
                  }}
                >
                  If the content exposes IP addresses, enhanced infrastructure intelligence will appear here automatically after the analysis completes.
                </div>
              ) : (
                <div className="result-stack" style={{ display: 'grid', gap: 14 }}>
                  {ipIntel.map((entry) => {
                    const data = entry.data || {};
                    const intelLevel = normalizeThreatLevel(data.threat_level || data.risk || 'Unknown');

                    return (
                      <div
                        key={entry.ip}
                        style={{
                          borderRadius: 20,
                          border: `1px solid ${borderColor}`,
                          background: inputColor,
                          padding: 18,
                          display: 'grid',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 900, fontSize: 18 }}>{entry.ip}</div>
                          <div
                            style={{
                              padding: '8px 12px',
                              borderRadius: 999,
                              border: '1px solid rgba(255,107,53,0.2)',
                              background: 'rgba(255,107,53,0.1)',
                              color: '#ffb089',
                              fontWeight: 700,
                            }}
                          >
                            {intelLevel}
                          </div>
                        </div>

                        <div style={{ color: mutedColor, lineHeight: 1.7 }}>
                          {data.summary || data.message || 'Enhanced IP intelligence was collected for this indicator.'}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {[
                            data.country && `Country: ${data.country}`,
                            data.isp && `ISP: ${data.isp}`,
                            data.abuse_score && `Abuse Score: ${data.abuse_score}`,
                            data.usage_type && `Usage: ${data.usage_type}`,
                          ]
                            .filter(Boolean)
                            .map((item) => (
                              <span
                                key={item}
                                style={{
                                  padding: '9px 12px',
                                  borderRadius: 999,
                                  border: `1px solid ${borderColor}`,
                                  background: 'rgba(255,255,255,0.03)',
                                  fontSize: 13,
                                }}
                              >
                                {item}
                              </span>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Analysis;
