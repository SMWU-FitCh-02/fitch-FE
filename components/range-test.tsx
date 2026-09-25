"use client"

import * as React from "react"
import { Mic, MicOff, Music2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { WaveBars } from "@/components/fitch-logo"
import type { RangeRecord } from "@/lib/store"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { noteToKorean } from "@/lib/songs"

type Phase = "intro" | "low" | "high" | "analyzing" | "done"
type Mode = "guide" | "classic"

// Note ladder going up
const LOW_LADDER = ["C2", "D2", "E2", "F2", "G2", "A2", "B2", "C3", "D3", "E3", "F3", "G3", "A3"]
const HIGH_LADDER = ["A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5", "B5"]

// 낮은 음 테스트는 편한 음(C3)에서 시작해서 점점 내려간다
const LOW_LADDER_DESC = [...LOW_LADDER].reverse()
const LOW_START_INDEX = LOW_LADDER_DESC.indexOf("C3")
// 높은 음 테스트는 편한 음(C4)에서 시작해서 점점 올라간다
const HIGH_START_INDEX = HIGH_LADDER.indexOf("C4")

function shiftDownInHighLadder(note: string, steps: number) {
  const i = HIGH_LADDER.indexOf(note)
  if (i === -1) return note
  return HIGH_LADDER[Math.max(0, i - steps)]
}

// 가이드 모드: 현재 인덱스로부터 "지금까지 성공한 마지막 음"을 역산
function lowestFromIndex(idx: number) {
  return idx > LOW_START_INDEX ? LOW_LADDER_DESC[idx - 1] : LOW_LADDER_DESC[LOW_START_INDEX]
}
function highestFromIndex(idx: number) {
  return idx > HIGH_START_INDEX ? HIGH_LADDER[idx - 1] : HIGH_LADDER[HIGH_START_INDEX]
}

const PIANO_SAMPLE_BASE =
    "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3"

export function RangeTest({
                            onComplete,
                            initialPhase = "intro",
                            userId,
                          }: {
  onComplete: (rec: RangeRecord) => void
  initialPhase?: Phase
  userId?: number
}) {

  const [mode, setMode] = React.useState<Mode | null>(null)
  const [phase, setPhase] = React.useState<Phase>(initialPhase)
  const [result, setResult] = React.useState<RangeRecord | null>(null)
  const [micNotice, setMicNotice] = React.useState("")

  // 가이드 모드 전용
  const [lowStepIdx, setLowStepIdx] = React.useState(LOW_START_INDEX)
  const [highStepIdx, setHighStepIdx] = React.useState(HIGH_START_INDEX)

  // 직접 녹음(기존) 모드 전용
  const [recording, setRecording] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [classicLowIdx, setClassicLowIdx] = React.useState(0)
  const [classicHighIdx, setClassicHighIdx] = React.useState(0)

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const recordedBlobRef = React.useRef<Blob | null>(null)
  const audioCtxRef = React.useRef<AudioContext | null>(null)
  const pianoBufferCacheRef = React.useRef<Map<string, AudioBuffer>>(new Map())

  function getAudioCtx() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      audioCtxRef.current = new Ctx()
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }

  async function loadPianoBuffer(note: string): Promise<AudioBuffer | null> {
    const cache = pianoBufferCacheRef.current
    if (cache.has(note)) return cache.get(note)!
    try {
      const res = await fetch(`${PIANO_SAMPLE_BASE}/${note}.mp3`)
      if (!res.ok) return null
      const arrayBuffer = await res.arrayBuffer()
      const ctx = getAudioCtx()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
      cache.set(note, audioBuffer)
      return audioBuffer
    } catch {
      return null
    }
  }

  async function playGuideTone(note: string, duration = 3000) {
    try {
      const ctx = getAudioCtx()
      if (ctx.state === "suspended") {
        await ctx.resume()
      }
      const buffer = await loadPianoBuffer(note)
      if (!buffer) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      const gain = ctx.createGain()
      const now = ctx.currentTime
      const dur = duration / 1000

      gain.gain.setValueAtTime(0.9, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur - 0.03)
      gain.gain.linearRampToValueAtTime(0, now + dur)

      source.connect(gain)
      gain.connect(ctx.destination)
      source.start(now)
      source.stop(now + dur)
    } catch {
      // 오디오 재생 실패는 조용히 무시
    }
  }

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
      mr.start(1000)
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

  // ---- 가이드 모드 (녹음 사용 안 함) ----

  // 낮은 음/높은 음 단계에 들어갈 때 + 음이 바뀔 때마다 가이드음 자동 재생
  React.useEffect(() => {
    if (mode !== "guide") return
    if (phase !== "low" && phase !== "high") return
    const note = phase === "low" ? LOW_LADDER_DESC[lowStepIdx] : HIGH_LADDER[highStepIdx]
    playGuideTone(note)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, phase, lowStepIdx, highStepIdx])

  function handleStartGuide() {
    getAudioCtx() // 클릭 이벤트 안에서 바로 호출해야 iOS에서 오디오가 풀려요
    setMode("guide")
    setLowStepIdx(LOW_START_INDEX)
    setPhase("low")
  }

  function goToHighPhaseGuide() {
    setHighStepIdx(HIGH_START_INDEX)
    setPhase("high")
  }

  function handleLowSuccess() {
    getAudioCtx()
    if (lowStepIdx >= LOW_LADDER_DESC.length - 1) {
      goToHighPhaseGuide()
    } else {
      setLowStepIdx((i) => i + 1)
    }
  }

  function handleLowFail() {
    getAudioCtx()
    goToHighPhaseGuide()
  }

  function handleLowPrev() {
    getAudioCtx()
    setLowStepIdx((i) => Math.max(LOW_START_INDEX, i - 1))
  }

  function handleHighSuccess() {
    getAudioCtx()
    if (highStepIdx >= HIGH_LADDER.length - 1) {
      setPhase("analyzing")
    } else {
      setHighStepIdx((i) => i + 1)
    }
  }

  function handleHighFail() {
    getAudioCtx()
    setPhase("analyzing")
  }

  function handleHighPrev() {
    getAudioCtx()
    setHighStepIdx((i) => Math.max(HIGH_START_INDEX, i - 1))
  }

  // ---- 직접 녹음(기존) 모드 (녹음 + 서버 분석 사용) ----

  async function startClassicStep(p: "low" | "high") {
    setMode("classic")
    setPhase(p)
    setRecording(true)
    if (p === "low") await startRealRecording()
  }

  React.useEffect(() => {
    if (mode !== "classic" || !recording) return
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + 2)
        if (next >= 100) {
          clearInterval(interval)
          setRecording(false)
          if (phase === "low") {
            setClassicLowIdx((i) => Math.min(LOW_LADDER.length - 1, i + 1))
          } else if (phase === "high") {
            setClassicHighIdx((i) => Math.min(HIGH_LADDER.length - 1, i + 1))
          }
        }
        return next
      })
    }, 60)
    return () => clearInterval(interval)
  }, [recording, phase, mode])

  function handleClassicRetry() {
    setProgress(0)
    setRecording(true)
  }

  async function handleClassicAdvance() {
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

  // phase = analyzing: '직접 녹음' 모드에서만 서버 분석 시도, 실패/가이드모드는 직접 측정한 결과 사용
  React.useEffect(() => {
    if (phase !== "analyzing") return
    let cancelled = false

    async function run() {
      let lowest: string
      let highest: string

      if (mode === "guide") {
        lowest = lowestFromIndex(lowStepIdx)
        highest = highestFromIndex(highStepIdx)
      } else {
        lowest = LOW_LADDER[Math.max(0, classicLowIdx - 1)]
        highest = HIGH_LADDER[Math.min(HIGH_LADDER.length - 1, classicHighIdx + 1)]
      }
      const comfortable = shiftDownInHighLadder(highest, 2)
      const tones = ["bright", "warm", "husky", "soft"] as const
      let rec: RangeRecord | null = null

      // 서버 분석은 '직접 녹음' 모드에서만 시도한다
      if (mode === "classic" && userId && recordedBlobRef.current && recordedBlobRef.current.size > 0) {
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
          setMicNotice("서버 분석에 실패해 직접 측정한 결과로 대신했어요.")
        }
      }

      if (!rec) {
        await new Promise((r) => setTimeout(r, 1000))
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
    return () => { cancelled = true }
  }, [phase, mode, lowStepIdx, highStepIdx, classicLowIdx, classicHighIdx, userId])

  function resetAll() {
    setMode(null)
    setPhase("intro")
    setLowStepIdx(LOW_START_INDEX)
    setHighStepIdx(HIGH_START_INDEX)
    setClassicLowIdx(0)
    setClassicHighIdx(0)
    setProgress(0)
    setRecording(false)
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
              측정 방식을 선택해주세요.
            </p>
          </div>
          <div className="flex items-center justify-center gap-7 w-full">
            {[
              { i: "1", t: "낮은 음" },
              { i: "2", t: "높은 음" },
              { i: "3", t: "분석" },
            ].map((step, idx, arr) => (
                <React.Fragment key={step.t}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-10 w-10 grid place-items-center rounded-[10px] bg-primary/30 text-primary text-base font-bold">
                      {step.i}
                    </div>
                    <div className="text-sm font-semibold text-foreground">{step.t}</div>
                  </div>
                  {idx < arr.length - 1 && (
                      <span className="text-primary/60 text-xl mb-6">→</span>
                  )}
                </React.Fragment>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 w-full">
            <button
                type="button"
                onClick={handleStartGuide}
                className="flex flex-col items-center gap-2 rounded-[16px] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent py-5 px-3 hover:from-primary/20 transition-colors"
            >
              <div className="h-10 w-10 grid place-items-center rounded-full bg-primary/15 text-primary">
                <Music2 className="h-5 w-5" />
              </div>
              <div className="text-sm font-bold">가이드 음</div>
              <div className="text-[11px] text-muted-foreground leading-snug">
                음을 듣고 따라 부르며 측정
              </div>
            </button>

            <button
                type="button"
                onClick={() => startClassicStep("low")}
                className="flex flex-col items-center gap-2 rounded-[16px] bg-gradient-to-b from-brand/15 via-brand/5 to-transparent py-5 px-3 hover:from-brand/20 transition-colors"
            >
              <div className="h-10 w-10 grid place-items-center rounded-full bg-brand/15 text-brand">
                <Mic className="h-5 w-5" />
              </div>
              <div className="text-sm font-bold">직접 녹음</div>
              <div className="text-[11px] text-muted-foreground leading-snug">
                편하게 소리 내며 측정
              </div>
            </button>
          </div>
        </div>
    )
  }

  if ((phase === "low" || phase === "high") && mode === "guide") {
    const isLow = phase === "low"
    const currentNote = isLow ? LOW_LADDER_DESC[lowStepIdx] : HIGH_LADDER[highStepIdx]
    const atStart = isLow ? lowStepIdx <= LOW_START_INDEX : highStepIdx <= HIGH_START_INDEX

    return (
        <div className="flex flex-col items-center text-center gap-6">
          <div className="text-xs text-muted-foreground">
            {isLow ? "단계 1 / 2 · 낮은 음 측정" : "단계 2 / 2 · 높은 음 측정"}
          </div>

          <div className="relative h-40 w-40">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-brand opacity-25 blur-2xl animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary to-brand grid place-items-center">
              <Music2 className="h-12 w-12 text-white" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 w-full">
            <div className="text-xs text-muted-foreground">
              {isLow ? "이 음까지 편하게 낼 수 있나요?" : "이 음까지 편하게 올라갈 수 있나요?"}
            </div>
            <div className="text-2xl font-extrabold text-primary">
              {noteToKorean(currentNote)}
            </div>
            <Button variant="outline" size="sm" onClick={() => playGuideTone(currentNote)}>
              <Music2 className="h-4 w-4" /> 가이드음 다시 듣기
            </Button>
          </div>

          <div className="w-full space-y-3">
            <p className="text-xs text-muted-foreground">
              가이드음을 듣고 &lsquo;아~&rsquo; 하고 따라 불러보세요.
            </p>
            <Button
                variant="brand"
                size="lg"
                className="w-full"
                onClick={isLow ? handleLowSuccess : handleHighSuccess}
            >
              냈어요! 다음 음으로 {isLow ? "⬇️" : "⬆️"}
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button
                  variant="outline"
                  size="lg"
                  onClick={isLow ? handleLowPrev : handleHighPrev}
                  disabled={atStart}
              >
                ← 이전 음
              </Button>
              <Button
                  variant="outline"
                  size="lg"
                  onClick={isLow ? handleLowFail : handleHighFail}
              >
                여기까지가 한계예요
              </Button>
            </div>
          </div>
        </div>
    )
  }

  if ((phase === "low" || phase === "high") && mode === "classic") {
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
                  <Button variant="outline" size="lg" className="w-full" onClick={handleClassicRetry}>
                    <RotateCcw className="h-4 w-4" /> 다시 녹음하기
                  </Button>
                  <Button variant="brand" size="lg" className="w-full" onClick={handleClassicAdvance}>
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
            <div className="text-lg font-bold">
              {mode === "classic" ? "AI가 당신의 목소리를 분석 중" : "결과를 정리하는 중"}
            </div>
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
              <div className="text-lg font-extrabold text-primary">{result?.lowestNote && noteToKorean(result.lowestNote)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">편한 고음</div>
              <div className="text-lg font-extrabold">{result?.comfortableHigh && noteToKorean(result.comfortableHigh)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">최고음</div>
              <div className="text-lg font-extrabold text-brand">{result?.highestNote && noteToKorean(result.highestNote)}</div>
            </div>
          </div>
        </div>
        <div className="rounded-[12px] bg-surface/70 border border-border/60 p-4 w-full text-left">
          <div className="flex gap-2">
            <Music2 className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <div className="text-sm font-semibold">이 음역대로 부르기 좋은 노래</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {result?.highestNote && noteToKorean(result.highestNote)} 안팎의 곡들을 추천해드릴게요.
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
          <Button variant="ghost" size="lg" className="w-full" onClick={resetAll}>
            <RotateCcw className="h-4 w-4" /> 다시 측정
          </Button>
        </div>
      </div>
  )
}