// src/components/Quests.tsx
import { useEffect, useMemo, useState } from 'react'
import { listQuests, earnDailyPoints, claimQuest, getBalance, Quest } from '../lib/api'
import { useAuth } from '../state/auth'

type Props = {
  onAfterClaim?: (newTotalPoints: number) => void | Promise<void>
}

const CLAIM_DELAY_MS = 10_000

function msUntil(tsIso?: string | null) {
  if (!tsIso) return 0
  const now = Date.now()
  const t = new Date(tsIso).getTime()
  return Math.max(0, t - now)
}

function fmtHMS(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${ss}s`
  return `${ss}s`
}

// Persist quest timers in sessionStorage to survive refreshes
const TIMER_KEY = 'quest_timers_v1'
type TimerMap = Record<string, number> // questId -> startedAt (ms)

function loadTimers(): TimerMap {
  try {
    const raw = sessionStorage.getItem(TIMER_KEY)
    return raw ? (JSON.parse(raw) as TimerMap) : {}
  } catch { return {} }
}
function saveTimers(map: TimerMap) {
  try { sessionStorage.setItem(TIMER_KEY, JSON.stringify(map)) } catch {}
}

export default function Quests({ onAfterClaim }: Props) {
  const { me } = useAuth()
  const [loading, setLoading] = useState(false)
  const [quests, setQuests] = useState<Quest[]>([])
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Daily state
  const [claimingDaily, setClaimingDaily] = useState(false)
  const [dailyNextAt, setDailyNextAt] = useState<string | null>(null)
  const remainingMsDaily = useMemo(() => msUntil(dailyNextAt), [dailyNextAt])
  const isDailyLocked = !!dailyNextAt && remainingMsDaily > 0

  // Per-quest start times and ticking clock
  const [questTimers, setQuestTimers] = useState<TimerMap>(() => loadTimers())
  const [, setTick] = useState(0) // simple rerender driver

  useEffect(() => {
    if (!me) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const qs = await listQuests().catch(() => [])
        if (alive) setQuests(qs || [])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [me])

  // save timers whenever they change
  useEffect(() => { saveTimers(questTimers) }, [questTimers])

  // global 1s heartbeat for countdowns
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (!me) return null

  const secondsLeftFor = (questId: string) => {
    const startedAt = questTimers[questId]
    if (!startedAt) return 0
    const left = startedAt + CLAIM_DELAY_MS - Date.now()
    return Math.max(0, Math.ceil(left / 1000))
  }

  const startQuestTimer = (questId: string) => {
    setQuestTimers((prev) => {
      // Don't restart if already running
      if (prev[questId]) return prev
      return { ...prev, [questId]: Date.now() }
    })
  }

  const clearQuestTimer = (questId: string) => {
    setQuestTimers((prev) => {
      const { [questId]: _, ...rest } = prev
      return rest
    })
  }

  return (
    <section className="bg-[#0B0D12]">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-lg font-semibold text-white mb-4">Quests</h3>

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

          {/* DAILY CLAIM */}
          <div className="mb-6 rounded-xl border border-white/10 bg-black/30 p-4 sm:p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-white font-medium">Daily Signal Boost</div>
              <div className="text-sm text-white/70">
                Claim free points once every 24h.
                {isDailyLocked && (
                  <span className="ml-2 text-white/60">Next in {fmtHMS(remainingMsDaily)}</span>
                )}
              </div>
            </div>
            <button
              className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
              disabled={claimingDaily || isDailyLocked}
              onClick={async () => {
                setClaimingDaily(true)
                setBanner(null)
                try {
                  const res = await earnDailyPoints()
                  if (res.ok) {
                    setBanner({ type: 'success', text: `+${res.data.amount} points claimed!` })
                    setDailyNextAt(res.data.next_available_at)
                    const b = await getBalance().catch(() => ({ balance: 0 }))
                    await Promise.resolve(onAfterClaim?.(b.balance))
                  } else if (res.status === 409) {
                    setDailyNextAt(res.data?.next_available_at ?? null)
                    setBanner({ type: 'error', text: 'Already claimed. Come back later.' })
                  } else if (res.status === 401) {
                    setBanner({ type: 'error', text: 'Please sign in to claim.' })
                  } else {
                    setBanner({ type: 'error', text: 'Could not claim daily right now.' })
                  }
                } finally {
                  setClaimingDaily(false)
                  setTimeout(() => setBanner(null), 3000)
                }
              }}
            >
              {claimingDaily ? 'Claiming…' : isDailyLocked ? 'Not ready' : 'Claim'}
            </button>
          </div>

          {/* QUEST LIST */}
          <div className="grid gap-3">
            {loading ? (
              <div className="h-10 w-full animate-pulse rounded-lg bg-white/10" />
            ) : quests.length === 0 ? (
              <div className="text-sm text-white/60">No quests available right now.</div>
            ) : (
              quests.map((q) => {
                const secs = secondsLeftFor(q.id)
                const canClaim = secs === 0
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/30 p-4"
                  >
                    <div>
                      <div className="text-white font-medium">{q.name}</div>
                      <div className="text-xs text-white/60">Reward: {q.points} pts</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {q.link ? (
                        <a
                          href={q.link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => startQuestTimer(q.id)}
                          className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                        >
                          Open
                        </a>
                      ) : (
                        // If no link, provide a button to start the timer anyway
                        <button
                          onClick={() => startQuestTimer(q.id)}
                          className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
                          disabled={!!questTimers[q.id]} // already running
                        >
                          Start
                        </button>
                      )}

                      <button
                        className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
                        disabled={!!q.completed || !canClaim}
                        onClick={async () => {
                          setBanner(null)
                          const res = await claimQuest(q.id)
                          if (res.ok) {
                            setBanner({ type: 'success', text: `+${res.data.points_awarded} points from "${q.name}"` })
                            clearQuestTimer(q.id)
                            // mark as completed locally
                            setQuests((prev) => prev.map((it) => it.id === q.id ? { ...it, completed: true } : it))
                            const b = await getBalance().catch(() => ({ balance: 0 }))
                            await Promise.resolve(onAfterClaim?.(b.balance))
                          } else {
                            const msg =
                              res.status === 409
                                ? 'Already claimed.'
                                : res.status === 400
                                ? 'Please connect your wallet first.'
                                : res.status === 401
                                ? 'Please sign in to claim.'
                                : res.status === 404
                                ? 'Quest not found.'
                                : 'Something went wrong.'
                            setBanner({ type: 'error', text: msg })
                          }
                          setTimeout(() => setBanner(null), 3000)
                        }}
                      >
                        {q.completed
                          ? 'Completed'
                          : canClaim
                          ? (q.button_text || 'Claim')
                          : `Wait ${secs}s`}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </section>
  )
}