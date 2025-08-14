// src/components/GraphSection.tsx
import { useEffect, useMemo, useRef } from 'react'

type Props = { points?: number; muted?: boolean } // muted = treat as logged out

export default function GraphSection({ points = 0, muted = false }: Props) {
  const ref = useRef<SVGPathElement>(null)

  // Always provide an initial flat path so the graph never renders empty
  const FLAT_D = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => {
      const x = (i / 79) * 1000
      const y = 200
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    }).join(' ')
  }, [])

  useEffect(() => {
    let t = 0
    let raf = 0

    const isFlat = muted || points <= 0

    // draw once (flat) and do not animate
    if (isFlat) {
      ref.current?.setAttribute('d', FLAT_D)
      return () => { if (raf) cancelAnimationFrame(raf) }
    }

    // -------- points-driven mappings --------
    // Pulse power schedule:
    // 0/unauth → 1 (handled by flat mode)
    // 100 → 10, 150 → 13, 200 → 16, then +3 every +50 (=> +0.06 per point after 100)
    const pulsePower = points <= 100 ? 10 : 10 + 0.06 * (points - 100)

    // Pulse gets deeper with points, saturates
    const pulseDepth = Math.min(0.15 + points * 0.004, 0.7)

    // Stronger signals thump slower
    const pulseFreq = Math.max(0.08, 0.25 - points * 0.0008)

    // Base amplitude: gentle up to 100, ramps after
    const baseAmp = points <= 100 ? 6 * (points / 100) : 6 + (points - 100) * 0.3

    // Slightly richer wave as points grow
    const f1 = 0.35 + 0.0015 * points
    const f2 = 0.12 + 0.0010 * points

    // Time speed nudges up with points
    const baseSpeed = 0.01 + 0.00015 * points

    const animate = () => {
      t += baseSpeed

      // Pulse envelope [0..1], sharpened by pulsePower
      const pulsePhase = (Math.sin(t * Math.PI * 2 * pulseFreq) + 1) * 0.5
      const envelope = Math.pow(pulsePhase, pulsePower)

      // Effective amplitude
      const amp = baseAmp * (1 + pulseDepth * envelope)

      const t2 = t * (0.7 + Math.min(points / 200, 0.6))

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

    // draw immediately so there’s no single empty frame, then animate
    ref.current?.setAttribute('d', FLAT_D)
    raf = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(raf)
  }, [points, muted, FLAT_D])

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
            {/* Give the path an initial flat 'd' so it shows even before effects run */}
            <path
              ref={ref}
              d={FLAT_D}
              stroke="url(#g1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </section>
  )
}