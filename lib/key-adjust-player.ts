"use client"

import * as React from "react"
import * as Tone from "tone"
import { registerPreviewSource, stopOtherPreviews } from "./preview-bus"

// 일반 미리듣기(audio-preview.ts)와 같은 싱글톤 패턴 — 앱 전체에서
// "키 조정 미리듣기"도 한 번에 하나만 재생되도록 함.

type PlaybackState = "idle" | "loading" | "playing" | "error"

let player: Tone.Player | null = null
let pitchShift: Tone.PitchShift | null = null
let currentId: string | null = null
const listeners = new Set<(id: string | null) => void>()

function setCurrentId(id: string | null) {
    currentId = id
    listeners.forEach((l) => l(id))
}

function stopKeyAdjustPreview() {
    player?.stop()
    player?.dispose()
    pitchShift?.dispose()
    player = null
    pitchShift = null
    setCurrentId(null)
}

// 일반 미리듣기가 재생을 시작할 때 이쪽을 멈출 수 있도록 등록
registerPreviewSource("keyadjust", stopKeyAdjustPreview)

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
            // 브라우저 오디오 정책상 반드시 사용자 클릭 이벤트 핸들러 "안에서" 호출돼야 함
            await Tone.start()

            pitchShift = new Tone.PitchShift({ pitch: semitones }).toDestination()
            player = new Tone.Player({
                url: previewUrl,
                onload: () => {
                    player?.start()
                    setState("playing")
                    setCurrentId(id)
                },
                onstop: () => {
                    setState("idle")
                },
            }).connect(pitchShift)
        } catch (err) {
            console.error("[key-adjust-player] 재생 실패:", err)
            setState("error")
        }
    }, [])

    return { playingId, state, toggle }
}