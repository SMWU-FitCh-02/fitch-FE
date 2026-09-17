"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Mic } from "lucide-react"
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
]

export default function OnboardingPage() {
  const [step, setStep] = React.useState(0)
  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1

  return (
      <main className="min-h-dvh flex flex-col px-6 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <FitchLogo />
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