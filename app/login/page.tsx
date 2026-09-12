"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { FitchLogo } from "@/components/fitch-logo"
import { useStore } from "@/lib/store"
import { decodeJwtSubject, findUserIdByUsername } from "@/lib/api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export default function LoginPage() {
  const router = useRouter()
  const { profile, setProfile } = useStore()
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!username || !password) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.")
      }
      const data = await res.json()
      localStorage.setItem("accessToken", data.accessToken)
      localStorage.setItem("refreshToken", data.refreshToken)

      const subject = decodeJwtSubject(data.accessToken) || username
      const resolvedUserId = (await findUserIdByUsername(subject)) ?? undefined

      setProfile((p) => ({
        ...p,
        name: p.name || username,
        username,
        userId: resolvedUserId,
        loggedIn: true,
      }))
      router.replace("/home")
    } catch (err: any) {
      setError(err.message || "로그인에 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex flex-col px-6 pt-6 pb-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="self-start h-10 w-10 grid place-items-center rounded-[10px] hover:bg-muted text-muted-foreground"
        aria-label="뒤로"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="mt-6">
        <FitchLogo />
      </div>

      <div className="mt-10">
        <h1 className="text-2xl font-extrabold">반가워요 🎤</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          아이디로 로그인하고 내 음역대를 찾아보세요.
        </p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="username">아이디</Label>
          <Input
            id="username"
            placeholder="아이디를 입력하세요"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button variant="brand" size="lg" className="w-full" type="submit" disabled={loading}>
          {loading ? "로그인 중..." : "로그인"}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">또는</span>
        <Separator className="flex-1" />
      </div>

      <div className="mt-6 space-y-3">
        <Button variant="ghost" size="lg" className="w-full" asChild>
          <Link href="/signup/terms">회원가입</Link>
        </Button>
      </div>

      <div className="mt-auto pt-8 text-center text-xs text-muted-foreground">
        FitCh v0.2 · 노래방을 더 즐겁게
      </div>
    </main>
  )
}