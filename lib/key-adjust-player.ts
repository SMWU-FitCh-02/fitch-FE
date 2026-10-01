"use client"

import * as React from "react"
import { SoundTouchNode } from "@soundtouchjs/audio-worklet"
import { registerPreviewSource, stopOtherPreviews } from "./preview-bus"

// 일반 미리듣기(audio-preview.ts)와 같은 싱글톤 패턴 — 앱 전체에서
// "키 조정 미리듣기"도 한 번에 하나만 재생되도록 함.
//
// 이전엔 Tone.PitchShift(그래뉼러 딜레이 방식)를 썼는데, 보컬처럼 지속음이
// 많은 소스에서 지글거리는 아티팩트가 심했음. SoundTouch(WSOLA 계열)는
// 음의 피치 주기를 분석해서 자연스럽게 겹쳐 붙이는 방식이라 음질이 훨씬 나음.

type PlaybackState = "idle" | "loading" | "playing" | "error"

let audioCtx: AudioContext | null = null
let processorRegistered = false
let sourceNode: AudioBufferSourceNode | null = null
let stNode: SoundTouchNode | null = null
let gainNode: GainNode | null = null
let currentId: string | null = null
const listeners = new Set<(id: string | null) => void>()
const bufferCache = new Map<string, AudioBuffer>() // previewUrl -> 디코딩된 오디오

function getAudioContext() {
    if (!audioCtx) audioCtx = new AudioContext()
    return audioCtx
}

function setCurrentId(id: string | null) {
    currentId = id
    listeners.forEach((l) => l(id))
}

function stopKeyAdjustPreview() {
    try {
        sourceNode?.stop()
    } catch {
        // 이미 멈췄거나 아직 시작 전이면 무시
    }
    sourceNode?.disconnect()
    stNode?.disconnect()
    gainNode?.disconnect()
    sourceNode = null
    stNode = null
    gainNode = null
    setCurrentId(null)
}

// 일반 미리듣기가 재생을 시작할 때 이쪽을 멈출 수 있도록 등록
registerPreviewSource("keyadjust", stopKeyAdjustPreview)

async function loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer> {
    const cached = bufferCache.get(url)
    if (cached) return cached
    const res = await fetch(url)
    const arrayBuffer = await res.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    bufferCache.set(url, audioBuffer)
    return audioBuffer
}

export function useKeyAdjustPreviewPlayer() {
    const [playingId, setPlayingId] = React.useState<string | null>(currentId)
    const [state, setState] = React.useState<PlaybackState>("idle")

    React.useEffect(() => {
        listeners.add(setPlayingId)
        return () => {
            listeners.delete(setPlayingId)
        }
    }, [])

    // previewUrl: fetchArtwork(title, artist)로 받아온 30초 미리듣기 mp3
    // semitones: computeKeySemitoneShift(entry, profile.range) 결과값
    const toggle = React.useCallback(async (id: string, previewUrl: string, semitones: number) => {
        if (currentId === id) {
            stopKeyAdjustPreview()
            setState("idle")
            return
        }

        stopOtherPreviews("keyadjust") // 일반 미리듣기 재생 중이었다면 먼저 정지
        stopKeyAdjustPreview() // 이전에 재생 중이던 다른 키 조정 미리듣기 정리

        setState("loading")
        try {
            const ctx = getAudioContext()
            // 브라우저 오디오 정책상 반드시 사용자 클릭 이벤트 핸들러 "안에서" 호출돼야 함
            if (ctx.state === "suspended") await ctx.resume()

            // AudioWorklet 프로세서는 한 번만 등록하면 됨 (public/soundtouch-processor.js 서빙 필요)
            if (!processorRegistered) {
                await SoundTouchNode.register(ctx, "/soundtouch-processor.js")
                processorRegistered = true
            }

            const audioBuffer = await loadBuffer(ctx, previewUrl)

            const node = new SoundTouchNode({ context: ctx })
            node.pitchSemitones.value = semitones
            node.playbackRate.value = 1.0 // 템포는 그대로, 피치만 조정

            const gain = ctx.createGain()
            gain.gain.value = 1.0
            node.connect(gain)
            gain.connect(ctx.destination)

            const source = ctx.createBufferSource()
            source.buffer = audioBuffer
            source.connect(node)
            source.onended = () => {
                setState("idle")
                setCurrentId(null)
            }
            source.start()

            sourceNode = source
            stNode = node
            gainNode = gain
            setState("playing")
            setCurrentId(id)
        } catch (err) {
            console.error("[key-adjust-player] 재생 실패:", err)
            setState("error")
        }
    }, [])

    return { playingId, state, toggle }
}