import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import PlatformLayout from './components/PlatformLayout'
import Scanner from './pages/Scanner'
import { prewarmGuestSession } from './services/api'

const Analysis = lazy(() => import('./pages/Analysis'))
const MediaLab = lazy(() => import('./pages/MediaLab'))
const GeoThreatMap = lazy(() => import('./pages/GeoThreatMap'))
const CommunityIntel = lazy(() => import('./pages/CommunityIntel'))
const ThreatIntelHub = lazy(() => import('./pages/ThreatIntelHub'))
const IntelTimeline = lazy(() => import('./pages/IntelTimeline'))
const IOCDetails = lazy(() => import('./pages/IOCDetails'))
const LookupCenter = lazy(() => import('./pages/LookupCenter'))
const SearchCenter = lazy(() => import('./pages/SearchCenter'))
const CorrelationGraph = lazy(() => import('./pages/CorrelationGraph'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Landing = lazy(() => import('./pages/Landing'))
const NotFound = lazy(() => import('./pages/NotFound'))

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

function LegacyIpLookupRedirect() {
  const { ip = '' } = useParams()
  return <Navigate to={ip ? `/lookup-center/ip/${encodeURIComponent(ip)}` : '/lookup-center/ip'} replace />
}

function App() {
  useEffect(() => {
    prewarmGuestSession()
  }, [])

  return (
    <Suspense fallback={<BootScreen />}>
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
          <Route path="/lookup-center" element={<LookupCenter />} />
          <Route path="/lookup-center/:mode" element={<LookupCenter />} />
          <Route path="/lookup-center/:mode/:indicator" element={<LookupCenter />} />
          <Route path="/ip-lookup" element={<LegacyIpLookupRedirect />} />
          <Route path="/ip-lookup/:ip" element={<LegacyIpLookupRedirect />} />
          <Route path="/community" element={<CommunityIntel />} />
          <Route path="/threat-intel" element={<ThreatIntelHub />} />
          <Route path="/search" element={<SearchCenter />} />
          <Route path="/ioc/:iocType/:indicator" element={<IOCDetails />} />
          <Route path="/correlation/:iocType/:indicator" element={<CorrelationGraph />} />
        </Route>

        <Route path="/dashboard" element={<Navigate to="/scanner" replace />} />
        <Route path="/settings" element={<Navigate to="/scanner" replace />} />
        <Route path="/developer" element={<Navigate to="/scanner" replace />} />
        <Route path="/notifications" element={<Navigate to="/scanner" replace />} />
        <Route path="/app" element={<Navigate to="/scanner" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
