import { useEffect, useMemo, useState } from 'react'
import { listQuests, earnDailyPoints, claimQuest, getBalance, Quest } from '../lib/api'
import { useAuth } from '../state/auth'

type Props = { onAfterClaim?: (newTotalPoints: number) => void | Promise<void> }

const CLAIM_DELAY_MS = 10_000 // user must view the quest for 10s before claiming

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

// Persist per-quest countdowns so a refresh doesn’t lose progress
const TIMER_KEY = 'quest_timers_v1'
type TimerMap = Record<string, number> // questId -> startedAt(ms)

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
  const isDailyLocked: boolean = !!dailyNextAt && remainingMsDaily > 0

  // Per-quest 10s timers + global heartbeat
  const [questTimers, setQuestTimers] = useState<TimerMap>(() => loadTimers())
  const [, forceRerender] = useState(0) // heartbeat; ignore first tuple item to avoid TS6133

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

  useEffect(() => { saveTimers(questTimers) }, [questTimers])
  useEffect(() => {
    const id = setInterval(() => forceRerender(v => v + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (!me) return null

  const secondsLeftFor = (questId: string) => {
    const started = questTimers[questId]
    if (!started) return 0
    const left = started + CLAIM_DELAY_MS - Date.now()
    return Math.max(0, Math.ceil(left / 1000))
  }

  const startQuestTimer = (questId: string) => {
    setQuestTimers(prev => (prev[questId] ? prev : { ...prev, [questId]: Date.now() }))
  }
  const clearQuestTimer = (questId: string) => {
    setQuestTimers(prev => {
      const { [questId]: _, ...rest } = prev
      return rest
    })
  }

  return (
    <section className="bg-[#0B0D12]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 backdrop-blur">
          <h3 className="text-2xl font-semibold text-white mb-6">Quests</h3>

          {banner && (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                banner.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {banner.text}
            </div>
          )}

          {/* GRID: left (quests) spans 2 columns; right (daily) spans 1 column & 2 rows */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* LEFT: quest list (two stacked rows) */}
            <div className="md:col-span-2 space-y-4">
              {loading ? (
                <>
                  <div className="h-16 w-full animate-pulse rounded-xl bg-white/10" />
                  <div className="h-16 w-full animate-pulse rounded-xl bg-white/10" />
                </>
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
                          <button
                            onClick={() => startQuestTimer(q.id)}
                            className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
                            disabled={!!questTimers[q.id]}
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
                              setQuests(prev => prev.map(it => it.id === q.id ? { ...it, completed: true } : it))
                              const b = await getBalance().catch(() => ({ balance: 0 }))
                              await Promise.resolve(onAfterClaim?.(b.balance))
                            } else {
                              const msg =
                                res.status === 409 ? 'Already claimed.' :
                                res.status === 400 ? 'Please connect your wallet first.' :
                                res.status === 401 ? 'Please sign in to claim.' :
                                res.status === 404 ? 'Quest not found.' :
                                'Something went wrong.'
                              setBanner({ type: 'error', text: msg })
                            }
                            setTimeout(() => setBanner(null), 3000)
                          }}
                        >
                          {q.completed ? 'Completed' : canClaim ? (q.button_text || 'Claim') : `Wait ${secs}s`}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* RIGHT: big daily card */}
            <div className="md:row-span-2 rounded-2xl border border-white/10 bg-black/40 p-5 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="text-white text-lg font-semibold">Daily Signal Boost</div>
                <p className="text-sm text-white/70 mt-1">
                  Claim free points once every 24h.
                  {isDailyLocked && (
                    <span className="ml-2 text-white/60">Next in {fmtHMS(remainingMsDaily)}</span>
                  )}
                </p>
              </div>

              <div className="mt-4">
                <button
                  className="w-full rounded-full bg-white text-black px-4 py-2.5 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
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
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}