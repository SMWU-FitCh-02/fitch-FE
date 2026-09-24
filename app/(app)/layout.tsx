"use client"

import { BottomNav } from "@/components/bottom-nav"
import { useStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useStore()
  const router = useRouter()

  useEffect(() => {
    if (!profile.loggedIn) router.replace("/login")
  }, [profile.loggedIn, router])

  if (!profile.loggedIn) {
    return null
  }

  return (
      <div className="flex flex-col min-h-dvh pt-[env(safe-area-inset-top)+0.5rem]">
        <div className="flex-1 pb-24">{children}</div>
        <BottomNav />
      </div>
  )
}