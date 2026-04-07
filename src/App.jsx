import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PlatformLayout from './components/PlatformLayout'
import Analysis from './pages/Analysis'
import Scanner from './pages/Scanner'
import MediaLab from './pages/MediaLab'
import GeoThreatMap from './pages/GeoThreatMap'
import CommunityIntel from './pages/CommunityIntel'
import ThreatIntelHub from './pages/ThreatIntelHub'
import IntelTimeline from './pages/IntelTimeline'
import IOCDetails from './pages/IOCDetails'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'
import { ensureGuestSession } from './services/api'

function BootScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(circle at 20% 20%, rgba(37,99,235,0.28), transparent 36%), radial-gradient(circle at 80% 30%, rgba(14,165,233,0.2), transparent 34%), linear-gradient(180deg, #06101d 0%, #030712 100%)',
        color: '#eff6ff',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 74,
            height: 74,
            margin: '0 auto 18px',
            borderRadius: 22,
            background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
            boxShadow: '0 24px 60px rgba(14,165,233,0.28)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 28,
            fontWeight: 900,
          }}
        >
          T
        </div>
        <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>Trustive AI</h1>
        <p style={{ marginTop: 12, color: 'rgba(191,219,254,0.82)' }}>
          Preparing the intelligence workspace...
        </p>
      </div>
    </div>
  )
}

function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    ensureGuestSession()
      .catch(() => {})
      .finally(() => {
        if (mounted) setReady(true)
      })
    return () => {
      mounted = false
    }
  }, [])

  if (!ready) return <BootScreen />

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/scanner" replace />} />
      <Route path="/welcome" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<PlatformLayout />}>
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/media-lab" element={<MediaLab />} />
        <Route path="/timeline" element={<IntelTimeline />} />
        <Route path="/propagation" element={<GeoThreatMap />} />
        <Route path="/community" element={<CommunityIntel />} />
        <Route path="/threat-intel" element={<ThreatIntelHub />} />
        <Route path="/ioc/:iocType/:indicator" element={<IOCDetails />} />
      </Route>

      <Route path="/dashboard" element={<Navigate to="/analysis" replace />} />
      <Route path="/settings" element={<Navigate to="/analysis" replace />} />
      <Route path="/developer" element={<Navigate to="/analysis" replace />} />
      <Route path="/notifications" element={<Navigate to="/analysis" replace />} />
      <Route path="/app" element={<Navigate to="/analysis" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
