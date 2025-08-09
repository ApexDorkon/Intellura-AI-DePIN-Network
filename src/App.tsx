import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Header from './components/Header'
import Hero from './components/Hero'
import GraphSection from './components/GraphSection'
import JoinPanel from './components/JoinPanel'
import ReferralBounce from './routes/ReferralBounce'

function HomePage() {
  return (
    <>
      <Header />
      <Hero />
      <GraphSection />
      <JoinPanel />
      <footer className="border-t border-white/10 py-10 text-center text-white/40">
        © {new Date().getFullYear()} Intellura
      </footer>
    </>
  )
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0A0C11] text-white">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/r/:code" element={<ReferralBounce />} />
        </Routes>
      </div>
    </Router>
  )
}
