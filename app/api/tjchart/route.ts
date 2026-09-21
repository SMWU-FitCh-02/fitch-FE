import { NextRequest, NextResponse } from "next/server"

// TJ미디어 TOP100 차트. tjmedia.com/chart/top100 페이지 자체는 데이터를
// 자바스크립트로 그려서(정적 HTML엔 목록이 없음) 직접 스크래핑이 안 되고,
// 페이지가 내부적으로 호출하는 API를 그대로 흉내 낸다:
//   1) 차트 페이지를 GET해서 세션 쿠키(JSESSIONID, CSRF_TOKEN)를 발급받고
//   2) 그 쿠키 + CSRF 토큰을 헤더에 실어 /legacy/api/topAndHot100 을 POST
// 참고: https://github.com/betty2859/karaoke_singer (TJ/금영 차트 연동 오픈소스)
const TJ_CHART_BASE = "https://www.tjmedia.com"
const TJ_CHART_PAGE = `${TJ_CHART_BASE}/chart/top100`
const TJ_CHART_API = `${TJ_CHART_BASE}/legacy/api/topAndHot100`
const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

function parseCookie(setCookieHeaders: string[], name: string): string | null {
    for (const header of setCookieHeaders) {
        const match = header.match(new RegExp(`${name}=([^;]+)`))
        if (match) return match[1]
    }
    return null
}

function getSetCookieHeaders(res: Response): string[] {
    // Node 18+/undici expose getSetCookie(); fall back to the combined header
    // (older runtimes) split on comma-before-next-cookie-name.
    const headersAny = res.headers as any
    if (typeof headersAny.getSetCookie === "function") {
        return headersAny.getSetCookie()
    }
    const combined = res.headers.get("set-cookie")
    return combined ? combined.split(/,(?=[^;]+?=)/) : []
}

async function tjFetchSession(): Promise<{ cookieHeader: string; csrfToken: string }> {
    const res = await fetch(TJ_CHART_PAGE, {
        headers: { "User-Agent": UA },
        cache: "no-store",
    })
    await res.text() // drain the body so the connection can be reused/closed

    const setCookies = getSetCookieHeaders(res)
    const jsessionId = parseCookie(setCookies, "JSESSIONID")
    const csrfToken = parseCookie(setCookies, "CSRF_TOKEN")
    if (!jsessionId || !csrfToken) {
        throw new Error("TJ 세션 쿠키를 가져오지 못함")
    }
    return {
        cookieHeader: `JSESSIONID=${jsessionId}; CSRF_TOKEN=${csrfToken}`,
        csrfToken,
    }
}

function ymd(date: Date): string {
    return date.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100", 10)

    try {
        const { cookieHeader, csrfToken } = await tjFetchSession()

        const end = new Date()
        const start = new Date(end.getTime() - 29 * 86400 * 1000) // TJ 기본 조회기간(최근 30일)과 동일하게

        const body = new URLSearchParams({
            chartType: "TOP",
            searchStartDate: ymd(start),
            searchEndDate: ymd(end),
            strType: "",
        })

        const apiRes = await fetch(TJ_CHART_API, {
            method: "POST",
            headers: {
                "User-Agent": UA,
                Accept: "*/*",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                Origin: TJ_CHART_BASE,
                Referer: TJ_CHART_PAGE,
                "X-Requested-With": "XMLHttpRequest",
                "X-CSRF-TOKEN": csrfToken,
                Cookie: cookieHeader,
            },
            body: body.toString(),
            cache: "no-store",
        })

        if (!apiRes.ok) {
            return NextResponse.json({ error: "TJ 차트를 불러오지 못했어요." }, { status: 502 })
        }

        const payload = await apiRes.json()
        const rawItems: any[] = payload?.resultData?.items ?? []

        const items = rawItems
            .map((row) => {
                const no = String(row.pro ?? "").trim() // TJ 노래방 번호
                const title = String(row.indexTitle ?? "").trim()
                if (!no || !title) return null
                return {
                    rank: Number(row.rank) || 0,
                    no,
                    title,
                    singer: String(row.indexSong ?? "").trim(),
                    thumb: row.imgthumb_path
                        ? String(row.imgthumb_path).startsWith("http")
                            ? row.imgthumb_path
                            : `${TJ_CHART_BASE}${row.imgthumb_path}`
                        : "",
                }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
            .sort((a, b) => (a.rank || 999999) - (b.rank || 999999))
            .slice(0, limit)

        if (items.length === 0) {
            return NextResponse.json({ error: "TJ 차트 파싱 결과가 비어있어요." }, { status: 502 })
        }

        return NextResponse.json({ source: "tjmedia", items })
    } catch {
        return NextResponse.json({ error: "TJ 차트를 불러오지 못했어요." }, { status: 502 })
    }
}