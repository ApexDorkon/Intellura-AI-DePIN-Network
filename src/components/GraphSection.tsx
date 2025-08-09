// src/components/GraphSection.tsx
import { useEffect, useRef } from 'react'

type Props = { points?: number }

export default function GraphSection({ points = 0 }: Props) {
  const ref = useRef<SVGPathElement>(null)

  useEffect(() => {
    let t = 0, raf: number
    const animate = () => {
      t += 0.02
      const amp = Math.min(1 + points / 100, 5)
      const d = Array.from({ length: 80 }, (_, i) => {
        const x = (i / 79) * 1000
        const y =
          200 +
          Math.sin(i * 0.35 + t) * 60 * amp +
          Math.cos(i * 0.12 + t * 0.7) * 20 * amp
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
                <stop offset="0%" stopColor="#00E5FF"/>
                <stop offset="50%" stopColor="#7C4DFF"/>
                <stop offset="100%" stopColor="#00FFA3"/>
              </linearGradient>
            </defs>
            <path ref={ref} stroke="url(#g1)" strokeWidth="2.5" fill="none" />
          </svg>
        </div>
      </div>
    </section>
  )
}
