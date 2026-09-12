import { NextRequest, NextResponse } from "next/server"

// Runs on the Next.js server, not in the browser — so Apple's CORS
// restrictions don't apply here. The client calls this same-origin route
// instead of hitting Apple directly.
export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") || "25"

  try {
    const res = await fetch(
      `https://rss.marketingtools.apple.com/api/v2/kr/music/most-played/${limit}/songs.json`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) {
      return NextResponse.json({ error: "차트를 불러오지 못했어요." }, { status: 502 })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "차트를 불러오지 못했어요." }, { status: 502 })
  }
}
