// src/components/GraphSection.tsx
import { useEffect, useMemo, useRef } from 'react'

type Props = { points?: number }

export default function GraphSection({ points = 0 }: Props) {
  const ref = useRef<SVGPathElement>(null)

  // default path so it never renders empty
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

    // --- Gentle mappings (pixels), carefully clamped ---
    const p = Math.max(0, Number(points) || 0)

    // Base wave height in px (peak component before multipliers)
    // 0pts→ ~2px, 100pts→ ~8px, 200pts→ ~12px, then +0.05px per extra point
    const baseAmpPx =
      p <= 100 ? 2 + 6 * (p / 100) : 8 + Math.min(4, (p - 100) * 0.04) // cap at ~12px around 200
    const extraAfter200 = Math.max(0, p - 200) * 0.05
    const ampPx = Math.min(16, baseAmpPx + extraAfter200) // hard cap ~16px

    // Pulse strength schedule requested:
    // 100→10, 150→13, 200→16, +3 per +50 after that
    const pulsePower = p <= 100 ? 10 : 10 + 0.06 * (p - 100)

    // Depth: how much the pulse boosts amplitude (kept modest)
    const pulseDepth = Math.min(0.10 + p * 0.0025, 0.35) // 0.35 max

    // Pulse frequency: slower as points grow a little
    const pulseFreq = Math.max(0.05, 0.18 - p * 0.0005) // ~0.13 at 100, ~0.08 at 200

    // Wave frequencies: small so it looks like a signal, not a tight sine
    const f1 = 0.20 + 0.0008 * Math.min(p, 200)
    const f2 = 0.05 + 0.0005 * Math.min(p, 200)

    // Time speed: very slow at 0, gradually faster (but still calm)
    const baseSpeed = 0.003 + 0.00006 * p // ~0.009 at 100, ~0.015 at 200

    const animate = () => {
      t += baseSpeed

      // Pulse envelope in [0..1], sharpened by pulsePower
      const pulsePhase = (Math.sin(t * Math.PI * 2 * pulseFreq) + 1) * 0.5
      const envelope = Math.pow(pulsePhase, pulsePower)

      // Effective amplitude in px (kept small and stable)
      const A = ampPx * (1 + pulseDepth * envelope) // stays in ~2..~22 px range max

      const t2 = t * 0.9 // slight phase variation

      const d = Array.from({ length: 80 }, (_, i) => {
        const x = (i / 79) * 1000
        const y =
          200 +
          Math.sin(i * f1 + t)  * A +  // main wave (A px)
          Math.cos(i * f2 + t2) * (A * 0.33) // subtle shimmer
        // clamp to viewbox just in case
        const yc = Math.max(120, Math.min(280, y))
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${yc.toFixed(2)}`
      }).join(' ')

      ref.current?.setAttribute('d', d)
      raf = requestAnimationFrame(animate)
    }

    // draw once, then animate
    ref.current?.setAttribute('d', FLAT_D)
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [points, FLAT_D])

  const usingGradient = (points ?? 0) > 0

  return (
    <section className="bg-[#0E1117] border-y border-white/5">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-xl font-semibold text-white/90 mb-6">Signals in Motion</h2>
        <div className="rounded-2xl bg-gradient-to-b from-[#191B20] to-[#111218] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)] border border-white/10">
          <svg viewBox="0 0 1000 400" className="w-full h-[320px] block">
            <defs>
              <linearGradient id="g1" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1000" y2="0">
                <stop offset="0%"   stopColor="#00E5FF" />
                <stop offset="50%"  stopColor="#7C4DFF" />
                <stop offset="100%" stopColor="#00FFA3" />
              </linearGradient>
            </defs>
            <path
              ref={ref}
              d={FLAT_D}
              stroke={usingGradient ? 'url(#g1)' : '#00E5FF'}
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