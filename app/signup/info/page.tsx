"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SignupHeader } from "@/components/signup-header"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { saveTokens } from "@/lib/api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

type CheckState = "idle" | "checking" | "available" | "taken" | "error"
type Gender = "MALE" | "FEMALE" | "OTHER"

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "남성" },
  { value: "FEMALE", label: "여성" },
  { value: "OTHER", label: "선택 안 함" },
]

export default function InfoPage() {
  const router = useRouter()
  const { profile, setProfile } = useStore()
  const [name, setName] = React.useState("")
  const [username, setUsername] = React.useState("")
  const [usernameCheck, setUsernameCheck] = React.useState<CheckState>("idle")
  const [password, setPassword] = React.useState("")
  const [passwordConfirm, setPasswordConfirm] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [birthDate, setBirthDate] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [gender, setGender] = React.useState<Gender | null>(null)
  const [submitError, setSubmitError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  async function checkUsername() {
    if (!username.trim()) return
    setUsernameCheck("checking")
    try {
      const res = await fetch(
          `${API_BASE}/auth/check-username?username=${encodeURIComponent(username.trim())}`
      )
      const data = await res.json()
      setUsernameCheck(data.available ? "available" : "taken")
    } catch {
      setUsernameCheck("error")
    }
  }

  const passwordsMatch = password.length > 0 && password === passwordConfirm
  const canNext =
      name.trim().length > 0 &&
      username.trim().length > 0 &&
      usernameCheck === "available" &&
      password.length >= 8 &&
      passwordsMatch &&
      email.includes("@") &&
      birthDate.length > 0 &&
      phoneNumber.trim().length > 0

  async function next() {
    if (!canNext) return
    setSubmitError("")
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          name: name.trim(),
          nickname: name.trim(),
          email: email.trim(),
          birthDate,
          phoneNumber: phoneNumber.trim(),
          gender,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || "회원가입에 실패했습니다.")
      }
      const registerBody = await res.json().catch(() => null)

      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      if (!loginRes.ok) {
        throw new Error("가입은 완료됐지만 자동 로그인에 실패했어요. 로그인 화면에서 다시 시도해주세요.")
      }
      const loginBody = await loginRes.json()
      saveTokens(loginBody.accessToken, loginBody.refreshToken)

      setProfile((p) => ({
        ...p,
        name: name.trim(),
        username: username.trim(),
        userId: registerBody?.userId ?? p.userId,
        loggedIn: true,
      }))
      router.push("/signup/artist-preferences")
    } catch (err: any) {
      setSubmitError(err.message || "회원가입에 실패했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
      <main className="min-h-dvh flex flex-col px-6 pb-8">
        <SignupHeader step={2} total={5} />
        <h1 className="text-2xl font-extrabold">정보를 입력해주세요</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">맞춤 추천을 위한 기본 정보예요.</p>

        <div className="mt-7 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">이름</Label>
            <Input
                id="name"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username">아이디</Label>
            <div className="flex gap-2">
              <Input
                  id="username"
                  placeholder="아이디를 입력하세요"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setUsernameCheck("idle")
                  }}
                  className="flex-1"
              />
              <Button
                  type="button"
                  variant="outline"
                  onClick={checkUsername}
                  disabled={!username.trim() || usernameCheck === "checking"}
              >
                {usernameCheck === "checking" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    "중복확인"
                )}
              </Button>
            </div>
            {usernameCheck === "available" && (
                <p className="flex items-center gap-1 text-xs text-primary">
                  <Check className="h-3.5 w-3.5" /> 사용 가능한 아이디예요.
                </p>
            )}
            {usernameCheck === "taken" && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <X className="h-3.5 w-3.5" /> 이미 사용 중인 아이디예요.
                </p>
            )}
            {usernameCheck === "error" && (
                <p className="text-xs text-destructive">중복확인 중 오류가 발생했어요.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">비밀번호</Label>
            <Input
                id="password"
                type="password"
                placeholder="8자 이상 입력해주세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
            <Input
                id="passwordConfirm"
                type="password"
                placeholder="비밀번호를 다시 입력해주세요"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
            />
            {passwordConfirm.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive">비밀번호가 일치하지 않아요.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="birthDate">생년월일</Label>
            <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="text-sm [&::-webkit-date-and-time-value]:text-sm [&::-webkit-datetime-edit]:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber">전화번호</Label>
            <Input
                id="phoneNumber"
                placeholder="010-0000-0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>성별</Label>
            <p className="text-xs text-muted-foreground">
              선택하시면 성별에 맞는 아티스트 곡을 우선 추천해드려요.
            </p>
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
        </div>

        {submitError && <p className="mt-4 text-sm text-destructive">{submitError}</p>}

        <div className="mt-auto pt-8">
          <Button
              variant="brand"
              size="lg"
              className="w-full"
              disabled={!canNext || submitting}
              onClick={next}
          >
            {submitting ? "처리 중..." : "다음"} <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </main>
  )
}