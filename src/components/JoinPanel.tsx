// src/components/JoinPanel.tsx
import { useEffect, useMemo, useState } from 'react'
import { BrowserProvider } from 'ethers' // ethers v6
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

declare global {
  interface Window {
    ethereum?: any
  }
}

const shortAddr = (a: string) => (a?.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a ?? '')

export default function JoinPanel() {
  const { me } = useAuth()

  // Normalize handle/avatar regardless of backend shape
  const username = useMemo(
    () => (me as any)?.handle ?? (me as any)?.x_username ?? 'User',
    [me],
  )
  const avatar = useMemo(
    () => (me as any)?.avatarUrl ?? (me as any)?.profile_image_url ?? '',
    [me],
  )

  const [balance, setBalance] = useState<number>(0)
  const [myRef, setMyRef] = useState<{ code: string; shareUrl: string } | null>(null)

  // wallet + referral UI state
  const [walletAddress, setWalletAddress] = useState<string>('') // filled after connect
  const [connecting, setConnecting] = useState(false)

  const [refCode, setRefCode] = useState('')
  const [hasReferrer, setHasReferrer] = useState<boolean | null>(null)
  const [referrer, setReferrer] = useState<{
    x_username: string
    profile_image_url?: string
    code?: string
  } | null>(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // After auth: load points, my code, and referrer status
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
    return () => {
      mounted = false
    }
  }, [me])

  // Connect wallet with nonce+signature -> backend links it to current user
  const handleConnectWallet = async () => {
    setErrorMsg(null)
    try {
      const eth = window.ethereum
      if (!eth) throw new Error('MetaMask not detected. Please install or enable it.')

      setConnecting(true)

      // Request accounts and read signer/address
      await eth.request({ method: 'eth_requestAccounts' })
      const provider = new BrowserProvider(eth)
      const signer = await provider.getSigner()
      const addr = (await signer.getAddress()).toLowerCase()

      // 1) get nonce from backend
      const { nonce } = await getWalletNonce(addr)

      // 2) sign the nonce
      const message = `Sign this nonce to authenticate: ${nonce}`
      const signature = await signer.signMessage(message)

      // 3) link wallet on backend
      await connectWallet(addr, signature)

      setWalletAddress(addr)
      setSuccessMsg('Wallet connected!')
      setTimeout(() => setSuccessMsg(null), 2000)
    } catch (e: any) {
      // Ignore user-reject quietly; otherwise show message
      const msg = typeof e?.message === 'string' ? e.message : 'Failed to connect wallet'
      if (!/user rejected/i.test(msg)) setErrorMsg(msg)
    } finally {
      setConnecting(false)
    }
  }

  /* =========================
     Not authenticated
  ========================== */
  if (!me) {
    return (
      <section className="bg-[#0B0D12]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            {/* Heavy veil */}
            <div className="absolute inset-0 backdrop-blur-3xl backdrop-saturate-50" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/15" />

            <div className="relative grid place-items-center px-6 py-16 sm:py-20">
              <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                  <h3 className="text-3xl font-extrabold text-white">Join Intellura</h3>
                  <p className="mt-3 text-white/80">
                    Connect your X account to unlock referrals and start earning points.
                  </p>
                </div>
                <a
                  href={`${API_BASE}/auth/x/login`}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-black border border-white/20 hover:bg-gray-200 transition"
                >
                  <span>Connect X</span>
                  <span className="text-lg">𝕏</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  /* =========================
     Authenticated
  ========================== */
  return (
    <section className="bg-[#0B0D12]">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Left — Profile + Setup */}
            <div>
              {/* Profile header */}
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-white/10">
                  {avatar ? (
                    <img src={avatar} alt={username} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-white/10" />
                  )}
                </div>
                <div>
                  <div className="text-white font-semibold text-lg">@{username}</div>
                  {hasReferrer && referrer ? (
                    <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                      <span className="opacity-75">Invited by</span>
                      {referrer.profile_image_url ? (
                        <img
                          src={referrer.profile_image_url}
                          alt={referrer.x_username}
                          className="h-4 w-4 rounded-full"
                        />
                      ) : null}
                      <span className="font-medium">@{referrer.x_username}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Setup form */}
              <h3 className="mt-6 text-xl font-semibold text-white">Finish setup</h3>
              <p className="mt-1 text-sm text-white/60">
                Connect a wallet and (optionally) enter a referral code for a bonus.
              </p>

              <div className="mt-5 grid gap-4">
                {/* Wallet connect row */}
                <div className="flex flex-wrap items-center gap-3">
                  {walletAddress ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-sm text-white/80">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {shortAddr(walletAddress)}
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

                  {/* Let users change wallet */}
                  {walletAddress && (
                    <button
                      onClick={handleConnectWallet}
                      className="rounded-full border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                    >
                      Change
                    </button>
                  )}
                </div>

                {/* Only show referral input if user does NOT have a referrer yet */}
                {hasReferrer === false && (
                  <div>
                    <label className="mb-1 block text-sm text-white/70">
                      Referral code <span className="text-white/40">(optional, +5 points)</span>
                    </label>
                    <input
                      value={refCode}
                      onChange={(e) => setRefCode(e.target.value)}
                      placeholder="friend123"
                      className="w-full rounded-lg bg-black/40 text-white placeholder-white/30 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  disabled={(!walletAddress && hasReferrer === false && !refCode.trim()) || saving}
                  onClick={async () => {
                    setErrorMsg(null)
                    setSuccessMsg(null)
                    try {
                      setSaving(true)
                      // Wallet is already saved in handleConnectWallet.
                      if (hasReferrer === false && refCode.trim()) {
                        await applyReferralAPI(refCode.trim())
                        // fetch referrer again to hide the input
                        const rr = await getMyReferrer().catch(() => ({ has_referrer: true } as any))
                        if (rr?.has_referrer) {
                          setHasReferrer(true)
                          setReferrer(rr.referrer ?? null)
                        }
                      }
                      // Refresh points & my referral code
                      const [b, r] = await Promise.all([
                        getBalance().catch(() => ({ balance: 0 })),
                        getMyReferral().catch(() => null as any),
                      ])
                      setBalance(b?.balance ?? 0)
                      if (r?.code) setMyRef(r)
                      setSuccessMsg('Saved!')
                    } catch (e: any) {
                      setErrorMsg(typeof e?.message === 'string' ? e.message : 'Failed to save')
                    } finally {
                      setSaving(false)
                      setTimeout(() => {
                        setSuccessMsg(null)
                        setErrorMsg(null)
                      }, 2500)
                    }
                  }}
                  className="rounded-full bg-white text-black px-5 py-2 font-semibold hover:bg-gray-200 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>

                {successMsg && <span className="text-sm text-emerald-400">{successMsg}</span>}
                {errorMsg && <span className="text-sm text-rose-400">{errorMsg}</span>}
              </div>
            </div>

            {/* Right — Status (points + referral) */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-white">Your Intellura status</h4>
                  <p className="text-white/70">Keep sharing and earning.</p>
                </div>

                <div className="rounded-xl bg-black/40 border border-white/10 px-4 py-3">
                  <div className="text-xs text-white/60">Points</div>
                  <div className="text-2xl font-extrabold text-white">{loading ? '—' : balance}</div>
                </div>
              </div>

              <div className="mt-6">
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
                      onClick={() => myRef?.shareUrl && navigator.clipboard.writeText(myRef.shareUrl)}
                      className="rounded-lg bg-white px-4 font-semibold text-black hover:bg-gray-200 disabled:opacity-50"
                    >
                      Copy
                    </button>
                  </div>
                )}
                {!myRef?.code && !loading && (
                  <p className="mt-2 text-xs text-white/50">No code yet? It will appear here once created.</p>
                )}
              </div>

              {/* Subtle hint card */}
              <div className="mt-6 rounded-xl border border-white/10 bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/10 p-4">
                <div className="text-sm text-white/80">
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