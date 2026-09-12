"use client"

import * as React from "react"
import { PageHeader } from "@/components/page-header"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const SETTINGS = [
  { key: "weekly", label: "주간 추천곡 알림", desc: "월요일마다 새 추천곡을 받아요" },
  { key: "new-features", label: "새로운 기능 알림", desc: "신규 기능 출시 소식" },
  { key: "voice-tips", label: "보컬 팁 알림", desc: "발성, 호흡 등 가이드" },
  { key: "marketing", label: "마케팅 / 이벤트", desc: "신규 이벤트, 쿠폰 등" },
]

export default function NotificationsPage() {
  const [vals, setVals] = React.useState<Record<string, boolean>>({
    weekly: true,
    "new-features": true,
    "voice-tips": false,
    marketing: false,
  })
  return (
    <main className="px-4 pb-6">
      <PageHeader title="알림 설정" subtitle="원하는 알림만 받아보세요" />
      <div className="space-y-2 mt-4">
        {SETTINGS.map((s) => (
          <div
            key={s.key}
            className="flex items-center gap-3 p-4 rounded-[12px] bg-card border border-border/60"
          >
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-semibold cursor-pointer">{s.label}</Label>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </div>
            <Switch
              checked={!!vals[s.key]}
              onCheckedChange={(v) => setVals((cur) => ({ ...cur, [s.key]: !!v }))}
            />
          </div>
        ))}
      </div>
    </main>
  )
}
