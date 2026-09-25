"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ImagePlus } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { api, type Gender } from "@/lib/api"

const AVATARS = ["🎤", "🎧", "🎵", "🎶", "🎸", "🎹", "🥁", "🎺", "💜", "✨", "🌙", "☀️"]

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "남성" },
  { value: "FEMALE", label: "여성" },
  { value: "OTHER", label: "선택 안 함" },
]

const GENRES = ["발라드", "댄스", "POP", "랩/힙합", "R&B/어반", "OST"]

async function fileToResizedDataUrl(file: File, maxSize = 512, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image()
    el.onload = () => resolve(el)
    el.onerror = reject
    el.src = dataUrl
  })

  const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL("image/jpeg", quality)
}

export default function ProfileEditPage() {
  const router = useRouter()
  const { profile, setProfile } = useStore()
  const [name, setName] = React.useState(profile.name)
  const [avatar, setAvatar] = React.useState(profile.avatar || "🎤")
  const [gender, setGender] = React.useState<Gender | null>(null)
  const [photo, setPhoto] = React.useState<string | null>(profile.profileImage ?? null)
  const [selectedGenres, setSelectedGenres] = React.useState<string[]>(profile.preferredGenres || [])
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState("")

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!profile.userId) return
    let cancelled = false
    api
        .getUser(profile.userId)
        .then((u) => {
          if (cancelled) return
          setName(u.nickname || u.name || "")
          setGender((u.gender as Gender) ?? null)
          setPhoto(u.profileImage ?? null)
          if (u.preferredGenres) {
            setSelectedGenres(u.preferredGenres.split(",").filter(Boolean))
          }
          setProfile((p) => ({ ...p, profileImage: u.profileImage ?? null }))
        })
        .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.userId])

  function toggleGenre(genre: string) {
    setSelectedGenres((cur) =>
        cur.includes(genre) ? cur.filter((g) => g !== genre) : [...cur, genre]
    )
  }

  // 선택한 것부터 클릭한 순서대로, 나머지는 뒤에
  const displayGenres = React.useMemo(
      () => [...selectedGenres, ...GENRES.filter((g) => !selectedGenres.includes(g))],
      [selectedGenres]
  )

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    try {
      const resized = await fileToResizedDataUrl(file)
      setPhoto(resized)
    } catch {
      setError("이미지를 불러오지 못했어요. 다른 사진을 시도해주세요.")
    }
  }

  async function save() {
    if (!profile.userId) {
      setProfile((p) => ({
        ...p,
        name,
        avatar,
        profileImage: photo,
        preferredGenres: selectedGenres,
      }))
      setSaved(true)
      setTimeout(() => router.back(), 800)
      return
    }

    setSaving(true)
    setError("")
    try {
      const updated = await api.updateUser(profile.userId, {
        nickname: name.trim(),
        gender,
        profileImage: photo,
        preferredGenres: selectedGenres.join(","),
      })
      setProfile((p) => ({
        ...p,
        name: updated.nickname || updated.name,
        nickname: updated.nickname || updated.name,
        avatar,
        profileImage: updated.profileImage ?? null,
        preferredGenres: selectedGenres,
      }))
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
          <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary/60 to-brand/60 grid place-items-center text-5xl border-2 border-border overflow-hidden">
            {photo ? (
                <img src={photo} alt="프로필 사진" className="h-full w-full object-cover" />
            ) : (
                avatar
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" /> 사진 선택
            </Button>
            {photo && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto(null)}>
                  제거
                </Button>
            )}
          </div>

          <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFilePicked}
          />
        </div>

        {!photo && (
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
        )}

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">닉네임</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>성별</Label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map((opt) => {
                const on = gender === opt.value
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGender(opt.value)}
                        className={cn(
                            "h-11 rounded-[10px] border-2 text-sm font-semibold transition-colors",
                            on
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-surface/40 text-muted-foreground"
                        )}
                    >
                      {opt.label}
                    </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>좋아하는 장르</Label>
            <div className="grid grid-cols-3 gap-2">
              {displayGenres.map((genre) => {
                const on = selectedGenres.includes(genre)
                return (
                    <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={cn(
                            "h-11 rounded-[10px] border-2 text-sm font-semibold transition-colors",
                            on
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-surface/40 text-muted-foreground"
                        )}
                    >
                      {genre}
                    </button>
                )
              })}
            </div>
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