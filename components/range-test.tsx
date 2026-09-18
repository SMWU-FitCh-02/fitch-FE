"use client"

import * as React from "react"
import { Mic, MicOff, Music2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { WaveBars } from "@/components/fitch-logo"
import type { RangeRecord } from "@/lib/store"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

type Phase = "intro" | "low" | "high" | "comfortable" | "analyzing" | "done"

// Note ladder going up
const LOW_LADDER = ["C2", "D2", "E2", "F2", "G2", "A2", "B2", "C3", "D3", "E3", "F3", "G3", "A3"]
const HIGH_LADDER = ["A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5", "B5"]

function shiftDownInHighLadder(note: string, steps: number) {
  const i = HIGH_LADDER.indexOf(note)
  if (i === -1) return note
  return HIGH_LADDER[Math.max(0, i - steps)]
}

export function RangeTest({
                            onComplete,
                            initialPhase = "intro",
                            userId,
                          }: {
  onComplete: (rec: RangeRecord) => void
  initialPhase?: Phase
  userId?: number
}) {

  const [phase, setPhase] = React.useState<Phase>(initialPhase)
  const [recording, setRecording] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [lowIdx, setLowIdx] = React.useState(0)
  const [highIdx, setHighIdx] = React.useState(0)
  const [result, setResult] = React.useState<RangeRecord | null>(null)
  const [micNotice, setMicNotice] = React.useState("")

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const recordedBlobRef = React.useRef<Blob | null>(null)

  async function startRealRecording() {
    if (mediaRecorderRef.current || typeof navigator === "undefined" || !navigator.mediaDevices) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.start(1000)   // ← 1초마다 청크 생성
      mediaRecorderRef.current = mr
    } catch {
      setMicNotice("마이크 접근을 허용하지 않아 시뮬레이션 결과로 진행해요.")
    }
  }

  function stopRealRecording(): Promise<void> {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current
      if (!mr) { resolve(); return }
      mr.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        mediaRecorderRef.current = null
        streamRef.current = null
        recordedBlobRef.current = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" })
        chunksRef.current = []
        resolve()
      }
      try { mr.stop() } catch { resolve() }
    })
  }

  // 진행바가 다 차면(=3초 녹음 완료) 녹음만 멈추고, 다음 행동은 버튼으로 선택하게 함
  React.useEffect(() => {
    if (!recording) return
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + 2)
        if (next >= 100) {
          clearInterval(interval)
          setRecording(false)
          if (phase === "low") {
            setLowIdx((i) => Math.min(LOW_LADDER.length - 1, i + 1))
          } else if (phase === "high") {
            setHighIdx((i) => Math.min(HIGH_LADDER.length - 1, i + 1))
          }
        }
        return next
      })
    }, 60)
    return () => clearInterval(interval)
  }, [recording, phase])

  function handleRetry() {
    setProgress(0)
    setRecording(true)
  }

  async function handleAdvance() {
    if (phase === "low") {
      setPhase("high")
      setProgress(0)
      setRecording(true)
    } else if (phase === "high") {
      setRecording(false)
      await stopRealRecording()
      setPhase("analyzing")
    }
  }

  // when phase = analyzing, try the real backend first, fall back to a simulated result
  React.useEffect(() => {
    if (phase !== "analyzing") return
    let cancelled = false

    async function run() {
      const lowest = LOW_LADDER[Math.max(0, lowIdx - 1)]
      const highest = HIGH_LADDER[Math.min(HIGH_LADDER.length - 1, highIdx + 1)]
      const comfortable = HIGH_LADDER[Math.max(0, highIdx - 2)]
      const tones = ["bright", "warm", "husky", "soft"] as const
      let rec: RangeRecord | null = null

      if (userId && recordedBlobRef.current && recordedBlobRef.current.size > 0) {
        try {
          const res = await api.uploadVoice(userId, recordedBlobRef.current, "range-test.webm")
          rec = {
            testedAt: res.measuredAt || new Date().toISOString(),
            lowestNote: res.minNoteLabel || lowest,
            highestNote: res.maxNoteLabel || highest,
            comfortableHigh: res.maxNoteLabel ? shiftDownInHighLadder(res.maxNoteLabel, 2) : comfortable,
            voiceTone: tones[Math.floor(Math.random() * tones.length)],
          }
        } catch {
          setMicNotice("서버 분석에 실패해 시뮬레이션 결과로 대신했어요.")
        }
      }

      if (!rec) {
        await new Promise((r) => setTimeout(r, 1400))
        rec = {
          testedAt: new Date().toISOString(),
          lowestNote: lowest,
          highestNote: highest,
          comfortableHigh: comfortable,
          voiceTone: tones[Math.floor(Math.random() * tones.length)],
        }
      }

      if (!cancelled) {
        setResult(rec)
        setPhase("done")
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [phase, lowIdx, highIdx, userId])

  async function startStep(p: "low" | "high") {
    setPhase(p)
    setRecording(true)
    if (p === "low") await startRealRecording()
  }

  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  if (phase === "intro") {
    return (
        <div className="flex flex-col items-center text-center gap-6">
          <div className="relative h-44 w-44">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-brand opacity-30 blur-2xl" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary to-brand grid place-items-center">
              <Mic className="h-14 w-14 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-extrabold">3분 음역대 테스트</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">
              낮은 소리에서 점점 높이 올려보세요. AI가 당신의 음역대를 분석합니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full text-center text-xs">
            {[
              { i: "1️⃣", t: "낮은 음", d: "‘아~’ 천천히" },
              { i: "2️⃣", t: "높은 음", d: "점점 더 높게" },
              { i: "3️⃣", t: "분석", d: "AI 결과" },
            ].map((step) => (
                <div key={step.t} className="rounded-[12px] bg-surface/60 border border-border/60 p-3">
                  <div className="text-xl">{step.i}</div>
                  <div className="mt-1 text-sm font-semibold">{step.t}</div>
                  <div className="text-[10px] text-muted-foreground">{step.d}</div>
                </div>
            ))}
          </div>
          <Button variant="brand" size="lg" className="w-full" onClick={() => startStep("low")}>
            시작하기 <Mic className="h-5 w-5" />
          </Button>
        </div>
    )
  }

  if (phase === "low" || phase === "high") {
    return (
        <div className="flex flex-col items-center text-center gap-6">
          <div className="text-xs text-muted-foreground">
            {phase === "low" ? "단계 1 / 2 · 낮은 음 녹음 중" : "단계 2 / 2 · 높은 음 녹음 중"}
          </div>
          <div className="relative h-40 w-40">
            <div
                className={cn(
                    "absolute inset-0 rounded-full bg-gradient-to-br from-primary to-brand opacity-25 blur-2xl transition-opacity",
                    recording ? "animate-pulse opacity-40" : "opacity-20"
                )}
            />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary to-brand grid place-items-center">
              {recording ? (
                  <Mic className="h-12 w-12 text-white" />
              ) : (
                  <Music2 className="h-12 w-12 text-white" />
              )}
            </div>
          </div>

          <div className="rounded-[14px] bg-surface-elevated/70 border border-border/60 p-5 w-full">
            <div className="flex items-center gap-3 mb-3">
              <div
                  className={cn(
                      "h-10 w-10 rounded-full grid place-items-center",
                      recording ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                  )}
              >
                {recording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold">
                  {recording ? "녹음 중... 편하게 3초만 유지해주세요" : "녹음 완료"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {phase === "low" ? "가장 낮은 음을 편하게 내주세요" : "가장 높은 음을 편하게 내주세요"}
                </div>
              </div>
              <WaveBars active={recording} />
            </div>
            <Progress value={progress} />
          </div>

          {micNotice && <p className="text-xs text-muted-foreground">{micNotice}</p>}

          <div className="w-full space-y-3">
            {recording ? (
                <p className="text-xs text-muted-foreground">
                  아무 음이나 편하게 &lsquo;아~&rsquo; 하고 3초 정도 유지해주세요. 녹음이 끝나면 버튼이 나타나요.
                </p>
            ) : (
                <>
                  <p className="text-xs font-semibold text-primary">
                    {phase === "low" ? "낮은 음 녹음 완료!" : "높은 음 녹음 완료!"}
                  </p>
                  <Button variant="outline" size="lg" className="w-full" onClick={handleRetry}>
                    <RotateCcw className="h-4 w-4" /> 다시 녹음하기
                  </Button>
                  <Button variant="brand" size="lg" className="w-full" onClick={handleAdvance}>
                    {phase === "low" ? "높은 음 녹음하러 가기" : "분석 시작하기"}
                  </Button>
                </>
            )}
          </div>
        </div>
    )
  }

  if (phase === "analyzing") {
    return (
        <div className="flex flex-col items-center text-center gap-6 py-10">
          <div className="relative h-32 w-32">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-brand opacity-30 blur-2xl animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-surface grid place-items-center">
              <WaveBars active />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold">AI가 당신의 목소리를 분석 중</div>
            <div className="mt-1 text-xs text-muted-foreground">잠시만 기다려주세요...</div>
          </div>
        </div>
    )
  }

  // done
  return (
      <div className="flex flex-col items-center text-center gap-5">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-brand grid place-items-center text-3xl">
          🎉
        </div>
        <div>
          <h2 className="text-xl font-extrabold">분석 완료!</h2>
          <p className="mt-1 text-sm text-muted-foreground">당신의 음역대는...</p>
        </div>
        <div className="w-full rounded-[14px] bg-gradient-to-br from-primary/15 to-brand/15 border border-primary/30 p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[10px] text-muted-foreground">최저음</div>
              <div className="text-2xl font-extrabold text-primary">{result?.lowestNote}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">편한 고음</div>
              <div className="text-2xl font-extrabold">{result?.comfortableHigh}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">최고음</div>
              <div className="text-2xl font-extrabold text-brand">{result?.highestNote}</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            음색 · {labelForTone(result?.voiceTone)}
          </div>
        </div>
        <div className="rounded-[12px] bg-surface/70 border border-border/60 p-4 w-full text-left">
          <div className="flex gap-2">
            <Music2 className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <div className="text-sm font-semibold">이 음역대로 부르기 좋은 노래</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {result?.highestNote} 안팎의 곡들을 추천해드릴게요.
              </div>
            </div>
          </div>
        </div>

        <div className="w-full space-y-2">
          <Button
              variant="brand"
              size="lg"
              className="w-full"
              onClick={() => result && onComplete(result)}
          >
            결과 저장하고 시작하기
          </Button>
          <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => {
                setPhase("intro")
                setLowIdx(0)
                setHighIdx(0)
                setProgress(0)
              }}
          >
            <RotateCcw className="h-4 w-4" /> 다시 측정
          </Button>
        </div>
      </div>
  )
}

function labelForTone(t?: "bright" | "warm" | "husky" | "soft") {
  switch (t) {
    case "bright":
      return "밝고 청량한 음색 ☀️"
    case "warm":
      return "따뜻하고 부드러운 음색 ☕"
    case "husky":
      return "허스키하고 매력적인 음색 🌙"
    case "soft":
      return "포근하고 잔잔한 음색 ☁️"
    default:
      return "—"
  }
}