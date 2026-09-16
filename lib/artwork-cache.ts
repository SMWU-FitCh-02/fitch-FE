export type ArtworkResult = { artworkUrl: string | null; previewUrl: string | null }

// Many song cards can mount at once (recommendation lists, "similar range"
// sections), and each used to fire its own iTunes lookup immediately —
// bursts of requests were getting rate-limited by Apple's undocumented
// per-minute limit, so some cards silently fell back to the placeholder
// even for well-known songs.
//
// This module:
//  - caches only SUCCESSFUL lookups (a rate-limited "null" is never cached,
//    so the next time the song appears on screen it gets another chance)
//  - spaces requests out with a small stagger instead of firing them all
//    at once, so we stay under the rate limit in the first place

const cache = new Map<string, ArtworkResult>()
const queue: (() => void)[] = []
let active = 0
const MAX_CONCURRENT = 2
const STAGGER_MS = 250

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function runNext() {
  if (active >= MAX_CONCURRENT || queue.length === 0) return
  active++
  const next = queue.shift()!
  next()
}

export function fetchArtwork(title: string, artist: string): Promise<ArtworkResult> {
  const key = `${artist}::${title}`
  const cached = cache.get(key)
  if (cached) return Promise.resolve(cached)

  return new Promise<ArtworkResult>((resolve) => {
    queue.push(async () => {
      try {
        await sleep(STAGGER_MS)
        const res = await fetch(
          `/api/artwork?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
        )
        const data = await res.json()
        const result: ArtworkResult = {
          artworkUrl: data?.artworkUrl ?? null,
          previewUrl: data?.previewUrl ?? null,
        }
        if (result.artworkUrl) cache.set(key, result) // only cache real hits
        resolve(result)
      } catch {
        resolve({ artworkUrl: null, previewUrl: null })
      } finally {
        active--
        runNext()
      }
    })
    runNext()
  })
}
