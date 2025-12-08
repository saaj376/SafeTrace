import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Guardian from './pages/Guardian'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/guardian/:token" element={<Guardian />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

