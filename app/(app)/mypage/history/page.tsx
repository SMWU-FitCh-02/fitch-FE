"use client"

import * as React from "react"
import Link from "next/link"
import { Mic, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { noteToMidi, noteToKorean } from "@/lib/songs"
import { Badge } from "@/components/ui/badge"

export default function HistoryPage() {
  const { profile } = useStore()
  const history = profile.history

  if (!profile.range || history.length === 0) {
    return (
        <main className="px-4 pb-6">
          <PageHeader title="보컬 히스토리" />
          <div className="mt-10 text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-surface/60 border border-border grid place-items-center">
              <Mic className="h-9 w-9 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-base font-bold">아직 기록이 없어요</h2>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
              음역대 테스트를 하면 기록이 차곡차곡 쌓여요.
            </p>
            <Button variant="brand" size="lg" className="mt-6 w-full" asChild>
              <Link href="/mypage/range-test">테스트 시작</Link>
            </Button>
          </div>
        </main>
    )
  }

  // chart data
  const points = history.map((h) => ({
    date: new Date(h.testedAt),
    lowMidi: noteToMidi(h.lowestNote),
    highMidi: noteToMidi(h.highestNote),
    record: h,
  })).reverse()

  const allMidi = points.flatMap((p) => [p.lowMidi, p.highMidi])
  const minM = Math.min(...allMidi) - 2
  const maxM = Math.max(...allMidi) + 2
  const W = 320
  const H = 140

  function x(i: number) {
    return points.length === 1 ? W / 2 : (i / (points.length - 1)) * W
  }
  function y(m: number) {
    return H - ((m - minM) / (maxM - minM)) * H
  }

  const highPath = points
      .map((p, i) => (i === 0 ? "M" : "L") + " " + x(i).toFixed(1) + " " + y(p.highMidi).toFixed(1))
      .join(" ")
  const lowPath = points
      .map((p, i) => (i === 0 ? "M" : "L") + " " + x(i).toFixed(1) + " " + y(p.lowMidi).toFixed(1))
      .join(" ")

  const latest = history[0]
  const previous = history[1]
  const diffHigh = previous
      ? noteToMidi(latest.highestNote) - noteToMidi(previous.highestNote)
      : 0

  return (
      <main className="px-4 pb-6">
        <PageHeader title="보컬 히스토리" subtitle={`기록 ${history.length}회`} />

        <section className="rounded-[14px] bg-card border border-border/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold">음역대 변화 추이</div>
            {previous && (
                <Badge variant={diffHigh > 0 ? "success" : diffHigh < 0 ? "warning" : "muted"}>
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {diffHigh > 0 ? `+${diffHigh}반음` : diffHigh < 0 ? `${diffHigh}반음` : "변화 없음"}
                </Badge>
            )}
          </div>
          <svg width="100%" viewBox={`-10 -10 ${W + 20} ${H + 30}`} className="overflow-visible">
            <defs>
              <linearGradient id="highg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9d8cff" />
                <stop offset="100%" stopColor="#7b8cff" />
              </linearGradient>
              <linearGradient id="lowg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3d4" />
                <stop offset="100%" stopColor="#5468a8" />
              </linearGradient>
            </defs>
            {/* y-grid */}
            {[0, 1, 2, 3, 4].map((i) => (
                <line
                    key={i}
                    x1="0"
                    x2={W}
                    y1={(H / 4) * i}
                    y2={(H / 4) * i}
                    stroke="#243262"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                />
            ))}
            <path d={highPath} stroke="url(#highg)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d={lowPath} stroke="url(#lowg)" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="4 3" />
            {points.map((p, i) => (
                <g key={i}>
                  <circle cx={x(i)} cy={y(p.highMidi)} r="4" fill="#9d8cff" />
                  <circle cx={x(i)} cy={y(p.lowMidi)} r="3" fill="#94a3d4" />
                  <text
                      x={x(i)}
                      y={H + 16}
                      fontSize="9"
                      textAnchor="middle"
                      fill="#94a3d4"
                  >
                    {(p.date.getMonth() + 1) + "/" + p.date.getDate()}
                  </text>
                </g>
            ))}
          </svg>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-3 rounded bg-brand inline-block" /> 최고음
          </span>
            <span className="flex items-center gap-1.5">
            <span className="h-1 w-3 rounded bg-muted-foreground inline-block" /> 최저음
          </span>
          </div>
        </section>

        <h2 className="mt-6 mb-2 px-1 text-sm font-bold">측정 기록</h2>
        <div className="space-y-2">
          {history.map((h) => (
              <div key={h.testedAt} className="rounded-[12px] bg-card border border-border/60 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.testedAt).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-muted-foreground">최저</div>
                    <div className="text-sm font-extrabold">{noteToKorean(h.lowestNote)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">편한 고음</div>
                    <div className="text-sm font-extrabold">{noteToKorean(h.comfortableHigh)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">최고</div>
                    <div className="text-sm font-extrabold text-brand">{noteToKorean(h.highestNote)}</div>
                  </div>
                </div>
              </div>
          ))}
        </div>

        <Button variant="outline" size="lg" className="w-full mt-6" asChild>
          <Link href="/mypage/range-test">새로 측정하기</Link>
        </Button>
      </main>
  )
}