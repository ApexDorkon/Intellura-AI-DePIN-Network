// src/components/JoinPanel.tsx
import { useEffect, useState } from 'react'
import { BrowserProvider } from 'ethers'
import { useAuth } from '../state/auth'
import {
  getBalance,
  getMyReferral,
  getMyReferrer,
  getWalletNonce,
  connectWallet,
  applyReferral as applyReferralAPI,
} from '../lib/api'
import { API_BASE } from '../lib/config'

declare global { interface Window { ethereum?: any } }

const shortAddr = (a: string) => (a && a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '')
const isLikelyRef = (s: string) => /^[A-Z0-9]{4,12}$/.test((s || '').trim())
const isHexWallet = (w?: string) => !!(w && w.startsWith('0x') && w.length === 42)

function friendlyError(err: unknown): string {
  const raw = (err as any)?.message ?? err
  if (typeof raw === 'string') {
    try { const j = JSON.parse(raw); if (j?.detail) return String(j.detail) } catch {}
    const m = raw.match(/"detail"\s*:\s*"([^"]+)"/); if (m?.[1]) return m[1]
    return raw
  }
  return 'Something went wrong.'
}

export default function JoinPanel() {
  const { me } = useAuth()

  // ----- Profile from /me (single source of truth) -----
  const username = (me as any)?.handle ?? (me as any)?.x_username ?? 'User'
  const avatar   = (me as any)?.avatarUrl ?? (me as any)?.profile_image_url ?? ''
  const walletFromMe = String((me as any)?.wallet_address ?? '').toLowerCase()
  const hasWallet = isHexWallet(walletFromMe)

  // ----- UI state -----
  const [connecting, setConnecting] = useState(false)
  const [balance, setBalance] = useState<number>(0)
  const [myRef, setMyRef] = useState<{ code: string; shareUrl: string } | null>(null)
  const [refCode, setRefCode] = useState('')
  const [hasReferrer, setHasReferrer] = useState<boolean | null>(null)
  const [referrer, setReferrer] = useState<{ x_username: string; profile_image_url?: string; code?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [fieldErr, setFieldErr] = useState<{ wallet?: string; ref?: string }>({})
  const [copied, setCopied] = useState(false)

  // ----- After auth: load points, my code, and referrer state -----
  useEffect(() => {
    if (!me) return
    let mounted = true
    setLoading(true)
    ;(async () => {
      try {
        const [b, r, rr] = await Promise.all([
          getBalance().catch(() => ({ balance: 0 })),
          getMyReferral().catch(() => null as any),
          getMyReferrer().catch(() => ({ has_referrer: false } as any)),
        ])
        if (!mounted) return
        setBalance(b?.balance ?? 0)
        if (r?.code) setMyRef(r)
        if (typeof rr?.has_referrer === 'boolean') {
          setHasReferrer(rr.has_referrer)
          setReferrer(rr.has_referrer ? rr.referrer ?? null : null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [me])

  // ----- Connect wallet (backend persists; UI reads from /me) -----
  const handleConnectWallet = async () => {
    setFieldErr({})
    setBanner(null)
    try {
      const eth = window.ethereum
      if (!eth) throw new Error('MetaMask not detected. Please install or enable it.')
      setConnecting(true)

      await eth.request({ method: 'eth_requestAccounts' })
      const provider = new BrowserProvider(eth)
      const signer = await provider.getSigner()
      const addr = (await signer.getAddress()).toLowerCase()

      const { nonce } = await getWalletNonce(addr)
      const signature = await signer.signMessage(`Sign this nonce to authenticate: ${nonce}`)
      await connectWallet(addr, signature)

      setBanner({ type: 'success', text: 'Wallet connected.' })

      // If your auth store exposes a refresh, uncomment:
      // ;(useAuth as any).getState?.().refresh?.()
    } catch (e: any) {
      const msg = friendlyError(e)
      if (!/user rejected/i.test(msg)) {
        setFieldErr((p) => ({ ...p, wallet: msg }))
        setBanner({ type: 'error', text: msg })
      }
    } finally {
      setConnecting(false)
      setTimeout(() => setBanner(null), 3000)
    }
  }

  // ---------- Not authenticated ----------
  if (!me) {
    return (
      <section className="bg-[#0B0D12]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            <div className="absolute inset-0 backdrop-blur-3xl backdrop-saturate-50" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/15" />
            <div className="relative grid place-items-center px-6 py-16 sm:py-20">
              <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                  <h3 className="text-3xl font-extrabold text-white">Join Intellura</h3>
                  <p className="mt-3 text-white/80">Connect your X account to unlock referrals and start earning points.</p>
                </div>
                <a
                  href={`${API_BASE}/auth/x/login`}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-black border border-white/20 hover:bg-gray-200 transition"
                >
                  <span>Connect X</span><span className="text-lg">𝕏</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ---------- Authenticated ----------
  return (
    <section className="bg-[#0B0D12]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur">
          {banner && (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                banner.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {banner.text}
            </div>
          )}

          <div className="grid gap-8 md:grid-cols-2">
            {/* LEFT — profile + wallet (strictly from /me) */}
            <div className="flex flex-col">
              <div className="mb-6 flex items-center gap-4">
                <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-white/10">
                  {avatar ? (
                    <img src={avatar} alt={username} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-white/10" />
                  )}
                </div>
                <div>
                  <div className="text-white font-semibold text-lg">@{username}</div>
                  {hasReferrer && referrer && (
                    <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                      <span className="opacity-75">Invited by</span>
                      {referrer.profile_image_url && (
                        <img
                          src={referrer.profile_image_url}
                          alt={referrer.x_username}
                          className="h-4 w-4 rounded-full"
                        />
                      )}
                      <span className="font-medium">@{referrer.x_username}</span>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white">Tune in to the signal</h3>
              <p className="mt-2 text-sm text-white/70">
                Link your on-chain wallet to start tracking rewards. Add an invite code to boost your starting signal.
              </p>

              <div className="mt-4 flex flex-col gap-2 max-w-xs">
                {hasWallet ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-sm text-white/80">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {shortAddr(walletFromMe)}
                  </span>
                ) : (
                  <button
                    onClick={handleConnectWallet}
                    disabled={connecting}
                    className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-gray-200 disabled:opacity-60"
                  >
                    {connecting ? 'Connecting…' : '🦊 Connect wallet'}
                  </button>
                )}

                {fieldErr.wallet && <div className="text-xs text-rose-400">{fieldErr.wallet}</div>}
              </div>
            </div>

            {/* RIGHT — status + referrals */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white">Your Intellura status</h4>
                  <p className="text-white/70 text-sm">Keep sharing and earning.</p>
                </div>
                <div className="rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-center">
                  <div className="text-xs text-white/60">Points</div>
                  <div className="text-xl font-extrabold text-white">{loading ? '—' : balance}</div>
                </div>
              </div>

              {/* Referral input + CTA ONLY when user has no referrer */}
              {hasReferrer === false && (
                <>
                  <div className="mt-4">
                    <label className="mb-1 block text-sm text-white/70">
                      Referral code <span className="text-white/40">(optional, +100 points)</span>
                    </label>
                    <input
                      value={refCode}
                      onChange={(e) => {
                        setRefCode(e.target.value.toUpperCase())
                        if (fieldErr.ref) setFieldErr((p) => ({ ...p, ref: undefined }))
                      }}
                      placeholder="FUDCH8"
                      className={`w-full rounded-lg bg-black/40 text-white placeholder-white/30 border px-3 py-2 outline-none focus:ring-2 ${
                        fieldErr.ref ? 'border-rose-500 focus:ring-rose-500' : 'border-white/10 focus:ring-violet-500'
                      }`}
                    />
                    {fieldErr.ref && <div className="mt-1 text-xs text-rose-400">{fieldErr.ref}</div>}
                  </div>

                  <div className="mt-4">
                    <button
                      disabled={!refCode.trim()}
                      onClick={async () => {
                        setFieldErr({})
                        setBanner(null)
                        const code = refCode.trim().toUpperCase()
                        if (code && !isLikelyRef(code)) {
                          setFieldErr({ ref: 'Invalid code format.' })
                          return
                        }
                        try {
                          setSaving(true)
                          await applyReferralAPI(code)
                          const rr = await getMyReferrer().catch(() => ({ has_referrer: true } as any))
                          if (rr?.has_referrer) {
                            setHasReferrer(true)
                            setReferrer(rr.referrer ?? null)
                          }
                          setBanner({ type: 'success', text: 'Referral applied.' })
                          setRefCode('')
                          const [b, r] = await Promise.all([
                            getBalance().catch(() => ({ balance: 0 })),
                            getMyReferral().catch(() => null as any),
                          ])
                          setBalance(b?.balance ?? 0)
                          if (r?.code) setMyRef(r)
                        } catch (e: any) {
                          setBanner({ type: 'error', text: friendlyError(e) })
                        } finally {
                          setSaving(false)
                          setTimeout(() => setBanner(null), 3000)
                        }
                      }}
                      className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
                    >
                      {saving ? 'Boosting…' : 'Boost signal'}
                    </button>
                  </div>
                </>
              )}

              {/* Referral link (always visible) */}
              <div className="mt-5">
                <label className="mb-1 block text-sm text-white/70">Your referral link</label>
                {loading ? (
                  <div className="h-10 w-full animate-pulse rounded-lg bg-white/10" />
                ) : (
                  <div className="flex items-stretch gap-2">
                    <input
                      readOnly
                      value={myRef?.shareUrl ?? 'Generating…'}
                      className="flex-1 rounded-lg bg-black/40 text-white border border-white/10 px-3 py-2"
                    />
                    <button
                      disabled={!myRef?.shareUrl}
                      onClick={() => {
                        if (!myRef?.shareUrl) return
                        navigator.clipboard.writeText(myRef.shareUrl)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1500)
                      }}
                      className={`rounded-lg px-3 text-sm font-semibold transition ${
                        copied ? 'bg-emerald-500 text-black' : 'bg-white text-black hover:bg-gray-200 disabled:opacity-50'
                      }`}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>

              {/* Tip */}
              <div className="mt-4 rounded-lg border border-white/10 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/10 p-3">
                <div className="text-xs text-white/70">
                  Tip: higher engagement unlocks bonus multipliers during AI signal drops.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}