"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Mic, Music2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FitchLogo, WaveBars } from "@/components/fitch-logo"
import { cn } from "@/lib/utils"

const SLIDES = [
  {
    icon: <Mic className="h-7 w-7" />,
    title: "당신의 음역대를 찾아드려요",
    desc: "짧은 녹음 한 번으로 AI가 당신의 최고음·최저음을 분석해요.",
    art: (
      <div className="flex items-center justify-center w-full h-full">
        <WaveBars active />
      </div>
    ),
  },
  {
    icon: <Music2 className="h-7 w-7" />,
    title: "내가 부를 수 있는 노래만",
    desc: "고음 실패는 그만. 당신 키에 맞춘 곡을 추천해드려요.",
    art: (
      <div className="grid grid-cols-3 gap-2 p-6">
        {["#7b8cff", "#9d8cff", "#ff8fb1", "#6acff6", "#ffd166", "#a5e6c0"].map((c, i) => (
          <div
            key={i}
            className="aspect-square rounded-[10px]"
            style={{ background: `linear-gradient(135deg, ${c}, rgba(255,255,255,0.1))` }}
          />
        ))}
      </div>
    ),
  },
  {
    icon: <Sparkles className="h-7 w-7" />,
    title: "좋아하는 가수처럼 부르고 싶다면",
    desc: "비슷한 음색의 아티스트를 검색해 맞춤 추천을 받아보세요.",
    art: (
      <div className="flex items-center justify-center h-full">
        <div className="relative w-44 h-44">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-primary"
              style={{
                opacity: 0.4 - i * 0.1,
                transform: `scale(${1 + i * 0.18})`,
              }}
            />
          ))}
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-primary to-brand grid place-items-center text-3xl">
            🎤
          </div>
        </div>
      </div>
    ),
  },
]

export default function OnboardingPage() {
  const [step, setStep] = React.useState(0)
  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1

  return (
    <main className="min-h-dvh flex flex-col px-6 pt-12 pb-8">
      <div className="flex items-center justify-between">
        <FitchLogo />
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          건너뛰기
        </Link>
      </div>

      <div className="mt-12 flex-1 flex flex-col">
        <div className="rounded-[18px] bg-surface/60 border border-border/60 h-72 mb-8 overflow-hidden">
          {slide.art}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="grid place-items-center h-10 w-10 rounded-[10px] bg-primary/20 text-primary">
            {slide.icon}
          </div>
          <div className="flex-1" />
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        <h1 className="text-2xl font-extrabold leading-tight">{slide.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{slide.desc}</p>
      </div>

      <div className="mt-6 space-y-3">
        {isLast ? (
          <Button variant="brand" size="lg" className="w-full" asChild>
            <Link href="/login">
              시작하기 <ChevronRight className="h-5 w-5" />
            </Link>
          </Button>
        ) : (
          <Button variant="brand" size="lg" className="w-full" onClick={() => setStep((s) => s + 1)}>
            다음 <ChevronRight className="h-5 w-5" />
          </Button>
        )}
        <Button variant="ghost" size="lg" className="w-full" asChild>
          <Link href="/login">이미 계정이 있어요</Link>
        </Button>
      </div>
    </main>
  )
}
