"use client"

import * as React from "react"
import { SoundTouchNode } from "@soundtouchjs/audio-worklet"
import { registerPreviewSource, stopOtherPreviews } from "./preview-bus"

// 일반 미리듣기(audio-preview.ts)와 같은 싱글톤 패턴 — 앱 전체에서
// "키 조정 미리듣기"도 한 번에 하나만 재생되도록 함.
//
// 피치시프트는 SoundTouch(WSOLA 계열)를 씀 — Tone.PitchShift(그래뉼러 딜레이)보다
// 지글거리는 아티팩트가 적음. 다만 두 방식 다 "포먼트 보정"이 없어서 반음 수가
// 클수록 음색 자체가 변하는(다람쥐/괴물 목소리) 현상은 공통으로 생김.
// 그래서 재생 전에 L-R 위상상쇄로 센터에 배치된 보컬을 줄여(완벽한 보컬 제거는
// 아니지만 노래방 MR 비슷하게 들리게 함), 음색 변조가 덜 거슬리게 들리도록 함.

type PlaybackState = "idle" | "loading" | "playing" | "error"

let audioCtx: AudioContext | null = null
let processorRegistered = false
let sourceNode: AudioBufferSourceNode | null = null
let stNode: SoundTouchNode | null = null
let gainNode: GainNode | null = null
let currentId: string | null = null
const listeners = new Set<(id: string | null) => void>()
const bufferCache = new Map<string, AudioBuffer>() // previewUrl -> 보컬 줄인 디코딩 버퍼

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

// 센터(가운데)에 배치된 보컬을 L-R 위상상쇄로 줄인다.
// 완벽한 보컬 제거는 아니고 (믹스에 따라 효과 차이가 큼), 모노 소스면 효과가 없음.
function reduceCenterVocal(ctx: AudioContext, buffer: AudioBuffer): AudioBuffer {
    if (buffer.numberOfChannels < 2) return buffer // 스테레오가 아니면 L-R 트릭 불가

    const left = buffer.getChannelData(0)
    const right = buffer.getChannelData(1)
    const length = buffer.length

    const out = ctx.createBuffer(2, length, buffer.sampleRate)
    const outL = out.getChannelData(0)
    const outR = out.getChannelData(1)

    let peak = 0
    for (let i = 0; i < length; i++) {
        const diff = left[i] - right[i]
        outL[i] = diff
        outR[i] = diff
        const abs = Math.abs(diff)
        if (abs > peak) peak = abs
    }

    // L-R 연산 특성상 전체 음량이 많이 줄어들어서, 피크 기준으로 다시 키워줌
    if (peak > 0.001 && peak < 0.9) {
        const gain = 0.9 / peak
        for (let i = 0; i < length; i++) {
            outL[i] *= gain
            outR[i] *= gain
        }
    }

    return out
}

async function loadProcessedBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer> {
    const cached = bufferCache.get(url)
    if (cached) return cached
    const res = await fetch(url)
    const arrayBuffer = await res.arrayBuffer()
    const decoded = await ctx.decodeAudioData(arrayBuffer)
    const reduced = reduceCenterVocal(ctx, decoded)
    bufferCache.set(url, reduced)
    return reduced
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

            const audioBuffer = await loadProcessedBuffer(ctx, previewUrl)

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