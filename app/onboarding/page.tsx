"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { getAccessToken } from "@/lib/api"

export default function OnboardingPage() {
    const router = useRouter()

    React.useEffect(() => {
        const timer = setTimeout(() => {
            const token = getAccessToken()
            router.replace(token ? "/home" : "/login")
        }, 1500)
        return () => clearTimeout(timer)
    }, [router])

    return (
        <main className="min-h-dvh flex flex-col items-center justify-center px-6">
            <img
                src="/logo-icon.png"
                alt="FitCh"
                width={96}
                height={96}
                className="w-24 h-24 object-contain"
            />
            <p className="mt-4 text-base text-muted-foreground">내 음역대에 맞는 노래 추천</p>        </main>
    )
}