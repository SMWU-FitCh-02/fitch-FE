export type ArtworkResult = { artworkUrl: string | null; previewUrl: string | null }

// Many song cards can mount at once (recommendation lists, "similar range"
// sections), and each used to fire its own iTunes lookup immediately —
// bursts of 20-30 simultaneous requests were getting rate-limited, so some
// cards silently fell back to the placeholder even for well-known songs.
// This module caches results per title+artist and limits how many lookups
// run at the same time, shared across every card on the page.

const cache = new Map<string, Promise<ArtworkResult>>()
const queue: (() => void)[] = []
let active = 0
const MAX_CONCURRENT = 3

function runNext() {
  if (active >= MAX_CONCURRENT || queue.length === 0) return
  active++
  const next = queue.shift()!
  next()
}

export function fetchArtwork(title: string, artist: string): Promise<ArtworkResult> {
  const key = `${artist}::${title}`
  const cached = cache.get(key)
  if (cached) return cached

  const promise = new Promise<ArtworkResult>((resolve) => {
    queue.push(async () => {
      try {
        const res = await fetch(
          `/api/artwork?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
        )
        const data = await res.json()
        resolve({ artworkUrl: data?.artworkUrl ?? null, previewUrl: data?.previewUrl ?? null })
      } catch {
        resolve({ artworkUrl: null, previewUrl: null })
      } finally {
        active--
        runNext()
      }
    })
    runNext()
  })

  cache.set(key, promise)
  return promise
}
