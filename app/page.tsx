"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"

export default function RootRedirect() {
  const router = useRouter()
  const { profile } = useStore()

  useEffect(() => {
    if (profile.loggedIn) {
      router.replace("/home")
    } else {
      router.replace("/onboarding")
    }
  }, [profile.loggedIn, router])

  return (
    <div className="min-h-dvh grid place-items-center">
      <div className="text-muted-foreground text-sm">FitCh 로딩 중...</div>
    </div>
  )
}
