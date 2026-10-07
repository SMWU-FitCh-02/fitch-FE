"use client"

import * as React from "react"
import { Mic, MicOff, Music2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { WaveBars } from "@/components/fitch-logo"
import type { RangeRecord } from "@/lib/store"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { noteToKorean, noteToMidi, midiToNote } from "@/lib/songs"
import { detectPitch, freqToMidi } from "@/lib/pitch-detect"

type Phase = "intro" | "low" | "high" | "analyzing" | "done" | "failed"
type Mode = "guide" | "classic"

// Note ladder going up
const LOW_LADDER = ["C2", "D2", "E2", "F2", "G2", "A2", "B2", "C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4"]
const HIGH_LADDER = ["A3", "B3", "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5", "A5", "B5"]

// 낮은 음 테스트는 편한 음(기본 C4, 성별에 따라 다를 수 있음)에서 시작해서 점점 내려간다
const LOW_LADDER_DESC = [...LOW_LADDER].reverse()

function shiftDownInHighLadder(note: string, steps: number) {
  const i = HIGH_LADDER.indexOf(note)
  if (i === -1) return note
  return HIGH_LADDER[Math.max(0, i - steps)]
}

const PIANO_SAMPLE_BASE =
    "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3"

// 실시간 음량 체크 임계값 (AnalyserNode의 time-domain 데이터를 -1~1로 정규화한 기준)
const LIVE_RMS_TOO_QUIET = 0.015   // 이 아래면 "너무 작아요"
const LIVE_PEAK_TOO_LOUD = 0.97    // 이 위면 "너무 크거나 깨짐(클리핑)"
const LIVE_SMOOTHING_ALPHA = 0.15  // 지수이동평균 계수 — 작을수록 더 완만해짐
const LIVE_HOLD_MS = 400           // 같은 상태가 이만큼 지속돼야 문구를 바꿈(깜빡임 방지)
const STEP_MIN_VOICED_RATIO = 0.25 // 3초 녹음 중 "소리가 들린" 프레임 비율이 이보다 낮으면 측정 실패로 간주
const MONITOR_DEAD_RMS = 0.0005     // 이 단계 내내 음량이 이보다 작으면 '음량 모니터가 먹통'(아이폰에서 가끔 발생)으로 보고 실패 판정에서 제외

// 가이드 음 자동 측정: 가이드음(AUTO_TONE_MS) → 잠깐 쉬고 → 따라 부르는 시간(AUTO_LISTEN_MS) 동안 실시간 음높이를 듣는다.
// 목표 음 ±1반음 안의 소리가 AUTO_HITS_NEEDED번(약 0.4초) 잡히면 성공 → 다음 음. 못 맞추면 한 번 더 들려주고, 그래도 안 되면 마지막 성공 음에서 끝.
const AUTO_TONE_MS = 1600
const AUTO_AFTER_TONE_GAP_MS = 500 // 스피커 소리가 마이크에 섞이지 않게, 가이드음이 끝난 뒤 잠깐 쉬었다가 듣기 시작
const AUTO_LISTEN_MS = 4500
const AUTO_TICK_MS = 50
const AUTO_HITS_NEEDED = 8
const AUTO_MAX_ATTEMPTS = 2
const AUTO_MIN_RMS = 0.008
const AUTO_MIN_CLARITY = 0.8

export function RangeTest({
                            onComplete,
                            initialPhase = "intro",
                            userId,
                            startNote = "C4",
                          }: {
  onComplete: (rec: RangeRecord) => void
  initialPhase?: Phase
  userId?: number
  startNote?: string
}) {
  const LOW_START_INDEX = LOW_LADDER_DESC.includes(startNote)
      ? LOW_LADDER_DESC.indexOf(startNote)
      : LOW_LADDER_DESC.indexOf("C4")
  const HIGH_START_INDEX = HIGH_LADDER.includes(startNote)
      ? HIGH_LADDER.indexOf(startNote)
      : HIGH_LADDER.indexOf("C4")

  // 가이드 모드: 현재 인덱스로부터 "지금까지 성공한 마지막 음"을 역산
  function lowestFromIndex(idx: number) {
    return idx > LOW_START_INDEX ? LOW_LADDER_DESC[idx - 1] : LOW_LADDER_DESC[LOW_START_INDEX]
  }
  function highestFromIndex(idx: number) {
    return idx > HIGH_START_INDEX ? HIGH_LADDER[idx - 1] : HIGH_LADDER[HIGH_START_INDEX]
  }

  const [mode, setMode] = React.useState<Mode | null>(null)
  const [phase, setPhase] = React.useState<Phase>(initialPhase)
  const [result, setResult] = React.useState<RangeRecord | null>(null)
  const [micNotice, setMicNotice] = React.useState("")
  // 녹음 중 실시간으로 뜨는 음량/노이즈 안내 문구. 측정이 잘 되고 있으면 빈 문자열(= 안 보임)
  const [liveNotice, setLiveNotice] = React.useState("")
  // 방금 끝난 단계(낮은 음/높은 음)에서 소리가 충분히 안 잡혔으면 true — 다음 단계로 못 넘어가고 재녹음만 가능
  const [stepMeasureFailed, setStepMeasureFailed] = React.useState(false)
  const [monitorDiag, setMonitorDiag] = React.useState("")
  // 분석이 실패했을 때 "왜 실패했는지"를 화면에 같이 보여주기 위한 문구
  const [failReason, setFailReason] = React.useState("")

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

  // 실시간 음량 모니터링용 (마이크 스트림 분석 전용 — 재생/스피커 출력과는 무관)
  const analyserRef = React.useRef<AnalyserNode | null>(null)
  const micSourceRef = React.useRef<MediaStreamAudioSourceNode | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const smoothedRmsRef = React.useRef(0) // 프레임 단위 순간값 대신 완만하게 누적된 음량(지수이동평균)
  const liveCategoryRef = React.useRef<{ cat: "quiet" | "loud" | "ok"; since: number }>({ cat: "ok", since: 0 })
  // 현재 단계(낮은 음/높은 음)의 3초 녹음 동안 "소리가 들린" 프레임 비율을 세기 위한 카운터
  const recordingRef = React.useRef(false)
  const voicedFramesRef = React.useRef(0)
  const totalFramesRef = React.useRef(0)
  const stepMaxRmsRef = React.useRef(0) // 이 단계에서 관측된 가장 큰 음량(모니터가 살아있는지 확인용)

  React.useEffect(() => {
    recordingRef.current = recording
  }, [recording])

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

  // 마이크 입력 볼륨을 매 프레임 측정해서 너무 작거나(무음에 가까움) 너무 크거나(클리핑)
  // 할 때만 안내 문구를 띄운다. 측정이 잘 되고 있으면 liveNotice를 비워서 아무것도 안 보이게 한다.
  function monitorLevel() {
    const analyser = analyserRef.current
    if (!analyser) return

    const data = new Uint8Array(analyser.fftSize)
    analyser.getByteTimeDomainData(data)

    let sumSquares = 0
    let peak = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sumSquares += v * v
      peak = Math.max(peak, Math.abs(v))
    }
    const rms = Math.sqrt(sumSquares / data.length)

    // 순간값은 숨쉬는 순간 등으로 심하게 흔들리므로, 완만하게 누적한 값으로 판정한다
    smoothedRmsRef.current =
        smoothedRmsRef.current * (1 - LIVE_SMOOTHING_ALPHA) + rms * LIVE_SMOOTHING_ALPHA

    let instant: "quiet" | "loud" | "ok"
    if (smoothedRmsRef.current < LIVE_RMS_TOO_QUIET) {
      instant = "quiet"
    } else if (peak > LIVE_PEAK_TOO_LOUD) {
      instant = "loud"
    } else {
      instant = "ok"
    }

    const now = performance.now()
    if (instant !== liveCategoryRef.current.cat) {
      // 상태가 바뀌는 순간을 기록만 해두고, 아래에서 일정 시간 유지됐을 때만 실제로 반영한다
      liveCategoryRef.current = { cat: instant, since: now }
    }

    if (now - liveCategoryRef.current.since >= LIVE_HOLD_MS) {
      const text =
          instant === "quiet"
              ? "소리가 너무 작아요. 마이크에 더 가까이서 또렷하게 소리 내주세요."
              : instant === "loud"
                  ? "소리가 너무 크거나 깨지고 있어요. 입을 마이크에서 살짝 떨어뜨려주세요."
                  : ""
      setLiveNotice((prev) => (prev === text ? prev : text))
    }

    // 지금이 "낮은 음"/"높은 음" 3초 녹음 구간이면, 이 단계에서 소리가 얼마나 잡혔는지 집계한다
    // (끝난 뒤 voicedFramesRef/totalFramesRef 비율로 "이 단계 측정이 됐는지"를 판단)
    if (recordingRef.current) {
      stepMaxRmsRef.current = Math.max(stepMaxRmsRef.current, rms)
      totalFramesRef.current += 1
      if (instant !== "quiet") {
        voicedFramesRef.current += 1
      }
    }

    rafRef.current = requestAnimationFrame(monitorLevel)
  }

  function stopLevelMonitoring() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    try {
      micSourceRef.current?.disconnect()
    } catch {
      // 이미 끊겼으면 무시
    }
    micSourceRef.current = null
    analyserRef.current = null
    smoothedRmsRef.current = 0
    liveCategoryRef.current = { cat: "ok", since: 0 }
    setLiveNotice("")
  }

  // 이전 시도에서 남은 녹음기·마이크·오디오 컨텍스트·녹음 데이터를 전부 정리한다.
  // (앱 안에서 '다시 측정하기'를 누르면 페이지가 새로 로드되지 않아 이전 상태가 그대로 남기 때문에
  //  특히 iOS에서 두 번째 측정이 조용히 실패하던 문제를 막기 위함)
  function releaseRecordingResources() {
    const mr = mediaRecorderRef.current
    if (mr) {
      mr.ondataavailable = null
      mr.onstop = null
      try {
        if (mr.state !== "inactive") mr.stop()
      } catch {
        // 이미 멈춘 상태면 무시
      }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    mediaRecorderRef.current = null
    streamRef.current = null
    chunksRef.current = []
    recordedBlobRef.current = null
    stopLevelMonitoring()
    const ctx = audioCtxRef.current
    audioCtxRef.current = null
    if (ctx) {
      ctx.close().catch(() => {})
    }
  }

  async function startRealRecording() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return
    releaseRecordingResources()
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
      setMicNotice("") // 이전 시도에서 떴던 안내 문구가 있다면 성공 시 지워준다

      // 실시간 음량 모니터링 시작 (부가 기능이라 실패해도 녹음 자체는 계속 진행)
      try {
        const ctx = getAudioCtx()
        if (ctx.state !== "running") {
          // iOS는 사용자 동작 직후가 아니면 멈춘 채로 시작할 수 있어 잠깐 기다려 다시 깨워본다
          await Promise.race([ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 700))])
        }
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 2048
        source.connect(analyser)
        micSourceRef.current = source
        analyserRef.current = analyser
        monitorLevel()
      } catch {
        // 레벨 모니터링 실패는 무시하고 녹음은 그대로 진행
      }
    } catch (err) {
      console.error("[range-test] getUserMedia/MediaRecorder 실패:", err)
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
        stopLevelMonitoring()
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
    setLowStepIdx((i) => Math.min(LOW_LADDER_DESC.length - 1, i + 1))
  }

  function handleLowFail() {
    getAudioCtx()
    setLowStepIdx((i) => Math.min(LOW_LADDER_DESC.length - 1, i + 1))  // 지금 음도 성공으로 카운트
    goToHighPhaseGuide()
  }

  function handleLowPrev() {
    getAudioCtx()
    setLowStepIdx((i) => Math.max(LOW_START_INDEX, i - 1))
  }

  function handleHighSuccess() {
    getAudioCtx()
    setHighStepIdx((i) => Math.min(HIGH_LADDER.length - 1, i + 1))
  }

  function handleHighFail() {
    getAudioCtx()
    setHighStepIdx((i) => Math.min(HIGH_LADDER.length - 1, i + 1))  // 지금 음도 성공으로 카운트
    setPhase("analyzing")
  }

  function handleHighPrev() {
    getAudioCtx()
    setHighStepIdx((i) => Math.max(HIGH_START_INDEX, i - 1))
  }

  // ---- 직접 녹음(기존) 모드 (녹음 + 서버 분석 사용) ----

  // 새 단계(낮은 음/높은 음) 녹음을 시작할 때마다 이전 단계의 음량 집계를 초기화한다
  function resetStepVoicedCounters() {
    voicedFramesRef.current = 0
    totalFramesRef.current = 0
    stepMaxRmsRef.current = 0
    setStepMeasureFailed(false)
    setMonitorDiag("")
  }

  async function startClassicStep(p: "low" | "high") {
    setMode("classic")
    setPhase(p)
    resetStepVoicedCounters()
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

          // 이번 3초 동안 소리가 충분히 잡혔는지 비율로 판단 — 너무 낮으면 다음 단계로
          // 못 넘어가게 막고 이 단계를 다시 녹음하도록 유도한다
          const total = totalFramesRef.current
          const voicedRatio = total > 0 ? voicedFramesRef.current / total : 0
          const ctx = audioCtxRef.current
          const track = streamRef.current?.getAudioTracks()[0]
          const maxRms = stepMaxRmsRef.current
          const monitorBlind = maxRms < MONITOR_DEAD_RMS
          const diag =
              `ctx=${ctx?.state ?? "none"} rate=${ctx?.sampleRate ?? "-"} ` +
              `track=${track?.readyState ?? "none"}/${track?.muted ? "muted" : "live"} ` +
              `max=${maxRms.toFixed(4)} ratio=${voicedRatio.toFixed(2)}${monitorBlind ? " (모니터 먹통)" : ""}`
          console.log("[range-test] 단계 종료 진단:", diag)
          setMonitorDiag(diag)
          // 음량 모니터 자체가 먹통이면(소리가 전혀 안 읽힘) 실제 녹음은 정상일 수 있으므로 여기서 막지 않고
          // 최종 판단은 서버 분석에 맡긴다
          setStepMeasureFailed(!monitorBlind && voicedRatio < STEP_MIN_VOICED_RATIO)

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
    resetStepVoicedCounters()
    setProgress(0)
    setRecording(true)
  }

  async function handleClassicAdvance() {
    if (stepMeasureFailed) return // 안전장치 — 측정 실패 상태에선 버튼 자체가 안 보이지만 혹시 몰라 막아둔다
    if (phase === "low") {
      setPhase("high")
      resetStepVoicedCounters()
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
      const tones = ["bright", "warm", "husky", "soft"] as const

      // 가이드 모드: 실제 음성 분석을 하지 않는, 버튼 클릭 기반 추정이므로 항상 그대로 진행
      if (mode === "guide") {
        const lowest = lowestFromIndex(lowStepIdx)
        const highest = highestFromIndex(highStepIdx)
        await new Promise((r) => setTimeout(r, 1000))
        if (cancelled) return
        setResult({
          testedAt: new Date().toISOString(),
          lowestNote: lowest,
          highestNote: highest,
          comfortableHigh: shiftDownInHighLadder(highest, 2),
          voiceTone: tones[Math.floor(Math.random() * tones.length)],
        })
        setPhase("done")
        return
      }

      // 직접 녹음 모드: 서버 분석 결과만 신뢰한다. 실제 녹음이 없거나 분석이 실패하면
      // 추정치로 대체하지 않고 '측정된 값이 없습니다' 화면으로 보낸다.
      const hasRealRecording = !!recordedBlobRef.current && recordedBlobRef.current.size > 0

      if (!hasRealRecording) {
        if (!cancelled) {
          setFailReason("녹음된 소리가 없어요 (녹음 데이터 0바이트)")
          setPhase("failed")
        }
        return
      }

      if (!userId) {
        if (!cancelled) {
          setFailReason("로그인 정보를 찾지 못했어요. 로그아웃 후 다시 로그인해주세요")
          setPhase("failed")
        }
        return
      }

      try {
        const res = await api.uploadVoice(userId, recordedBlobRef.current!, "range-test.webm")
        if (!res.minNoteLabel || !res.maxNoteLabel) {
          console.error("[range-test] 서버 응답에 음 정보가 없음:", res)
          if (!cancelled) {
            setFailReason("서버가 음역대를 돌려주지 않았어요")
            setPhase("failed")
          }
          return
        }
        if (!cancelled) {
          setResult({
            testedAt: res.measuredAt || new Date().toISOString(),
            lowestNote: res.minNoteLabel,
            highestNote: res.maxNoteLabel,
            comfortableHigh: shiftDownInHighLadder(res.maxNoteLabel, 2),
            voiceTone: tones[Math.floor(Math.random() * tones.length)],
          })
          setPhase("done")
        }
      } catch (err) {
        console.error("[range-test] 음성 분석 요청 실패:", err)
        if (!cancelled) {
          const e = err as { status?: number; message?: string }
          const size = recordedBlobRef.current ? Math.round(recordedBlobRef.current.size / 1024) : 0
          const type = recordedBlobRef.current?.type || "알 수 없음"
          setFailReason(
              `서버 요청 실패${e?.status ? ` (${e.status})` : ""}${e?.message ? `: ${String(e.message).slice(0, 120)}` : ""} · 녹음 ${size}KB, ${type}`
          )
          setPhase("failed")
        }
      }
    }

    run()
    return () => { cancelled = true }
  }, [phase, mode, lowStepIdx, highStepIdx, classicLowIdx, classicHighIdx, userId])

  function resetAll() {
    releaseRecordingResources()
    setMode(null)
    setPhase("intro")
    setLowStepIdx(LOW_START_INDEX)
    setHighStepIdx(HIGH_START_INDEX)
    setClassicLowIdx(0)
    setClassicHighIdx(0)
    setProgress(0)
    setRecording(false)
    setStepMeasureFailed(false)
    setFailReason("")
    setAutoAttempt(0)
    setAutoHits(0)
    setHeardLabel("")
  }

  // ---- 가이드 음 자동 측정 (마이크로 실시간 음높이를 들어서 성공/실패를 자동 판단) ----
  const [autoOn, setAutoOn] = React.useState(true)
  const [autoState, setAutoState] = React.useState<"tone" | "listen" | "ok" | "miss">("tone")
  const [autoHits, setAutoHits] = React.useState(0)
  const [heardLabel, setHeardLabel] = React.useState("")
  const [autoAttempt, setAutoAttempt] = React.useState(0)
  const [autoMicReady, setAutoMicReady] = React.useState(false)
  const [autoMicError, setAutoMicError] = React.useState("")
  const pitchStreamRef = React.useRef<MediaStream | null>(null)
  const pitchSourceRef = React.useRef<MediaStreamAudioSourceNode | null>(null)
  const pitchAnalyserRef = React.useRef<AnalyserNode | null>(null)

  const inAutoGuide = mode === "guide" && autoOn && (phase === "low" || phase === "high")

  // 자동 측정이 필요한 동안(낮은 음 → 높은 음)만 마이크를 열어 둔다.
  React.useEffect(() => {
    if (!inAutoGuide) return
    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const ctx = getAudioCtx()
        if (ctx.state !== "running") {
          await Promise.race([ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 700))])
        }
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 4096
        source.connect(analyser)
        pitchStreamRef.current = stream
        pitchSourceRef.current = source
        pitchAnalyserRef.current = analyser
        setAutoMicError("")
        setAutoMicReady(true)
      } catch {
        if (!cancelled) {
          setAutoMicError("마이크를 쓸 수 없어서 버튼으로 직접 고르는 방식으로 바꿨어요.")
          setAutoOn(false)
        }
      }
    })()
    return () => {
      cancelled = true
      try {
        pitchSourceRef.current?.disconnect()
      } catch {
        // 이미 끊겼으면 무시
      }
      pitchStreamRef.current?.getTracks().forEach((t) => t.stop())
      pitchSourceRef.current = null
      pitchStreamRef.current = null
      pitchAnalyserRef.current = null
      setAutoMicReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inAutoGuide])

  // 한 음 단계: 가이드음 재생 → 따라 부르는 소리 듣기 → 성공이면 다음 음, 실패면 재시도 → 그래도 실패면 마지막 성공 음에서 끝
  React.useEffect(() => {
    if (!inAutoGuide || !autoMicReady) return
    const isLow = phase === "low"
    const note = isLow ? LOW_LADDER_DESC[lowStepIdx] : HIGH_LADDER[highStepIdx]
    const isLastStep = isLow ? lowStepIdx >= LOW_LADDER_DESC.length - 1 : highStepIdx >= HIGH_LADDER.length - 1
    const targetMidi = noteToMidi(note)
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    let tick: ReturnType<typeof setInterval> | null = null
    const wait = (ms: number) =>
        new Promise<void>((res) => {
          timers.push(setTimeout(res, ms))
        })
    const finish = () => {
          // 마지막으로 성공한 음이 결과. (현재 음은 세지 않는다 — lowestFromIndex/highestFromIndex가 idx-1을 돌려줌)
          if (isLow) goToHighPhaseGuide()
          else setPhase("analyzing")
        }

    ;(async () => {
      setAutoState("tone")
      setAutoHits(0)
      setHeardLabel("")
      await loadPianoBuffer(note) // 처음 한 번은 음원을 받아오느라 늦을 수 있어서, 먼저 받아두고 재생
      if (cancelled) return
      playGuideTone(note, AUTO_TONE_MS)
      await wait(AUTO_TONE_MS + AUTO_AFTER_TONE_GAP_MS)
      if (cancelled) return

      setAutoState("listen")
      const analyser = pitchAnalyserRef.current
      const sr = audioCtxRef.current?.sampleRate ?? 48000
      if (!analyser) return
      const buf = new Float32Array(analyser.fftSize)
      let hits = 0
      const outcome = await new Promise<"ok" | "timeout">((resolve) => {
        const startAt = performance.now()
        tick = setInterval(() => {
          if (cancelled) {
            resolve("timeout")
            return
          }
          analyser.getFloatTimeDomainData(buf)
          const p = detectPitch(buf, sr, AUTO_MIN_RMS)
          if (p && p.clarity >= AUTO_MIN_CLARITY) {
            const midi = freqToMidi(p.freq)
            setHeardLabel(noteToKorean(midiToNote(Math.round(midi))))
            hits = Math.abs(midi - targetMidi) <= 1 ? hits + 1 : Math.max(0, hits - 2)
            setAutoHits(hits)
            if (hits >= AUTO_HITS_NEEDED) {
              resolve("ok")
              return
            }
          }
          if (performance.now() - startAt > AUTO_LISTEN_MS) resolve("timeout")
        }, AUTO_TICK_MS)
      })
      if (tick) clearInterval(tick)
      if (cancelled) return

      if (outcome === "ok") {
        setAutoState("ok")
        await wait(800)
        if (cancelled) return
        setAutoAttempt(0)
        if (isLastStep) {
          finish() // 사다리 끝까지 성공
        } else if (isLow) {
          handleLowSuccess()
        } else {
          handleHighSuccess()
        }
        return
      }

      setAutoState("miss")
      if (autoAttempt + 1 < AUTO_MAX_ATTEMPTS) {
        await wait(1200)
        if (cancelled) return
        setAutoAttempt((a) => a + 1) // 같은 음을 한 번 더 들려주고 다시 듣는다
        return
      }
      await wait(1200)
      if (cancelled) return
      setAutoAttempt(0)
      finish()
    })()

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      if (tick) clearInterval(tick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inAutoGuide, autoMicReady, phase, lowStepIdx, highStepIdx, autoAttempt])

  React.useEffect(() => {
    return () => {
      releaseRecordingResources()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                음을 듣고 따라 부르면 자동으로 측정
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
    const atEnd = isLow ? lowStepIdx >= LOW_LADDER_DESC.length - 1 : highStepIdx >= HIGH_LADDER.length - 1

    return (
        <div className="flex flex-col items-center text-center gap-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground font-medium mt-0.5">{isLow ? "낮은 음 측정" : "높은 음 측정"}</div>
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              소리가 안 들리면 무음 모드를 해제해주세요
            </p>
          </div>

          <div className="relative h-40 w-40">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-brand opacity-25 blur-2xl animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary to-brand grid place-items-center">
              <Music2 className="h-12 w-12 text-white" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 w-full">
            <div className="text-xs text-muted-foreground">
              가이드음을 듣고 &lsquo;아~&rsquo; 하고 따라 불러보세요.
            </div>
            <div className="text-2xl font-extrabold text-primary">
              {noteToKorean(currentNote)}
            </div>
            {autoOn ? (
                <div className="w-full space-y-2">
                  <div className="min-h-[44px] text-sm font-semibold">
                    {!autoMicReady
                        ? "마이크 준비 중이에요…"
                        : autoState === "tone"
                            ? "🎹 가이드음을 잘 들어보세요"
                            : autoState === "listen"
                                ? "지금 따라 불러보세요! '아~'"
                                : autoState === "ok"
                                    ? "✅ 좋아요! 다음 음으로 갈게요"
                                    : autoAttempt + 1 < AUTO_MAX_ATTEMPTS
                                        ? "아직 안 맞아요. 한 번 더 들려드릴게요"
                                        : "여기까지로 정할게요"}
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (autoHits / AUTO_HITS_NEEDED) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground h-4">
                    {autoState === "listen" && heardLabel ? `들리는 음: ${heardLabel}` : ""}
                  </div>
                </div>
            ) : (
                <Button variant="outline" size="sm" onClick={() => playGuideTone(currentNote)}>
                  <Music2 className="h-4 w-4" /> 가이드음 다시 듣기
                </Button>
            )}
          </div>

          {autoOn ? (
              <div className="w-full space-y-3">
                {autoMicError && <p className="text-xs text-destructive">{autoMicError}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="lg" onClick={isLow ? handleLowPrev : handleHighPrev} disabled={atStart}>
                    ← 이전 음
                  </Button>
                  <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        if (isLow) goToHighPhaseGuide()
                        else setPhase("analyzing")
                      }}
                  >
                    여기서 끝내기
                  </Button>
                </div>
                <button
                    type="button"
                    onClick={() => setAutoOn(false)}
                    className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  자동 감지가 안 되면 버튼으로 직접 고르기
                </button>
              </div>
          ) : (
              <div className="w-full space-y-3">
                {autoMicError && <p className="text-xs text-destructive">{autoMicError}</p>}
                <Button
                    variant="brand"
                    size="lg"
                    className="w-full"
                    onClick={isLow ? handleLowSuccess : handleHighSuccess}
                    disabled={atEnd}
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
                <button
                    type="button"
                    onClick={() => {
                      setAutoMicError("")
                      setAutoOn(true)
                    }}
                    className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  자동 감지로 돌아가기
                </button>
              </div>
          )}
        </div>
    )
  }

  if ((phase === "low" || phase === "high") && mode === "classic") {
    return (
        <div className="flex flex-col items-center text-center gap-6">
          <div className="text-xs text-muted-foreground">
            {phase === "low" ? "단계 1 / 2 · 낮은 음 녹음 중" : "단계 2 / 2 · 높은 음 녹음 중"}
          </div>
          <div className="rounded-[10px] bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400 w-full leading-relaxed">
            음악·영상 등 주변 소리를 끄고, 마이크에 가까이서 또렷하게 소리 내주세요.
            <br />
            배경 소리가 있으면 측정이 부정확할 수 있어요.
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
                  {recording
                      ? "녹음 중... 편하게 3초만 유지해주세요"
                      : stepMeasureFailed
                          ? "측정이 잘 안됐어요"
                          : "녹음 완료"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {phase === "low" ? "가장 낮은 음을 편하게 내주세요" : "가장 높은 음을 편하게 내주세요"}
                </div>
              </div>
              <WaveBars active={recording} />
            </div>

            {/* 실시간 음량/노이즈 안내 — 잘 측정되고 있으면 아무것도 안 뜸 */}
            {recording && liveNotice && (
                <div className="mb-3 rounded-[10px] bg-destructive/10 border border-destructive/30 px-3 py-2 text-[11px] text-destructive leading-relaxed animate-pulse">
                  {liveNotice}
                </div>
            )}

            <Progress value={progress} />
          </div>

          {micNotice && <p className="text-xs text-muted-foreground">{micNotice}</p>}
          {!recording && monitorDiag && (
              <p className="text-[10px] text-muted-foreground break-all">진단: {monitorDiag}</p>
          )}

          <div className="w-full space-y-3">
            {recording ? (
                <p className="text-xs text-muted-foreground">
                  아무 음이나 편하게 &lsquo;아~&rsquo; 하고 3초 정도 유지해주세요. 녹음이 끝나면 버튼이 나타나요.
                </p>
            ) : stepMeasureFailed ? (
                <>
                  <p className="text-xs font-semibold text-destructive">
                    소리가 거의 안 잡혔어요. 마이크에 더 가까이서 또렷하게 다시 녹음해주세요.
                  </p>
                  <Button variant="brand" size="lg" className="w-full" onClick={handleClassicRetry}>
                    <RotateCcw className="h-4 w-4" /> 다시 녹음하기
                  </Button>
                </>
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
              {mode === "classic" ? "목소리를 분석하는 중" : "결과를 정리하는 중"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">잠시만 기다려주세요...</div>
          </div>
        </div>
    )
  }

  if (phase === "failed") {
    return (
        <div className="flex flex-col items-center text-center gap-6 py-10">
          <div className="relative h-32 w-32">
            <div className="absolute inset-0 rounded-full bg-destructive/20 blur-2xl" />
            <div className="absolute inset-2 rounded-full bg-surface grid place-items-center">
              <MicOff className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <div>
            <div className="text-lg font-bold">측정된 값이 없습니다</div>
            <div className="mt-1 text-xs text-muted-foreground">
              목소리 분석에 실패했어요. 다시 시도해주세요.
            </div>
            {failReason && (
                <div className="mt-3 rounded-[10px] bg-surface/70 border border-border/60 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed break-words">
                  원인: {failReason}
                </div>
            )}
          </div>
          <div className="w-full">
            <Button variant="brand" size="lg" className="w-full" onClick={resetAll}>
              <RotateCcw className="h-4 w-4" /> 다시 측정하기
            </Button>
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