export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#0B0D12]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Intelligence, <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">Decentralized.</span>
        </h1>
        <p className="mt-4 max-w-xl text-white/70">
          Where the network thinks, predicts, and evolves with you.
        </p>
      </div>
      {/* subtle backdrop shimmer */}
      <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(1200px_600px_at_20%_-20%,#7C4DFF_0%,transparent_60%)]" />
    </section>
  )
}
