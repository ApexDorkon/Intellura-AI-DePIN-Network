import { useAuth } from '../state/auth'
import logoUrl from '../assets/IntelluraLogo.png'
import xLogo from '../assets/xLogo.svg'
import { API_BASE } from '../lib/config'
export default function Header() {
  const { me, logout } = useAuth()

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0B0D12]/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Left: logo */}
        <a href="/" className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Intellura"
            className="h-10 w-10 object-contain invert"
          />
          <span className="text-xl font-bold tracking-wide bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            Intellura
          </span>
        </a>

        {/* Right: auth */}
        <div className="flex items-center gap-3">
          {me ? (
            <button
              onClick={logout}
              className="rounded-full border border-white/20 px-5 py-2 text-base text-white hover:bg-white/10 transition"
            >
              Logout
            </button>
          ) : (
            <a
              href={`${API_BASE}/auth/x/login`}
              className="py-2 px-5 rounded-full bg-white text-black flex items-center gap-2 border border-white/20 hover:bg-gray-200 transition"
            >
              <span className="text-base font-semibold">Connect</span>
              <img src={xLogo} alt="X" className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
