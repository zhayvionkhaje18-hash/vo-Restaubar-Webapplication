"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface FlappyBirdProps {
  onScore: (score: number) => void
  onGameOver: (finalScore: number) => void
  paused?: boolean
}

interface Pipe {
  x: number
  gapY: number
  gapSize: number
  scored: boolean
  id: number
}

const CANVAS_W = 400
const CANVAS_H = 600
const GROUND_H = 60
const PLAY_H = CANVAS_H - GROUND_H
const BIRD_SIZE = 32
const GRAVITY = 0.45
const JUMP_VEL = -7.5
const PIPE_W = 60
const PIPE_GAP = 150
const PIPE_SPEED = 2.4
const PIPE_INTERVAL = 90 // frames between pipe spawns

export function FlappyBird({ onScore, onGameOver, paused = false }: FlappyBirdProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)

  // Mutable game state held in refs to avoid re-render storms
  const stateRef = useRef<{
    birdY: number
    birdVel: number
    birdRot: number
    pipes: Pipe[]
    frame: number
    score: number
    dead: boolean
    flash: number
    groundOffset: number
  }>({
    birdY: PLAY_H / 2,
    birdVel: 0,
    birdRot: 0,
    pipes: [],
    frame: 0,
    score: 0,
    dead: false,
    flash: 0,
    groundOffset: 0,
  })
  const idCounter = useRef(0)

  // Load best from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("flappy_best")
    if (stored) setBest(parseInt(stored, 10) || 0)
  }, [])

  // Reset state
  const reset = useCallback(() => {
    stateRef.current = {
      birdY: PLAY_H / 2,
      birdVel: 0,
      birdRot: 0,
      pipes: [],
      frame: 0,
      score: 0,
      dead: false,
      flash: 0,
      groundOffset: 0,
    }
    setScore(0)
  }, [])

  // Jump handler
  const jump = useCallback(() => {
    if (paused) return
    // If dead, treat this as a restart
    if (stateRef.current.dead) {
      reset()
      // start running on next frame
      stateRef.current.birdVel = JUMP_VEL
      setRunning(true)
      return
    }
    if (!running) {
      setRunning(true)
    }
    stateRef.current.birdVel = JUMP_VEL
  }, [running, paused, reset])

  // Keyboard + touch handlers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault()
        jump()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [jump])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set up crisp rendering
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = CANVAS_W * dpr
    canvas.height = CANVAS_H * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = `${CANVAS_W}px`
    canvas.style.height = `${CANVAS_H}px`

    const loop = () => {
      const s = stateRef.current
      const drawW = CANVAS_W
      const drawH = CANVAS_H

      // Sky gradient background
      const bg = ctx.createLinearGradient(0, 0, 0, PLAY_H)
      bg.addColorStop(0, "#38bdf8")
      bg.addColorStop(0.6, "#7dd3fc")
      bg.addColorStop(1, "#fef3c7")
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, drawW, drawH)

      // Distant clouds (parallax)
      const cloudOffset = (s.frame * 0.3) % (drawW + 80)
      ctx.fillStyle = "rgba(255,255,255,0.7)"
      for (let i = 0; i < 3; i++) {
        const cx = ((i * 180) - cloudOffset + drawW) % (drawW + 200) - 100
        const cy = 60 + i * 30
        ctx.beginPath()
        ctx.ellipse(cx, cy, 40, 14, 0, 0, Math.PI * 2)
        ctx.ellipse(cx + 18, cy - 4, 28, 12, 0, 0, Math.PI * 2)
        ctx.ellipse(cx - 18, cy - 2, 26, 11, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      // Update + draw pipes
      if (running && !s.dead) {
        s.birdVel += GRAVITY
        s.birdY += s.birdVel
        s.birdRot = Math.max(-0.5, Math.min(1.2, s.birdVel * 0.08))
        s.groundOffset = (s.groundOffset + PIPE_SPEED) % 24
        s.frame++

        // Spawn pipes
        if (s.frame % PIPE_INTERVAL === 0) {
          const minGapY = 80
          const maxGapY = PLAY_H - PIPE_GAP - 80
          s.pipes.push({
            x: drawW + 10,
            gapY: minGapY + Math.random() * (maxGapY - minGapY),
            gapSize: PIPE_GAP,
            scored: false,
            id: idCounter.current++,
          })
        }

        // Move pipes
        for (const p of s.pipes) {
          p.x -= PIPE_SPEED
        }
        // Remove off-screen pipes
        s.pipes = s.pipes.filter((p) => p.x + PIPE_W > -10)

        // Score
        for (const p of s.pipes) {
          if (!p.scored && p.x + PIPE_W < drawW / 2) {
            p.scored = true
            s.score++
            setScore(s.score)
            onScore(s.score)
            s.flash = 6
          }
        }

        // Collision: ground / ceiling
        if (s.birdY + BIRD_SIZE / 2 >= PLAY_H) {
          s.birdY = PLAY_H - BIRD_SIZE / 2
          s.dead = true
        } else if (s.birdY - BIRD_SIZE / 2 < 0) {
          s.birdY = BIRD_SIZE / 2
          s.birdVel = 0
        }

        // Collision: pipes
        const birdLeft = drawW / 2 - BIRD_SIZE / 2
        const birdRight = drawW / 2 + BIRD_SIZE / 2
        const birdTop = s.birdY - BIRD_SIZE / 2
        const birdBottom = s.birdY + BIRD_SIZE / 2
        for (const p of s.pipes) {
          const pipeLeft = p.x
          const pipeRight = p.x + PIPE_W
          if (birdRight > pipeLeft && birdLeft < pipeRight) {
            if (birdTop < p.gapY || birdBottom > p.gapY + p.gapSize) {
              s.dead = true
            }
          }
        }

        if (s.dead) {
          const finalScore = s.score
          if (finalScore > best) {
            setBest(finalScore)
            localStorage.setItem("flappy_best", String(finalScore))
          }
          onGameOver(finalScore)
        }
      }

      // Draw pipes
      for (const p of s.pipes) {
        // Top pipe
        const topH = p.gapY
        const topGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0)
        topGrad.addColorStop(0, "#16a34a")
        topGrad.addColorStop(0.5, "#22c55e")
        topGrad.addColorStop(1, "#16a34a")
        ctx.fillStyle = topGrad
        ctx.fillRect(p.x, 0, PIPE_W, topH)
        // Top cap
        ctx.fillRect(p.x - 4, topH - 20, PIPE_W + 8, 20)
        // Bottom pipe
        const botY = p.gapY + p.gapSize
        const botH = PLAY_H - botY
        ctx.fillRect(p.x, botY, PIPE_W, botH)
        // Bottom cap
        ctx.fillRect(p.x - 4, botY, PIPE_W + 8, 20)
        // Pipe highlight
        ctx.fillStyle = "rgba(255,255,255,0.25)"
        ctx.fillRect(p.x + 4, 0, 4, topH)
        ctx.fillRect(p.x + 4, botY, 4, botH)
      }

      // Ground
      ctx.fillStyle = "#92400e"
      ctx.fillRect(0, PLAY_H, drawW, GROUND_H)
      ctx.fillStyle = "#fbbf24"
      for (let x = -24 + s.groundOffset; x < drawW; x += 24) {
        ctx.fillRect(x, PLAY_H, 12, 6)
      }
      // Grass strip
      ctx.fillStyle = "#16a34a"
      ctx.fillRect(0, PLAY_H, drawW, 6)

      // Draw bird
      ctx.save()
      ctx.translate(drawW / 2, s.birdY)
      ctx.rotate(s.birdRot)
      // Body
      const birdGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, BIRD_SIZE / 2)
      birdGrad.addColorStop(0, "#fde047")
      birdGrad.addColorStop(0.7, "#f59e0b")
      birdGrad.addColorStop(1, "#d97706")
      ctx.fillStyle = birdGrad
      ctx.beginPath()
      ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.4, 0, 0, Math.PI * 2)
      ctx.fill()
      // Wing
      ctx.fillStyle = "#fbbf24"
      ctx.beginPath()
      ctx.ellipse(-4, 2, 10, 6, -0.2, 0, Math.PI * 2)
      ctx.fill()
      // Eye white
      ctx.fillStyle = "white"
      ctx.beginPath()
      ctx.arc(8, -4, 5, 0, Math.PI * 2)
      ctx.fill()
      // Pupil
      ctx.fillStyle = "#1e293b"
      ctx.beginPath()
      ctx.arc(9, -4, 2.5, 0, Math.PI * 2)
      ctx.fill()
      // Beak
      ctx.fillStyle = "#ef4444"
      ctx.beginPath()
      ctx.moveTo(12, -1)
      ctx.lineTo(20, 1)
      ctx.lineTo(12, 4)
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      // Score flash
      if (s.flash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${(s.flash / 6) * 0.4})`
        ctx.fillRect(0, 0, drawW, drawH)
        s.flash--
      }

      // Start hint
      if (!running && !s.dead) {
        ctx.fillStyle = "rgba(0,0,0,0.55)"
        ctx.fillRect(drawW / 2 - 130, PLAY_H / 2 - 50, 260, 90)
        ctx.fillStyle = "white"
        ctx.font = "bold 22px system-ui, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("Tap / Space", drawW / 2, PLAY_H / 2 - 15)
        ctx.font = "13px system-ui, sans-serif"
        ctx.fillStyle = "rgba(255,255,255,0.85)"
        ctx.fillText("to start flapping", drawW / 2, PLAY_H / 2 + 10)
      }

      // Game over
      if (s.dead) {
        ctx.fillStyle = "rgba(0,0,0,0.55)"
        ctx.fillRect(0, PLAY_H / 2 - 70, drawW, 160)
        ctx.fillStyle = "#fca5a5"
        ctx.font = "bold 28px system-ui, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText("Game Over", drawW / 2, PLAY_H / 2 - 25)
        ctx.fillStyle = "white"
        ctx.font = "bold 18px system-ui, sans-serif"
        ctx.fillText(`Score: ${s.score}`, drawW / 2, PLAY_H / 2 + 8)
        ctx.font = "13px system-ui, sans-serif"
        ctx.fillStyle = "rgba(255,255,255,0.85)"
        ctx.fillText("Tap or press Space to restart", drawW / 2, PLAY_H / 2 + 35)
      }

      // HUD score
      if (running && !s.dead) {
        ctx.fillStyle = "rgba(0,0,0,0.35)"
        ctx.fillRect(drawW / 2 - 30, 24, 60, 40)
        ctx.fillStyle = "white"
        ctx.font = "bold 30px system-ui, sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(String(s.score), drawW / 2, 56)
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [running, onScore, onGameOver, best])

  // Auto-restart on game over
  useEffect(() => {
    if (!running) return
    // Watch for game over then reset on next jump
  }, [running])

  return (
    <div
      className="relative rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl shadow-purple-500/20 cursor-pointer select-none touch-none"
      onPointerDown={(e) => {
        e.preventDefault()
        jump()
      }}
    >
      <canvas ref={canvasRef} className="block max-w-full h-auto" />
      <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold">
        Best: {best}
      </div>
    </div>
  )
}
