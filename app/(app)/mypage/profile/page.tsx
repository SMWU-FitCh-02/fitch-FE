"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const AVATARS = ["🎤", "🎧", "🎵", "🎶", "🎸", "🎹", "🥁", "🎺", "💜", "✨", "🌙", "☀️"]

export default function ProfileEditPage() {
  const router = useRouter()
  const { profile, setProfile } = useStore()
  const [name, setName] = React.useState(profile.name)
  const [email, setEmail] = React.useState(profile.email)
  const [avatar, setAvatar] = React.useState(profile.avatar || "🎤")
  const [saved, setSaved] = React.useState(false)

  function save() {
    setProfile((p) => ({ ...p, name, email, avatar }))
    setSaved(true)
    setTimeout(() => router.back(), 800)
  }

  return (
    <main className="px-4 pb-6">
      <PageHeader title="프로필 편집" subtitle="이미지와 정보를 변경할 수 있어요" />

      <div className="flex flex-col items-center mt-6">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/60 to-brand/60 grid place-items-center text-5xl border-2 border-border">
          {avatar}
        </div>
      </div>

      <div className="mt-6">
        <Label className="text-xs text-muted-foreground">아바타 선택</Label>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={cn(
                "h-12 w-12 grid place-items-center rounded-[10px] text-2xl border-2",
                avatar === a ? "border-primary bg-primary/10" : "border-border bg-surface/40"
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">닉네임</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <Button variant="brand" size="lg" className="w-full mt-8" onClick={save}>
        {saved ? (
          <>
            <Check className="h-5 w-5" /> 저장됨
          </>
        ) : (
          "변경사항 저장"
        )}
      </Button>
    </main>
  )
}
