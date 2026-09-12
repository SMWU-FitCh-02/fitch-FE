"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { fetchKoreaTopSongs, type ChartEntry } from "@/lib/itunes"
import { ChartPodiumItem, ChartSongRow } from "@/components/chart-song-row"

export default function ChartPage() {
  const [chart, setChart] = React.useState<ChartEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    let cancelled = false
    fetchKoreaTopSongs(50)
      .then((data) => {
        if (!cancelled) setChart(data)
      })
      .catch(() => {
        if (!cancelled) setError("차트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const top3 = chart.slice(0, 3)
  const rest = chart.slice(3)

  return (
    <main className="px-4 pt-4 pb-6">
      <header className="px-1 mb-5">
        <div className="text-xs text-primary font-bold flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" />
          Apple Music 기준
        </div>
        <h1 className="text-2xl font-extrabold">인기차트</h1>
        <div className="mt-1 text-xs text-muted-foreground">대한민국 Top {chart.length || 50}</div>
      </header>

      {loading && (
        <div className="py-16 text-center text-sm text-muted-foreground">차트를 불러오는 중...</div>
      )}

      {!loading && error && (
        <div className="py-16 text-center text-sm text-destructive">{error}</div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {top3.map((entry) => (
              <ChartPodiumItem key={entry.id} entry={entry} />
            ))}
          </div>

          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="text-sm font-bold">4위 이하</h2>
          </div>

          <div className="space-y-2">
            {rest.map((entry) => (
              <ChartSongRow key={entry.id} entry={entry} />
            ))}
          </div>
        </>
      )}
    </main>
  )
}
