export type DifficultyTier = {
  label: string
  className: string
}

// The backend doesn't store a difficulty rating, only minNote/maxNote (MIDI).
// We approximate a difficulty badge from how high the song's max note sits.
export function difficultyTier(maxNote: number): DifficultyTier {
  if (maxNote <= 57) return { label: "쉬움", className: "bg-emerald-500/15 text-emerald-400" }
  if (maxNote <= 62) return { label: "보통", className: "bg-primary/15 text-primary" }
  if (maxNote <= 66) return { label: "보통+", className: "bg-primary/20 text-primary" }
  if (maxNote <= 71) return { label: "어려움", className: "bg-amber-500/15 text-amber-400" }
  return { label: "극상", className: "bg-rose-500/15 text-rose-400" }
}

// The backend doesn't store cover art, so we generate a stable color from
// the song's title+artist instead of a broken image request.
export function colorFromString(s: string): string {
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 60%, 45%)`
}
