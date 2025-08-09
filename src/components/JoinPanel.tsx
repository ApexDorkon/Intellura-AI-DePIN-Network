import { useEffect, useState } from 'react';
import { useAuth } from '../state/auth';
import { getBalance, getMyReferral, setWallet, applyReferral } from '../lib/api';

export default function JoinPanel() {
  const { me } = useAuth();

  const [balance, setBalance] = useState<number>(0);
  const [myRef, setMyRef] = useState<{ code: string; shareUrl: string } | null>(null);
  const [wallet, setWalletInput] = useState('');
  const [refCode, setRefCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // After auth: load balance + ensure/refetch referral code
  useEffect(() => {
    if (!me) return;
    setLoading(true);
    (async () => {
      try {
        const [b, r] = await Promise.all([
          getBalance().catch(() => ({ balance: 0 })),
          getMyReferral().catch(() => null as any),
        ]);
        setBalance(b?.balance ?? 0);
        if (r?.code) setMyRef(r);
      } finally {
        setLoading(false);
      }
    })();
  }, [me]);

  /* ============= Not authed ============= */
  if (!me) {
    return (
      <section className="bg-[#0B0D12]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="relative rounded-3xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 backdrop-blur-3xl backdrop-saturate-50" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/15" />
            <div className="relative grid place-items-center px-6 py-16 sm:py-20">
              <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                  <h3 className="text-3xl font-extrabold text-white">Join Intellura</h3>
                  <p className="text-white/80 mt-3">
                    Connect your X account to unlock referrals and start earning points.
                  </p>
                </div>
                <a
                  href={`${import.meta.env.VITE_API_BASE}/auth/x/login`}
                  className="py-3 px-6 rounded-full bg-white text-black flex items-center gap-2 border border-white/20 hover:bg-gray-200 transition"
                >
                  <span className="font-semibold">Connect X</span>
                  <span className="text-lg">𝕏</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ============= Authed (single panel: setup + status) ============= */
  return (
    <section className="bg-[#0B0D12]">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Left — Finish setup */}
            <div>
              <h3 className="text-xl font-semibold text-white">Finish setup</h3>
              <p className="text-white/60 text-sm mt-1">Enter a wallet and optional referral code (get +5 points).</p>

              <div className="mt-6 grid gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Wallet address</label>
                  <input
                    value={wallet}
                    onChange={(e) => setWalletInput(e.target.value)}
                    placeholder="0x…"
                    className="w-full rounded-lg bg-black/40 text-white placeholder-white/30 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Referral code (optional)</label>
                  <input
                    value={refCode}
                    onChange={(e) => setRefCode(e.target.value)}
                    placeholder="friend123"
                    className="w-full rounded-lg bg-black/40 text-white placeholder-white/30 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  disabled={!wallet || submitting}
                  onClick={async () => {
                    try {
                      setSubmitting(true);
                      await setWallet(wallet);                // <-- real API
                      if (refCode.trim()) await applyReferral(refCode.trim()); // optional, ignore failures
                      // refresh right column
                      const [b, r] = await Promise.all([
                        getBalance().catch(() => ({ balance: 0 })),
                        getMyReferral().catch(() => null as any),
                      ]);
                      setBalance(b?.balance ?? 0);
                      if (r?.code) setMyRef(r);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="rounded-full bg-white text-black px-5 py-2 font-semibold hover:bg-gray-200 disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Join'}
                </button>
              </div>
            </div>

            {/* Right — Status (points + referral) */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-white">{me?.handle ? `@${me.handle}` : 'Welcome'}</h4>
                  <p className="text-white/70">Your Intellura status</p>
                </div>

                <div className="rounded-xl bg-black/40 border border-white/10 px-4 py-3">
                  <div className="text-white/60 text-xs">Points</div>
                  <div className="text-2xl font-extrabold text-white">{loading ? '—' : balance}</div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm text-white/70 mb-1">Your referral link</label>
                {loading ? (
                  <div className="h-10 w-full rounded-lg bg-white/10 animate-pulse" />
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
                      className="rounded-lg bg-white text-black px-4 font-semibold hover:bg-gray-200 disabled:opacity-50"
                    >
                      Copy
                    </button>
                  </div>
                )}
                {!myRef?.code && !loading && (
                  <p className="text-xs text-white/50 mt-2">No code yet? It will appear here once created.</p>
                )}
              </div>

              <p className="text-white/60 text-sm mt-4">Share your link — earn points as friends join.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
