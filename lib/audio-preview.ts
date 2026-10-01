"use client"

import * as React from "react"
import { registerPreviewSource, stopOtherPreviews } from "./preview-bus"

let sharedAudio: HTMLAudioElement | null = null
let currentId: string | null = null
const listeners = new Set<(id: string | null) => void>()

function getAudio() {
    if (!sharedAudio) {
        sharedAudio = new Audio()
        sharedAudio.addEventListener("ended", () => setCurrentId(null))
    }
    return sharedAudio
}

function setCurrentId(id: string | null) {
    currentId = id
    listeners.forEach((l) => l(id))
}

function stopPreview() {
    sharedAudio?.pause()
    setCurrentId(null)
}

// 키 조정 미리듣기(key-adjust-player.ts)가 재생을 시작할 때 이쪽을 멈출 수 있도록 등록
registerPreviewSource("normal", stopPreview)

export function usePreviewPlayer() {
    const [playingId, setPlayingId] = React.useState<string | null>(currentId)

    React.useEffect(() => {
        listeners.add(setPlayingId)
        return () => {
            listeners.delete(setPlayingId)
        }
    }, [])

    const toggle = React.useCallback((id: string, url: string) => {
        const audio = getAudio()
        if (currentId === id) {
            audio.pause()
            setCurrentId(null)
            return
        }
        stopOtherPreviews("normal") // 키 조정 미리듣기가 재생 중이었다면 먼저 정지
        audio.src = url
        audio.currentTime = 0
        audio.play().catch(() => {})
        setCurrentId(id)
    }, [])

    return { playingId, toggle }
}