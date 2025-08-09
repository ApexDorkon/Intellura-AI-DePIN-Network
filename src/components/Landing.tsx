export default function Landing() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl place-items-center px-4">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            Intelligence, Decentralized.
          </span>
        </h1>
        <p className="mt-4 text-white/70 max-w-prose mx-auto">
          Where the network thinks, predicts, and evolves with you.
        </p>

        <div className="mt-8 flex justify-center">
          <a
            href={`${import.meta.env.VITE_API_BASE}/auth/x/login`}
            className="rounded-lg bg-white text-black px-5 py-3 font-semibold hover:bg-white/90"
          >
            Connect X
          </a>
        </div>
      </div>
    </section>
  )
}
