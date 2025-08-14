// src/components/GraphSection.tsx
import { useEffect, useRef } from 'react'

type Props = { points?: number }

export default function GraphSection({ points = 0 }: Props) {
  const ref = useRef<SVGPathElement>(null)

  useEffect(() => {
    let t = 0
    let raf = 0

    // Map points → level [0..1+] using a gentle curve (fast response at low points, taper later)
    const level = Math.log1p(Math.max(0, points)) / Math.log(101) // ~0 at 0pts, ~1 at 100pts, >1 above

    // Base amplitude & frequency
    // - idleAmp keeps a tiny motion when 0 points
    // - baseAmp grows with points
    const idleAmp = 3  // px – tiny “alive” motion when 0 points
    const baseAmp = 20 * level // grows with points

    // Pulse envelope:
    // - when 0 points → slow & rare pulse, small boost
    // - when more points → faster pulses & stronger boost
    const pulseFreq = 0.15 + 0.6 * Math.min(level, 1)   // Hz-ish feel in our arbitrary time
    const pulsePower = 6 - 4 * Math.min(level, 1)       // sharper pulse at low points
    const pulseDepth = 0.15 + 0.55 * Math.min(level, 1) // how hard it hits

    // “mostly still but sometimes pulse” for 0 points:
    // - We keep the underlying t speed small when points are ~0
    const baseSpeed = 0.008 + 0.025 * Math.min(level, 1)

    const animate = () => {
      t += baseSpeed

      // Pulse envelope in [0..1], squashed to get short spikes
      // Use (sin + 1)/2 then raise to a power for short bursts
      const pulsePhase = (Math.sin(t * Math.PI * 2 * pulseFreq) + 1) * 0.5
      const envelope = Math.pow(pulsePhase, pulsePower)

      // Effective amplitude: idle motion + points-based + pulsed boost
      const amp = idleAmp + baseAmp * (1 + pulseDepth * envelope)

      // Slightly increase complexity & speed with points
      const f1 = 0.35 + 0.15 * Math.min(level, 1)
      const f2 = 0.12 + 0.10 * Math.min(level, 1)
      const t2 = t * (0.7 + 0.6 * Math.min(level, 1))

      const d = Array.from({ length: 80 }, (_, i) => {
        const x = (i / 79) * 1000
        const y =
          200 +
          Math.sin(i * f1 + t) * 18 * amp +   // main wave
          Math.cos(i * f2 + t2) * 6 * amp     // secondary shimmer
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      }).join(' ')

      ref.current?.setAttribute('d', d)
      raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [points])

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