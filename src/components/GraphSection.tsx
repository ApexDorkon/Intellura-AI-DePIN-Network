// src/components/GraphSection.tsx
import { useEffect, useRef } from 'react'

type Props = { points?: number; muted?: boolean } // muted = treat as logged out

export default function GraphSection({ points = 0, muted = false }: Props) {
  const ref = useRef<SVGPathElement>(null)

  useEffect(() => {
    let t = 0
    let raf = 0

    const isFlat = muted || points <= 0

    // Helper: write a flat line and bail (no RAF, no CPU)
    const drawFlat = () => {
      const d = Array.from({ length: 80 }, (_, i) => {
        const x = (i / 79) * 1000
        const y = 200
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      }).join(' ')
      ref.current?.setAttribute('d', d)
    }

    if (isFlat) {
      drawFlat()
      return () => {}
    }

    // -------- points-driven mappings --------

    // Pulse power mapping:
    // 0/unauth → 1; 100 → 10; 150 → 13; 200 → 16; +3 each +50 thereafter
    const pulsePower =
      points <= 0
        ? 1
        : points <= 100
          ? 10 // at exactly 100
          : 10 + 0.06 * (points - 100) // +0.06 per point = +3 per +50

    // Pulse depth (how hard the pulse hits) grows with points but saturates
    const pulseDepth = Math.min(0.15 + points * 0.004, 0.7) // ~0.55 at 100, up to 0.7

    // Pulse frequency: slightly slower as points rise (stronger, slower thumps)
    const pulseFreq = Math.max(0.08, 0.25 - points * 0.0008) // ~0.17 at 100, ~0.09 at 200

    // Base movement:
    // Before 100 points keep it modest, then ramp harder after 100.
    const baseAmp =
      points <= 100
        ? 6 * (points / 100) // up to ~6 by 100
        : 6 + (points - 100) * 0.3 // +0.3 px per point after 100 (tune to taste)

    // Wave complexity/frequencies nudge up with points
    const f1 = 0.35 + 0.0015 * points
    const f2 = 0.12 + 0.0010 * points

    // Base time speed; a touch faster with more points
    const baseSpeed = 0.01 + 0.00015 * points

    const animate = () => {
      t += baseSpeed

      // Pulse envelope in [0..1]; raising to pulsePower gives short, strong bursts
      const pulsePhase = (Math.sin(t * Math.PI * 2 * pulseFreq) + 1) * 0.5
      const envelope = Math.pow(pulsePhase, pulsePower)

      // Effective amplitude: points-based + pulsed boost
      const amp = baseAmp * (1 + pulseDepth * envelope)

      const t2 = t * (0.7 + Math.min(points / 200, 0.6)) // small secondary phase speed-up

      const d = Array.from({ length: 80 }, (_, i) => {
        const x = (i / 79) * 1000
        const y =
          200 +
          Math.sin(i * f1 + t)  * 18 * amp +  // main wave
          Math.cos(i * f2 + t2) *  6 * amp    // shimmer
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      }).join(' ')

      ref.current?.setAttribute('d', d)
      raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [points, muted])

  return (
    <section className="bg-[#0E1117] border-y border-white/5">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-xl font-semibold text-white/90 mb-6">Signals in Motion</h2>
        <div className="rounded-2xl bg-gradient-to-b from-[#191B20] to-[#111218] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)] border border-white/10">
          <svg viewBox="0 0 1000 400" className="w-full h-[320px] block">
            <defs>
              <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00E5FF" />
                <stop offset="50%" stopColor="#7C4DFF" />
                <stop offset="100%" stopColor="#00FFA3" />
              </linearGradient>
            </defs>
            <path ref={ref} stroke="url(#g1)" strokeWidth="2.5" fill="none" />
          </svg>
        </div>
      </div>
    </section>
  )
}