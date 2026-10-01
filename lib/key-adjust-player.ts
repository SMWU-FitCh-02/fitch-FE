"use client"

import * as React from "react"
import { registerPreviewSource, stopOtherPreviews } from "./preview-bus"

// 일반 미리듣기(audio-preview.ts)와 똑같은 싱글톤 <audio> 패턴.
//
// 피치시프트는 더 이상 브라우저(Tone.js/SoundTouch)에서 하지 않고, 서버
// (fitch-voice-server의 /voice/key-adjust)에서 Rubber Band(포먼트 보정 지원)로
// 미리 처리한 오디오를 그대로 재생한다. 그래서 여기는 audio-preview.ts와
// 거의 동일하게 단순하고, src만 "처리된 파일의 URL"이라는 점만 다르다.

export const VOICE_API_BASE = process.env.NEXT_PUBLIC_VOICE_API_URL || "http://localhost:5000"

// previewUrl(원본 30초 미리듣기)과 조정할 반음 수를 서버가 처리해주는 엔드포인트 URL
export function buildKeyAdjustUrl(previewUrl: string, semitones: number): string {
    const params = new URLSearchParams({
        previewUrl,
        semitones: String(semitones),
    })
    return `${VOICE_API_BASE}/voice/key-adjust?${params.toString()}`
}

let sharedAudio: HTMLAudioElement | null = null
let currentId: string | null = null
const listeners = new Set<(id: string | null) => void>()

type PlaybackState = "idle" | "loading" | "playing" | "error"
let currentState: PlaybackState = "idle"
const stateListeners = new Set<(s: PlaybackState) => void>()

function getAudio() {
    if (!sharedAudio) {
        sharedAudio = new Audio()
        sharedAudio.addEventListener("ended", () => {
            setCurrentId(null)
            setState("idle")
        })
        sharedAudio.addEventListener("waiting", () => setState("loading"))
        sharedAudio.addEventListener("playing", () => setState("playing"))
        sharedAudio.addEventListener("error", () => setState("error"))
    }
    return sharedAudio
}

function setCurrentId(id: string | null) {
    currentId = id
    listeners.forEach((l) => l(id))
}

function setState(s: PlaybackState) {
    currentState = s
    stateListeners.forEach((l) => l(s))
}

function stopKeyAdjustPreview() {
    sharedAudio?.pause()
    setCurrentId(null)
    setState("idle")
}

// 일반 미리듣기가 재생을 시작할 때 이쪽을 멈출 수 있도록 등록
registerPreviewSource("keyadjust", stopKeyAdjustPreview)

export function useKeyAdjustPreviewPlayer() {
    const [playingId, setPlayingId] = React.useState<string | null>(currentId)
    const [state, setLocalState] = React.useState<PlaybackState>(currentState)

    React.useEffect(() => {
        listeners.add(setPlayingId)
        stateListeners.add(setLocalState)
        return () => {
            listeners.delete(setPlayingId)
            stateListeners.delete(setLocalState)
        }
    }, [])

    // previewUrl: fetchArtwork(title, artist)로 받아온 원본 30초 미리듣기 mp3
    // semitones: computeKeySemitoneShift(entry, profile.range) 결과값
    const toggle = React.useCallback((id: string, previewUrl: string, semitones: number) => {
        const audio = getAudio()
        if (currentId === id) {
            audio.pause()
            setCurrentId(null)
            setState("idle")
            return
        }

        stopOtherPreviews("keyadjust") // 일반 미리듣기 재생 중이었다면 먼저 정지

        setState("loading")
        audio.src = buildKeyAdjustUrl(previewUrl, semitones)
        audio.currentTime = 0
        audio
            .play()
            .then(() => setState("playing"))
            .catch(() => setState("error"))
        setCurrentId(id)
    }, [])

    return { playingId, state, toggle }
}