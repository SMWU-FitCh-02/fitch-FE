"use client"

import * as React from "react"
import { X, Sparkles } from "lucide-react"
import { api, buildSongKey } from "@/lib/api"
import { getWatches, removeWatches, WATCH_EVENT } from "@/lib/analysis-watch"

type Toast = { id: number; title: string; artist: string; ok: boolean }

const POLL_MS = 15000
const TOAST_MS = 9000

// 앱 어느 화면에 있든, "분석 요청"한 곡의 분석이 끝나면 화면 위쪽에 알림을 띄운다.
export function AnalysisWatcher() {
    const [toasts, setToasts] = React.useState<Toast[]>([])
    const nextId = React.useRef(1)

    const dismiss = React.useCallback((id: number) => {
        setToasts((t) => t.filter((x) => x.id !== id))
    }, [])

    const check = React.useCallback(async () => {
        const watches = getWatches()
        if (watches.length === 0) return
        try {
            const ranges = await api.getVocalRanges(watches.map((w) => ({ title: w.title, artist: w.artist })))
            const statuses = await api.getAnalysisStatuses(watches.map((w) => ({ title: w.title, artist: w.artist })))
            const finished: string[] = []
            const newToasts: Toast[] = []
            for (const w of watches) {
                const key = buildSongKey(w.title, w.artist)
                const done = !!ranges?.[key]
                const failed = statuses?.[key] === "FAILED"
                if (done || failed) {
                    finished.push(key)
                    newToasts.push({ id: nextId.current++, title: w.title, artist: w.artist, ok: done })
                }
            }
            if (finished.length > 0) {
                removeWatches(finished)
                setToasts((t) => [...t, ...newToasts])
                newToasts.forEach((n) => setTimeout(() => dismiss(n.id), TOAST_MS))
            }
        } catch {
            // 네트워크 오류는 다음 주기에 다시 확인
        }
    }, [dismiss])

    React.useEffect(() => {
        check()
        const t = setInterval(check, POLL_MS)
        window.addEventListener(WATCH_EVENT, check)
        return () => {
            clearInterval(t)
            window.removeEventListener(WATCH_EVENT, check)
        }
    }, [check])

    if (toasts.length === 0) return null

    return (
        <div className="fixed inset-x-0 top-3 z-50 mx-auto flex max-w-md flex-col gap-2 px-4 pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className="pointer-events-auto flex items-center gap-3 rounded-[14px] border border-primary/30 bg-surface-elevated/95 p-3 shadow-lg backdrop-blur"
                >
                    <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">
                            {t.ok ? "분석이 끝났어요" : "분석에 실패했어요"}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                            {t.title} · {t.artist}
                        </div>
                    </div>
                    {t.ok && (
                        <button
                            type="button"
                            onClick={() => {
                                window.location.href = `/mypage/key-adjustment?q=${encodeURIComponent(t.title)}`
                            }}
                            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                        >
                            확인하기
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => dismiss(t.id)}
                        aria-label="닫기"
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    )
}