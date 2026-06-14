"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Gamepad2, Trophy, Users, RefreshCw, Crown, Medal, Award } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FlappyBird } from "@/components/play/flappy-bird"
import { RESTAURANT_NAME } from "@/lib/constants"

interface ScoreRow {
  id: string
  score: number
  customer_name: string | null
  table_id: string | null
  session_id: string | null
  created_at: string
  tables: { label: string } | null
}

function PlayInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session_id")
  const tableId = searchParams.get("table_id")
  const qrToken = searchParams.get("token")
  const customerName = searchParams.get("name") ?? "Guest"

  const [scores, setScores] = useState<ScoreRow[]>([])
  const [loadingScores, setLoadingScores] = useState(true)
  const [scope, setScope] = useState<"all" | "table">(tableId ? "table" : "all")
  const [lastSubmitted, setLastSubmitted] = useState<number | null>(null)
  const [currentScore, setCurrentScore] = useState(0)

  const fetchScores = useCallback(async () => {
    const params = new URLSearchParams({
      game: "flappy_bird",
      limit: "10",
      scope,
    })
    if (scope === "table" && tableId) params.set("table_id", tableId)
    try {
      const res = await fetch(`/api/game/scores?${params.toString()}`)
      const data = await res.json()
      setScores(data.scores ?? [])
    } catch {
      // ignore
    } finally {
      setLoadingScores(false)
    }
  }, [scope, tableId])

  useEffect(() => {
    fetchScores()
    // Poll every 8s for live updates
    const t = setInterval(fetchScores, 8000)
    return () => clearInterval(t)
  }, [fetchScores])

  // Submit score when game ends
  const handleGameOver = useCallback(
    async (finalScore: number) => {
      if (lastSubmitted === finalScore) return // dedupe
      setLastSubmitted(finalScore)
      try {
        await fetch("/api/game/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            game_type: "flappy_bird",
            score: finalScore,
            customer_name: customerName,
            table_id: tableId,
            session_id: sessionId,
          }),
        })
        // Refresh leaderboard
        setTimeout(fetchScores, 500)
      } catch {
        // ignore
      }
    },
    [lastSubmitted, customerName, tableId, sessionId, fetchScores]
  )

  const myBest = scores.find(
    (s) => s.session_id === sessionId || (s.customer_name === customerName && s.table_id === tableId)
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Top bar */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (qrToken) router.push(`/order?t=${qrToken}`)
              else if (tableId) router.push(`/order?t=${tableId}`)
              else router.push("/")
            }}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="size-4" />
            <span className="ml-1.5 hidden sm:inline">Back to Order</span>
          </Button>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-sm font-semibold">
              <Gamepad2 className="size-4 text-purple-300" />
              {RESTAURANT_NAME} Arcade
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
            <Trophy className="size-3.5 text-amber-300" />
            <span>Flappy Bird</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
          {/* Game column */}
          <div className="space-y-4">
            {/* Title */}
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
                Play While You Wait
              </h1>
              <p className="text-sm sm:text-base text-white/60 mt-1">
                Tap or press Space to flap. Beat the high score.
              </p>
            </div>

            {/* Game canvas */}
            <div className="flex justify-center">
              <FlappyBird
                onScore={(s) => setCurrentScore(s)}
                onGameOver={handleGameOver}
              />
            </div>

            {/* Helper hint */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center text-xs text-white/60 sm:hidden">
              Tap anywhere on the game to flap
            </div>

            {/* Session info card */}
            {sessionId && (
              <Card className="border-white/10 bg-white/5 text-white">
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="size-4 text-purple-300" />
                    <span>
                      Playing as <strong>{customerName}</strong>
                    </span>
                  </div>
                  {currentScore > 0 && (
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-200 border-purple-500/30">
                      Current: {currentScore} pts
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Leaderboard column */}
          <aside className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Trophy className="size-5 text-amber-300" />
                Leaderboard
              </h2>
              <Button
                size="icon"
                variant="ghost"
                className="text-white/70 hover:bg-white/10 hover:text-white size-7"
                onClick={fetchScores}
              >
                <RefreshCw className="size-3.5" />
              </Button>
            </div>

            {/* Scope tabs */}
            <div className="flex gap-1 rounded-lg bg-white/5 p-1 text-xs font-medium">
              <button
                onClick={() => setScope("all")}
                className={`flex-1 rounded-md py-1.5 transition-colors ${
                  scope === "all" ? "bg-white/10 text-white" : "text-white/60 hover:text-white/80"
                }`}
              >
                All-time
              </button>
              <button
                onClick={() => setScope("table")}
                disabled={!tableId}
                className={`flex-1 rounded-md py-1.5 transition-colors ${
                  scope === "table" ? "bg-white/10 text-white" : "text-white/60 hover:text-white/80 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                This Table
              </button>
            </div>

            {/* Scores list */}
            {loadingScores ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/50 text-sm">
                Loading scores...
              </div>
            ) : scores.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-white/50 text-sm">
                <Trophy className="size-8 mx-auto mb-2 opacity-40" />
                <p>No scores yet</p>
                <p className="text-xs mt-1 text-white/40">Be the first to play!</p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="divide-y divide-white/5">
                  {scores.map((s, idx) => {
                    const rank = idx + 1
                    const rankIcon =
                      rank === 1 ? <Crown className="size-3.5 text-amber-300" /> :
                      rank === 2 ? <Medal className="size-3.5 text-slate-300" /> :
                      rank === 3 ? <Award className="size-3.5 text-orange-300" /> :
                      <span className="size-3.5 flex items-center justify-center text-[10px] font-bold text-white/40">{rank}</span>
                    return (
                      <div
                        key={s.id}
                        className={`px-3 py-2.5 flex items-center gap-2.5 ${
                          s.session_id === sessionId ? "bg-purple-500/20" : ""
                        }`}
                      >
                        <div className="shrink-0">{rankIcon}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {s.customer_name ?? "Anonymous"}
                          </p>
                          <p className="text-[10px] text-white/50 truncate">
                            {s.tables?.label ? `Table ${s.tables.label}` : "—"} ·{" "}
                            {timeAgo(s.created_at)}
                          </p>
                        </div>
                        <p className="text-base font-black tabular-nums tabular-nums shrink-0">
                          {s.score}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <p className="text-[10px] text-white/40 text-center">
              Game over submits your score automatically. Beating the top spot unlocks bragging rights at your table.
            </p>
          </aside>
        </div>
      </main>
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function PlayClient() {
  return (
    <Suspense fallback={null}>
      <PlayInner />
    </Suspense>
  )
}
