"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FitchLogo } from "@/components/fitch-logo"

export default function OnboardingPage() {
    const router = useRouter()

    React.useEffect(() => {
        const timer = setTimeout(() => {
            router.replace("/login")
        }, 1200)
        return () => clearTimeout(timer)
    }, [router])

    return (
        <main className="min-h-dvh flex flex-col items-center justify-center px-6 pt-[calc(env(safe-area-inset-top)+3rem)]">
            <FitchLogo />
            <p className="mt-3 text-sm text-muted-foreground">내 음역대에 맞는 노래 추천</p>
        </main>
    )
}