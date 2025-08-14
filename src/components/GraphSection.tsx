// src/components/GraphSection.tsx
import { useEffect, useMemo, useRef } from 'react'

type Props = { points?: number } // <-- no more muted

export default function GraphSection({ points = 0 }: Props) {
  const ref = useRef<SVGPathElement>(null)

  // Always have a default flat path so it renders immediately
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

    // If no points, draw flat and skip RAF entirely
    if (!(points > 0)) {
      ref.current?.setAttribute('d', FLAT_D)
      return () => { if (raf) cancelAnimationFrame(raf) }
    }

    // ---- points-driven mappings ----
    const pulsePower = points <= 100 ? 10 : 10 + 0.06 * (points - 100)  // 100=>10, 150=>13, 200=>16 …
    const pulseDepth = Math.min(0.15 + points * 0.004, 0.7)
    const pulseFreq  = Math.max(0.08, 0.25 - points * 0.0008)          // stronger = slower thumps
    const baseAmp    = points <= 100 ? 6 * (points / 100) : 6 + (points - 100) * 0.3
    const f1 = 0.35 + 0.0015 * points
    const f2 = 0.12 + 0.0010 * points
    const baseSpeed  = 0.01 + 0.00015 * points

    const animate = () => {
      t += baseSpeed
      const pulsePhase = (Math.sin(t * Math.PI * 2 * pulseFreq) + 1) * 0.5
      const envelope = Math.pow(pulsePhase, pulsePower)
      const amp = baseAmp * (1 + pulseDepth * envelope)
      const t2 = t * (0.7 + Math.min(points / 200, 0.6))

      const d = Array.from({ length: 80 }, (_, i) => {
        const x = (i / 79) * 1000
        const y =
          200 +
          Math.sin(i * f1 + t)  * 18 * amp +
          Math.cos(i * f2 + t2) *  6 * amp
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      }).join(' ')

      ref.current?.setAttribute('d', d)
      raf = requestAnimationFrame(animate)
    }

    // draw once, then animate
    ref.current?.setAttribute('d', FLAT_D)
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [points, FLAT_D])

  const flat = !(points > 0) // render hint (only affects stroke style)

  return (
    <section className="bg-[#0E1117] border-y border-white/5">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-xl font-semibold text-white/90 mb-6">Signals in Motion</h2>
        <div className="rounded-2xl bg-gradient-to-b from-[#191B20] to-[#111218] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)] border border-white/10">
          <svg viewBox="0 0 1000 400" className="w-full h-[320px] block">
            <defs>
              <linearGradient id="g1" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1000" y2="0">
                <stop offset="0%" stopColor="#00E5FF" />
                <stop offset="50%" stopColor="#7C4DFF" />
                <stop offset="100%" stopColor="#00FFA3" />
              </linearGradient>
            </defs>
            <path
              ref={ref}
              d={FLAT_D}
              stroke={flat ? '#00E5FF' : 'url(#g1)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
    </section>
  )
}