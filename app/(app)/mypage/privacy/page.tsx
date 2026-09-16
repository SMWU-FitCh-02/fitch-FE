"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import { useStore } from "@/lib/store"
import { api, clearTokens } from "@/lib/api"

export default function PrivacyPage() {
  const router = useRouter()
  const { profile, setProfile } = useStore()
  const [voiceStorage, setVoiceStorage] = React.useState(true)
  const [deleting, setDeleting] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const [error, setError] = React.useState("")

  async function handleDelete() {
    if (!profile.userId) return
    setDeleting(true)
    setError("")
    try {
      await api.deleteUser(profile.userId)
      clearTokens()
      setProfile((p) => ({ ...p, loggedIn: false, userId: undefined }))
      router.replace("/login")
    } catch (e: any) {
      setError(e?.message || "계정 삭제에 실패했어요. 다시 시도해주세요.")
      setDeleting(false)
    }
  }

  return (
    <main className="px-4 pb-6">
      <PageHeader title="개인정보 / 보안" subtitle="내 데이터를 안전하게 관리해요" />

      <div className="space-y-2 mt-4">
        <div className="flex items-center gap-3 p-4 rounded-[12px] bg-card border border-border/60">
          <div className="flex-1">
            <Label className="text-sm font-semibold cursor-pointer">음성 데이터 보관</Label>
            <div className="text-xs text-muted-foreground">측정한 음성을 분석용으로 보관해요</div>
          </div>
          <Switch checked={voiceStorage} onCheckedChange={setVoiceStorage} />
        </div>
      </div>

      <div className="mt-6 rounded-[12px] bg-card border border-border/60 overflow-hidden">
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="w-full flex items-center gap-3 p-4 hover:bg-surface/50 text-left"
          >
            <Trash2 className="h-5 w-5 text-destructive" />
            <div className="flex-1 text-sm font-semibold text-destructive">계정 삭제</div>
          </button>
        ) : (
          <div className="p-4 space-y-3">
            <p className="text-sm">
              정말 계정을 삭제하시겠어요? 저장한 곡, 측정 기록 등 모든 데이터가 사라지고 되돌릴 수 없어요.
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 h-10 rounded-[10px] border border-border text-sm font-semibold"
                disabled={deleting}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-10 rounded-[10px] bg-destructive text-white text-sm font-semibold disabled:opacity-60"
                disabled={deleting}
              >
                {deleting ? "삭제 중..." : "삭제할게요"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
        FitCh는 사용자의 음성 데이터를 안전하게 처리하며, 식별 정보와 분리해서 보관합니다. 동의를
        철회하면 보관된 음성 데이터는 즉시 삭제됩니다.
      </div>
    </main>
  )
}
