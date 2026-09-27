"use client"

import * as React from "react"

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
        audio.src = url
        audio.currentTime = 0
        audio.play().catch(() => {})
        setCurrentId(id)
    }, [])

    return { playingId, toggle }
}