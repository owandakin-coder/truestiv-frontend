import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import Layout from './components/PlatformLayout'
import LoadingScreen from './components/LoadingScreen'
import Onboarding from './components/Onboarding'
import Toast from './components/Toast'
import AdminPanel from './pages/AdminPanel'
import Analysis from './pages/Analysis'
import Community from './pages/CommunityIntel'
import Contacts from './pages/Contacts'
import Dashboard from './pages/Dashboard'
import DeveloperHub from './pages/DeveloperHub'
import GeoThreatMap from './pages/GeoThreatMap'
import Landing from './pages/Landing'
import Login from './pages/Login'
import MediaLab from './pages/MediaLab'
import NotFound from './pages/NotFound'
import Notifications from './pages/Notifications'
import Performance from './pages/Performance'
import Register from './pages/Register'
import Scanner from './pages/Scanner'
import Settings from './pages/Settings'
import ThreatInsights from './pages/ThreatIntelHub'
import './styles/platform.css'

const isAuthenticated = () => Boolean(localStorage.getItem('token'))

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" />
}

function AppContent() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [loading, setLoading] = useState(!sessionStorage.getItem('loaded'))

  useEffect(() => {
    const done = localStorage.getItem('onboarding_done')
    const token = localStorage.getItem('token')
    if (token && !done) setShowOnboarding(true)
  }, [])

  const handleLoadingDone = () => {
    sessionStorage.setItem('loaded', 'true')
    setLoading(false)
  }

  if (loading) return <LoadingScreen onDone={handleLoadingDone} />

  return (
    <>
      <Toast />
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      <Routes>
        <Route path="/" element={isAuthenticated() ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
        </Route>

        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="analysis" element={<Analysis />} />
          <Route path="scanner" element={<Scanner />} />
          <Route path="media-lab" element={<MediaLab />} />
          <Route path="propagation" element={<GeoThreatMap />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="community" element={<Community />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="performance" element={<Performance />} />
          <Route path="threat-intel" element={<ThreatInsights />} />
          <Route path="admin" element={<AdminPanel />} />
          <Route path="developer" element={<DeveloperHub />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default function App() {
  return <AppContent />
}
