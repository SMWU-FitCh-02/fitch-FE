"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { saveTokens, decodeJwtSubject, findUserIdByUsername, api } from "@/lib/api"
import { useStore } from "@/lib/store"

function OAuthSuccessContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { setProfile } = useStore()
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        const accessToken = searchParams.get("accessToken")
        const refreshToken = searchParams.get("refreshToken")

        if (!accessToken) {
            setError("로그인 정보를 받지 못했어요.")
            return
        }

        saveTokens(accessToken, refreshToken || undefined)

        const username = decodeJwtSubject(accessToken)
        if (!username) {
            setError("토큰 정보를 확인할 수 없어요.")
            return
        }

        ;(async () => {
            try {
                const userId = await findUserIdByUsername(username)
                if (!userId) {
                    setError("사용자 정보를 찾을 수 없어요.")
                    return
                }
                const user = await api.getUser(userId)
                setProfile((prev) => ({
                    ...prev,
                    userId: user.userId,
                    username: user.username,
                    nickname: user.nickname,
                    name: user.name,
                    email: user.email,
                    profileImage: user.profileImage ?? null,
                    preferredGenres: user.preferredGenres ? user.preferredGenres.split(",") : [],
                    loggedIn: true,
                }))
                router.replace("/home")
            } catch (e) {
                setError("로그인 처리 중 오류가 발생했어요.")
            }
        })()
    }, [searchParams, router, setProfile])

    if (error) {
        return (
            <div className="min-h-dvh flex flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                <button
                    className="text-sm text-primary underline"
                    onClick={() => router.replace("/login")}
                >
                    로그인 화면으로 돌아가기
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-dvh flex items-center justify-center">
            <p className="text-sm text-muted-foreground">로그인 처리 중...</p>
        </div>
    )
}

export default function OAuthSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-dvh flex items-center justify-center" />}>
            <OAuthSuccessContent />
        </Suspense>
    )
}