"use client"

import * as React from "react"
import { PageHeader } from "@/components/page-header"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Trash2, Download } from "lucide-react"

export default function PrivacyPage() {
  const [voiceStorage, setVoiceStorage] = React.useState(true)
  const [shareAnonStats, setShareAnonStats] = React.useState(false)

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
        <div className="flex items-center gap-3 p-4 rounded-[12px] bg-card border border-border/60">
          <div className="flex-1">
            <Label className="text-sm font-semibold cursor-pointer">익명 통계 공유</Label>
            <div className="text-xs text-muted-foreground">개인 식별 없는 통계 데이터로 추천을 개선</div>
          </div>
          <Switch checked={shareAnonStats} onCheckedChange={setShareAnonStats} />
        </div>
      </div>

      <div className="mt-6 rounded-[12px] bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
        <button className="w-full flex items-center gap-3 p-4 hover:bg-surface/50 text-left">
          <Download className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 text-sm font-semibold">내 데이터 내보내기</div>
        </button>
        <button className="w-full flex items-center gap-3 p-4 hover:bg-surface/50 text-left">
          <Trash2 className="h-5 w-5 text-destructive" />
          <div className="flex-1 text-sm font-semibold text-destructive">계정 삭제</div>
        </button>
      </div>

      <div className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
        FitCh는 사용자의 음성 데이터를 안전하게 처리하며, 식별 정보와 분리해서 보관합니다. 동의를
        철회하면 보관된 음성 데이터는 즉시 삭제됩니다.
      </div>
    </main>
  )
}
