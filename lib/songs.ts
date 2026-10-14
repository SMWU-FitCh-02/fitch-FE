// FitCh song database
// Vocal range: noteToMidi where C4=60.
// Korean pitch label: C2(do)~B6 with octave numbers used by FitCh
// The "key" indicates the song's top note (highest expected sing pitch).
// difficulty: 1 (easy) ~ 5 (extreme high)

export type Song = {
  id: string
  title: string
  artist: string
  highestNote: string // e.g. "G#4"
  lowestNote: string
  difficulty: 1 | 2 | 3 | 4 | 5
  cover: string // /covers/xx.svg
  genre: "ballad" | "kpop" | "rnb" | "rock" | "indie" | "pop" | "folk"
  releaseYear: number
  duration: string // "3:45"
  popularity: number // 0..100
  tjNumber?: string
  kyNumber?: string
}

// 전시회 버전: 실제 곡 샘플 데이터는 제거했다. (원복 시 git으로 되돌릴 것)
export const SONGS: Song[] = []

// Map midi numbers for note comparison
export const NOTE_TO_MIDI: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6,
  Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
}

export function noteToMidi(note: string): number {
  const match = note.match(/^([A-G][#b]?)(-?\d+)$/)
  if (!match) return 60
  const [, pitch, octave] = match
  return (parseInt(octave, 10) + 1) * 12 + (NOTE_TO_MIDI[pitch] ?? 0)
}

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
export function midiToNote(midi: number): string {
  const note = NOTES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${note}${octave}`
}

export function midiDistance(a: string, b: string): number {
  return Math.abs(noteToMidi(a) - noteToMidi(b))
}

// Suggested key transposition (semitones) so the user can sing the song
export function suggestKeyOffset(userMax: string, songMax: string): number {
  return noteToMidi(userMax) - noteToMidi(songMax)
}

// Recommend songs whose top notes are within `range` semitones of user max
export function recommendSongs(
  userMaxNote: string,
  options: { limit?: number; tolerance?: number; exclude?: string[] } = {}
): Song[] {
  const { limit = 10, tolerance = 2, exclude = [] } = options
  const userMidi = noteToMidi(userMaxNote)
  return SONGS
    .filter((s) => !exclude.includes(s.id))
    .map((s) => ({
      song: s,
      diff: Math.abs(noteToMidi(s.highestNote) - userMidi),
    }))
    .filter((s) => s.diff <= tolerance)
    .sort((a, b) => a.diff - b.diff || b.song.popularity - a.song.popularity)
    .slice(0, limit)
    .map((s) => s.song)
}

// Top 50 popular chart (sorted by popularity)
export function popularChart(): Song[] {
  return [...SONGS].sort((a, b) => b.popularity - a.popularity)
}

// Similar voice / artist (very rough — by genre + range proximity)
export function similarArtistSongs(artistName: string, limit = 10): Song[] {
  const sample = SONGS.find((s) => s.artist === artistName)
  if (!sample) return SONGS.slice(0, limit)
  const refMidi = noteToMidi(sample.highestNote)
  return SONGS
    .filter((s) => s.artist !== artistName)
    .filter((s) => s.genre === sample.genre)
    .map((s) => ({ song: s, diff: Math.abs(noteToMidi(s.highestNote) - refMidi) }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, limit)
    .map((s) => s.song)
}

export function uniqueArtists(): string[] {
  return Array.from(new Set(SONGS.map((s) => s.artist)))
}


const KOREAN_SOLFEGE: Record<string, string> = {
  C: "도", "C#": "도#", Db: "도#",
  D: "레", "D#": "레#", Eb: "레#",
  E: "미",
  F: "파", "F#": "파#", Gb: "파#",
  G: "솔", "G#": "솔#", Ab: "솔#",
  A: "라", "A#": "라#", Bb: "라#",
  B: "시",
}

// "C4" -> "4옥타브 도", "G#4" -> "4옥타브 솔#"
export function noteToKorean(note: string): string {
  const match = note.match(/^([A-G][#b]?)(-?\d+)$/)
  if (!match) return note
  const [, pitch, octave] = match
  const syllable = KOREAN_SOLFEGE[pitch] ?? pitch
  return `${octave}옥타브 ${syllable}`
}


// 내 음역대 vs 곡 음역대 비교해서 3단계 난이도 산출
// 1 = 쉬움 (내 음역대 안에 다 들어옴)
// 2 = 보통 (살짝 벗어남)
// 3 = 어려움 (많이 벗어남)
export function getDifficultyStars(
    songLowestNote: string,
    songHighestNote: string,
    userLowestNote: string,
    userHighestNote: string
): 1 | 2 | 3 {
  const songLow = noteToMidi(songLowestNote)
  const songHigh = noteToMidi(songHighestNote)
  const userLow = noteToMidi(userLowestNote)
  const userHigh = noteToMidi(userHighestNote)

  // 곡이 내 음역대 위/아래로 얼마나 벗어나는지(반음 수)
  const overHigh = Math.max(0, songHigh - userHigh)
  const overLow = Math.max(0, userLow - songLow)
  const totalOver = overHigh + overLow

  if (totalOver <= 0) return 1
  if (totalOver <= 3) return 2
  return 3
}

// 크롤링 곡용 — 이미 MIDI 숫자(minNote/maxNote)로 들어온 음역대를 직접 비교
export function getDifficultyStarsFromMidi(
    songMinNote: number,
    songMaxNote: number,
    userMinNote: number,
    userMaxNote: number
): 1 | 2 | 3 {
  const overHigh = Math.max(0, songMaxNote - userMaxNote)
  const overLow = Math.max(0, userMinNote - songMinNote)
  const totalOver = overHigh + overLow

  if (totalOver <= 0) return 1
  if (totalOver <= 3) return 2
  return 3
}