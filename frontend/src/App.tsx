import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import MapApp from './pages/MapApp'
import Trips from './pages/Trips'
import Journal from './pages/Journal'
import Community from './pages/Community'
import Guardian from './pages/Guardian'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/app" element={
          <ProtectedRoute>
            <Layout>
              <Navigate to="/app/trips" replace />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/app/trips" element={
          <ProtectedRoute>
            <Layout>
              <Trips />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/app/map" element={
          <ProtectedRoute>
            <Layout>
              <MapApp />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/app/journal" element={
          <ProtectedRoute>
            <Layout>
              <Journal />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/app/community" element={
          <ProtectedRoute>
            <Layout>
              <Community />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/guardian/:token" element={<Guardian />} />
      </Routes>
    </Router>
  )
}

export default App

