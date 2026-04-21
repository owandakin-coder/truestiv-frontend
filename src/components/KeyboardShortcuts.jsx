import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Keyboard, X } from 'lucide-react'

const shortcuts = [
  { keys: ['Ctrl', 'K'], action: 'Open Search', category: 'Navigation' },
  { keys: ['G', 'I'], action: 'Go to Investigation Center', category: 'Navigation' },
  { keys: ['G', 'A'], action: 'Go to Message Analysis', category: 'Navigation' },
  { keys: ['G', 'S'], action: 'Go to Scanner', category: 'Navigation' },
  { keys: ['G', 'L'], action: 'Go to Lookup Center', category: 'Navigation' },
  { keys: ['G', 'C'], action: 'Go to Community', category: 'Navigation' },
  { keys: ['G', 'T'], action: 'Go to Threat Intel', category: 'Navigation' },
  { keys: ['G', 'P'], action: 'Go to Threat Map', category: 'Navigation' },
  { keys: ['?'], action: 'Show Shortcuts', category: 'Help' },
  { keys: ['Esc'], action: 'Close Modal', category: 'General' },
]

export default function KeyboardShortcuts() {
  const [show, setShow] = useState(false)
  const [sequence, setSequence] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let timer
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      // Show shortcuts
      if (e.key === '?') { setShow(s => !s); return }

      // Close
      if (e.key === 'Escape') { setShow(false); return }

      // G sequences
      if (e.key === 'g' || e.key === 'G') {
        setSequence('g')
        timer = setTimeout(() => setSequence(''), 1000)
        return
      }

      if (sequence === 'g') {
        clearTimeout(timer)
        setSequence('')
        const routes = {
          'i': '/investigation-center/scanner', 'I': '/investigation-center/scanner',
          'a': '/investigation-center/analysis', 'A': '/investigation-center/analysis',
          's': '/investigation-center/scanner', 'S': '/investigation-center/scanner',
          'l': '/lookup-center', 'L': '/lookup-center',
          'c': '/community', 'C': '/community',
          't': '/threat-intel', 'T': '/threat-intel',
          'p': '/propagation', 'P': '/propagation',
        }
        if (routes[e.key]) navigate(routes[e.key])
      }
    }

    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); clearTimeout(timer) }
  }, [sequence, navigate])

  if (!show) return null

  const categories = [...new Set(shortcuts.map(s => s.category))]

  return (
    <div onClick={() => setShow(false)} style={{
      position: 'fixed', inset: 0, zIndex: 9997,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 500,
        background: 'rgba(10,10,12,0.98)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
        animation: 'fadeInUp 0.2s ease'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: '#ff6b35', background: 'rgba(255,107,53,0.1)', padding: 8, borderRadius: 10 }}>
              <Keyboard size={18} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Keyboard Shortcuts</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Navigate faster with shortcuts</div>
            </div>
          </div>
          <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts */}
        <div style={{ padding: '16px 24px 24px', maxHeight: 420, overflowY: 'auto' }}>
          {categories.map(cat => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>{cat}</div>
              {shortcuts.filter(s => s.category === cat).map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, marginBottom: 4, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{s.action}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {s.keys.map((key, ki) => (
                      <span key={ki} style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          Press <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', fontFamily: 'monospace', fontSize: 11 }}>?</span> anytime to toggle this panel
        </div>
      </div>
    </div>
  )
}
