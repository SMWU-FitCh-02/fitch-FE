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
import { api } from "@/lib/api"

const AVATARS = ["🎤", "🎧", "🎵", "🎶", "🎸", "🎹", "🥁", "🎺", "💜", "✨", "🌙", "☀️"]

export default function ProfileEditPage() {
  const router = useRouter()
  const { profile, setProfile } = useStore()
  const [name, setName] = React.useState(profile.name)
  const [email, setEmail] = React.useState(profile.email)
  const [avatar, setAvatar] = React.useState(profile.avatar || "🎤")
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState("")

  async function save() {
    if (!profile.userId) {
      // no real backend user (e.g. still using a purely local/demo profile) —
      // fall back to the old local-only behavior
      setProfile((p) => ({ ...p, name, email, avatar }))
      setSaved(true)
      setTimeout(() => router.back(), 800)
      return
    }

    setSaving(true)
    setError("")
    try {
      const updated = await api.updateUser(profile.userId, {
        nickname: name.trim(),
        email: email.trim(),
      })
      setProfile((p) => ({ ...p, name: updated.nickname || updated.name, email: updated.email, avatar }))
      setSaved(true)
      setTimeout(() => router.back(), 800)
    } catch (e: any) {
      setError(e?.message || "저장하지 못했어요. 다시 시도해주세요.")
    } finally {
      setSaving(false)
    }
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

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <Button variant="brand" size="lg" className="w-full mt-8" onClick={save} disabled={saving}>
        {saved ? (
          <>
            <Check className="h-5 w-5" /> 저장됨
          </>
        ) : saving ? (
          "저장 중..."
        ) : (
          "변경사항 저장"
        )}
      </Button>
    </main>
  )
}
