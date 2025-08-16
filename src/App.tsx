// src/App.tsx
import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Header from './components/Header'
import Hero from './components/Hero'
import GraphSection from './components/GraphSection'
import JoinPanel from './components/JoinPanel'
import Quests from './components/Quests'
import ReferralBounce from './routes/ReferralBounce'

import { useAuth } from './state/auth'
import { getBalance } from './lib/api'

function HomePage() {
  const { me } = useAuth()
  const [points, setPoints] = useState<number>(0)

  // fetch points whenever auth changes
  useEffect(() => {
    let alive = true
    if (!me) { setPoints(0); return }

    ;(async () => {
      try {
        const { balance } = await getBalance()
        const n = Number(balance)
        if (alive) setPoints(Number.isFinite(n) ? n : 0)
      } catch {
        if (alive) setPoints(0)
      }
    })()

    return () => { alive = false }
  }, [me])

  return (
    <>
      <Header />
      <Hero />
      <GraphSection points={points} />
      <JoinPanel />
      {/* When a quest is claimed, refresh the points shown in the graph */}
      <Quests onAfterClaim={(newTotal) => setPoints(Number(newTotal) || 0)} />
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