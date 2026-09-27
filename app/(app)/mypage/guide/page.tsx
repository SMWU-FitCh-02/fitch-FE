"use client"

import { Mic, LineChart, Music2, KeyRound, TrendingUp, Sparkles, Users, Wand2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"

const SECTIONS = [
    {
        icon: Mic,
        title: "1. 음역대 검사",
        where: "마이 → 검사하기",
        body: [
            "낮은 음부터 높은 음까지 순서대로 따라 부르면서 내 음역대를 측정해요.",
            "성별을 선택했다면 시작 음이 다르게 맞춰져요 (남성 C3 / 여성·미선택 C4).",
            "검사 결과는 자동으로 저장되고, 다른 기기에서 로그인해도 다시 검사할 필요 없이 불러와져요.",
        ],
    },
    {
        icon: LineChart,
        title: "2. 보컬 히스토리",
        where: "마이 → 보컬 히스토리",
        body: [
            "지금까지 측정한 음역대 변화를 그래프로 볼 수 있어요.",
            "검사할 때마다 기록이 쌓여서, 시간이 지나며 음역대가 어떻게 바뀌었는지 확인할 수 있어요.",
        ],
    },
    {
        icon: Music2,
        title: "3. 음역대 기반 노래 추천",
        where: "마이 → 음역대 기반 노래 추천",
        body: [
            "내가 측정한 음역대 안에서 부르기 편한 곡들을 자동으로 추천해줘요.",
            "곡 카드에 뜨는 별(★)은 난이도예요 — ★ 쉬움, ★★ 보통, ★★★ 고난이도.",
        ],
    },
    {
        icon: KeyRound,
        title: "4. 키 조정",
        where: "마이 → 키 조정",
        body: [
            "부르고 싶은 곡을 검색하면, 내 음역대에 맞춰 몇 반음을 올리거나 내리면 좋을지 추천해줘요.",
            "한글/영문 아티스트명 둘 다 검색돼요 (예: 트와이스 = TWICE).",
            "+/− 버튼으로 직접 조정하면서 원곡 대비 얼마나 잘 맞는지 실시간으로 볼 수 있어요.",
        ],
    },
    {
        icon: TrendingUp,
        title: "5. 인기차트",
        where: "하단 탭 → 인기차트",
        body: [
            "TJ미디어 노래방 인기차트와 멜론 차트를 볼 수 있어요.",
            "장르별로 필터링하고, 성별(남성곡/여성곡) 필터도 적용할 수 있어요.",
            "내 음역대 기준 난이도 별점이 곡마다 표시돼요.",
        ],
    },
    {
        icon: Users,
        title: "6. 유사 음색 아티스트 추천",
        where: "마이 → 유사 음색 아티스트 추천",
        body: [
            "좋아하는 아티스트를 고르면, 같은 장르에서 음역대가 비슷한 다른 아티스트의 곡을 추천해줘요.",
        ],
    },
    {
        icon: Wand2,
        title: "7. AI 자연어 검색",
        where: "추천곡 탭 상단 검색창",
        body: [
            "\"아이유 좋은날과 비슷한 느낌의 곡\"처럼 자연스러운 문장으로 검색할 수 있어요.",
            "AI가 분위기/보컬 스타일을 분석해서 어울리는 곡을 골라줘요 — 결과는 실제와 다를 수 있어요.",
        ],
    },
]

export default function GuidePage() {
    return (
        <main className="px-4 pb-10">
            <PageHeader title="사용 설명서" subtitle="FitCh 기능 한눈에 보기" />

            <div className="mt-4 space-y-3">
                {SECTIONS.map((s) => {
                    const Icon = s.icon
                    return (
                        <div
                            key={s.title}
                            className="rounded-[14px] bg-card border border-border/60 p-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 shrink-0 rounded-[10px] bg-primary/15 text-primary grid place-items-center">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold">{s.title}</div>
                                    <div className="text-[11px] text-muted-foreground">{s.where}</div>
                                </div>
                            </div>
                            <ul className="mt-3 space-y-1.5 pl-1">
                                {s.body.map((line, i) => (
                                    <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-1.5">
                                        <span className="text-primary shrink-0">·</span>
                                        <span>{line}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                })}
            </div>

            <div className="mt-6 rounded-[14px] bg-gradient-to-br from-primary/15 to-brand/15 border border-primary/30 p-4">
                <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-bold">TIP</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    음역대 검사를 먼저 해야 추천/키조정 기능을 쓸 수 있어요. 검사는 3분이면 끝나고, 한번
                    측정하면 다른 기기에서 로그인해도 다시 검사할 필요 없어요.
                </p>
            </div>
        </main>
    )
}