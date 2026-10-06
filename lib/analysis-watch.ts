// "분석 요청"한 곡을 브라우저에 기억해 두는 목록.
// 사용자가 다른 화면으로 이동하거나 패널을 닫아도, AnalysisWatcher가 이 목록을 보고
// 분석이 끝났는지 확인해서 화면 안 알림(토스트)을 띄운다.

import { buildSongKey } from "@/lib/api"

const STORAGE_KEY = "analysisWatches"
export const WATCH_EVENT = "analysis-watch-changed"

export type WatchedSong = { title: string; artist: string }

export function getWatches(): WatchedSong[] {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        const list = raw ? JSON.parse(raw) : []
        return Array.isArray(list) ? list : []
    } catch {
        return []
    }
}

function save(list: WatchedSong[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    } catch {
        // 저장소를 못 쓰는 환경이면 알림만 포기
    }
    window.dispatchEvent(new Event(WATCH_EVENT))
}

export function addWatch(song: WatchedSong) {
    if (typeof window === "undefined") return
    const key = buildSongKey(song.title, song.artist)
    const list = getWatches()
    if (list.some((s) => buildSongKey(s.title, s.artist) === key)) return
    save([...list, { title: song.title, artist: song.artist }])
}

export function removeWatches(keys: string[]) {
    if (typeof window === "undefined" || keys.length === 0) return
    const set = new Set(keys)
    save(getWatches().filter((s) => !set.has(buildSongKey(s.title, s.artist))))
}