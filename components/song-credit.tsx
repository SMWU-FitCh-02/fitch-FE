import * as React from "react"
import { findCredit, type SongCreditInfo } from "@/lib/credits"

// CC BY 표시: "제목" by 작가 · Free Music Archive · CC BY 4.0
export function CreditLine({ credit, className }: { credit: SongCreditInfo; className?: string }) {
  return (
    <p className={className ?? "text-[11px] leading-relaxed text-muted-foreground"}>
      <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        &ldquo;{credit.title}&rdquo;
      </a>{" "}
      by {credit.artist} · Free Music Archive ·{" "}
      <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        {credit.license}
      </a>
    </p>
  )
}

// 곡 title/artist로 출처를 찾아 보여준다. 출처 정보가 없는 곡이면 아무것도 그리지 않는다.
export function SongCredit({ title, artist, className }: { title: string; artist: string; className?: string }) {
  const credit = findCredit(title, artist)
  if (!credit) return null
  return <CreditLine credit={credit} className={className} />
}
