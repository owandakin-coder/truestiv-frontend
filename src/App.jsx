import { Navigate, Route, Routes } from 'react-router-dom';
import PlatformLayout from './components/PlatformLayout';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Scanner from './pages/Scanner';
import MediaLab from './pages/MediaLab';
import GeoThreatMap from './pages/GeoThreatMap';
import CommunityIntel from './pages/CommunityIntel';
import ThreatIntelHub from './pages/ThreatIntelHub';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import DeveloperHub from './pages/DeveloperHub';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<PlatformLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/media-lab" element={<MediaLab />} />
        <Route path="/propagation" element={<GeoThreatMap />} />
        <Route path="/community" element={<CommunityIntel />} />
        <Route path="/threat-intel" element={<ThreatIntelHub />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/developer" element={<DeveloperHub />} />
      </Route>

      <Route path="/app" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
