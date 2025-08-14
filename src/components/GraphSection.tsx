// src/components/GraphSection.tsx
import { useEffect, useRef } from 'react'

type Props = { points?: number; muted?: boolean }

export default function GraphSection({ points = 0, muted = false }: Props) {
  const ref = useRef<SVGPathElement>(null)

  useEffect(() => {
    let t = 0
    let raf = 0

    const rawLevel = Math.log1p(Math.max(0, points)) / Math.log(101)
    const level = Math.min(rawLevel, 1)

    // When muted (not authed or zero points), keep it *barely* alive:
    const idleAmp  = muted ? 1 : 3
    const baseAmp  = (muted ? 8 : 20) * level
    const baseSpeed = muted ? 0.003 : 0.008 + 0.025 * level

    const pulseFreq  = muted ? 0.05 : 0.15 + 0.6 * level
    const pulsePower = muted ? 7    : 6 - 4 * level
    const pulseDepth = muted ? 0.10 : 0.15 + 0.55 * level

    const f1 = 0.35 + (muted ? 0.05 : 0.15) * level
    const f2 = 0.12 + (muted ? 0.05 : 0.10) * level

    const animate = () => {
      t += baseSpeed
      const pulsePhase = (Math.sin(t * Math.PI * 2 * pulseFreq) + 1) * 0.5
      const envelope = Math.pow(pulsePhase, pulsePower)
      const amp = idleAmp + baseAmp * (1 + pulseDepth * envelope)
      const t2 = t * (0.7 + (muted ? 0.3 : 0.6) * level)

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