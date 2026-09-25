"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { SignupHeader } from "@/components/signup-header"
import { Separator } from "@/components/ui/separator"

const ALL_TERMS = [
    { key: "service", label: "FitCh 서비스 이용약관 동의", required: true, body: "FitCh이 제공하는 음역대 분석, 추천 기능 등에 관한 이용 조건과 절차에 동의합니다." },
    { key: "privacy", label: "개인정보 수집·이용 동의", required: true, body: "이름, 이메일, 음역대 데이터 등 서비스 제공을 위해 수집하는 개인정보 항목·이용 목적·보관 기간에 동의합니다." },
    { key: "voice", label: "음성 데이터 처리 동의", required: true, body: "분석을 위한 짧은 녹음 파일을 안전하게 처리하며, 식별 정보와 분리해 보관함에 동의합니다." },
    { key: "marketing", label: "마케팅 정보 수신 동의", required: false, body: "신규 기능, 이벤트, 추천 노래 알림을 이메일로 받을 수 있습니다. 언제든 끌 수 있어요." },
]

export default function TermsPage() {
    const router = useRouter()
    const [checks, setChecks] = React.useState<Record<string, boolean>>({})
    const allRequiredChecked = ALL_TERMS.filter((t) => t.required).every((t) => checks[t.key])
    const allChecked = ALL_TERMS.every((t) => checks[t.key])

    function toggle(key: string) {
        setChecks((c) => ({ ...c, [key]: !c[key] }))
    }
    function toggleAll() {
        const target = !allChecked
        const next: Record<string, boolean> = {}
        ALL_TERMS.forEach((t) => (next[t.key] = target))
        setChecks(next)
    }

    return (
        <main className="min-h-dvh flex flex-col px-6 pb-32">
            <SignupHeader step={1} total={4} />
            <div>
                <h1 className="text-2xl font-extrabold">시작 전에 잠깐!</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                    FitCh을 사용하려면 아래 약관에 동의해주세요.
                </p>
            </div>

            <div
                role="button"
                tabIndex={0}
                onClick={toggleAll}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        toggleAll()
                    }
                }}
                className="mt-6 flex items-center gap-3 p-4 rounded-[12px] bg-surface-elevated/60 border border-border text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <Checkbox checked={allChecked} aria-label="모두 동의" onCheckedChange={toggleAll} />
                <div className="font-semibold">전체 동의</div>
            </div>

            <Separator className="my-5" />

            <div className="space-y-3">
                {ALL_TERMS.map((t) => (
                    <div key={t.key} className="rounded-[12px] bg-card/50 border border-border/60 p-4">
                        <div className="flex items-start gap-3">
                            <Checkbox
                                checked={!!checks[t.key]}
                                aria-label={t.label}
                                onCheckedChange={() => toggle(t.key)}
                            />
                            <div className="flex-1 min-w-0">
                                <button
                                    type="button"
                                    onClick={() => toggle(t.key)}
                                    className="text-left text-sm font-semibold flex items-center gap-2"
                                >
                  <span className={t.required ? "text-foreground" : "text-foreground"}>
                    {t.label}
                  </span>
                                    <span
                                        className={
                                            t.required
                                                ? "text-[10px] text-primary font-bold"
                                                : "text-[10px] text-muted-foreground font-medium"
                                        }
                                    >
                    {t.required ? "필수" : "선택"}
                  </span>
                                </button>
                                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t.body}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                <Button
                    variant="brand"
                    size="lg"
                    className="w-full"
                    disabled={!allRequiredChecked}
                    onClick={() => router.push("/signup/info")}
                >
                    다음 <ChevronRight className="h-5 w-5" />
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                    이미 계정이 있나요?{" "}
                    <Link href="/login" className="text-primary font-semibold">
                        로그인
                    </Link>
                </p>
            </div>
        </main>
    )
}