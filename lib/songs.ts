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

export const SONGS: Song[] = [
  {
    id: "iu-good-day",
    title: "좋은 날",
    artist: "아이유 (IU)",
    highestNote: "Bb5",
    lowestNote: "F3",
    difficulty: 5,
    cover: "/covers/iu-good-day.svg",
    genre: "kpop",
    releaseYear: 2010,
    duration: "3:50",
    popularity: 98,
    tjNumber: "60384",
    kyNumber: "44366",
  },
  {
    id: "iu-night-letter",
    title: "밤편지",
    artist: "아이유 (IU)",
    highestNote: "E5",
    lowestNote: "F3",
    difficulty: 3,
    cover: "/covers/iu-night-letter.svg",
    genre: "ballad",
    releaseYear: 2017,
    duration: "4:14",
    popularity: 95,
    tjNumber: "28190",
    kyNumber: "50121",
  },
  {
    id: "park-hyo-shin-wildflower",
    title: "야생화",
    artist: "박효신",
    highestNote: "A5",
    lowestNote: "G3",
    difficulty: 5,
    cover: "/covers/park-hyo-shin-wildflower.svg",
    genre: "ballad",
    releaseYear: 2014,
    duration: "5:30",
    popularity: 92,
    tjNumber: "75712",
    kyNumber: "47861",
  },
  {
    id: "park-hyo-shin-snow-flower",
    title: "눈의 꽃",
    artist: "박효신",
    highestNote: "G#4",
    lowestNote: "D3",
    difficulty: 3,
    cover: "/covers/park-hyo-shin-snow-flower.svg",
    genre: "ballad",
    releaseYear: 2004,
    duration: "4:35",
    popularity: 90,
    tjNumber: "8174",
    kyNumber: "8553",
  },
  {
    id: "paul-kim-every-day",
    title: "모든 날, 모든 순간",
    artist: "폴킴",
    highestNote: "F#5",
    lowestNote: "F#3",
    difficulty: 4,
    cover: "/covers/paul-kim-every-day.svg",
    genre: "ballad",
    releaseYear: 2018,
    duration: "4:08",
    popularity: 94,
    tjNumber: "28890",
    kyNumber: "50893",
  },
  {
    id: "younha-event-horizon",
    title: "사건의 지평선",
    artist: "윤하",
    highestNote: "F#5",
    lowestNote: "G3",
    difficulty: 4,
    cover: "/covers/younha-event-horizon.svg",
    genre: "pop",
    releaseYear: 2022,
    duration: "4:21",
    popularity: 97,
    tjNumber: "68192",
    kyNumber: "27185",
  },
  {
    id: "kim-bum-soo-i-miss-you",
    title: "보고 싶다",
    artist: "김범수",
    highestNote: "A4",
    lowestNote: "C3",
    difficulty: 3,
    cover: "/covers/kim-bum-soo-i-miss-you.svg",
    genre: "ballad",
    releaseYear: 2002,
    duration: "4:32",
    popularity: 88,
    tjNumber: "10212",
    kyNumber: "8425",
  },
  {
    id: "lim-jae-bum-for-you",
    title: "너를 위해",
    artist: "임재범",
    highestNote: "A4",
    lowestNote: "C3",
    difficulty: 4,
    cover: "/covers/lim-jae-bum-for-you.svg",
    genre: "rock",
    releaseYear: 2000,
    duration: "5:01",
    popularity: 84,
    tjNumber: "5478",
    kyNumber: "8754",
  },
  {
    id: "sung-si-kyung-on-the-street",
    title: "거리에서",
    artist: "성시경",
    highestNote: "F#4",
    lowestNote: "C3",
    difficulty: 2,
    cover: "/covers/sung-si-kyung-on-the-street.svg",
    genre: "ballad",
    releaseYear: 2004,
    duration: "4:33",
    popularity: 80,
    tjNumber: "8290",
    kyNumber: "9237",
  },
  {
    id: "lee-sun-hee-fate",
    title: "인연",
    artist: "이선희",
    highestNote: "C5",
    lowestNote: "E3",
    difficulty: 4,
    cover: "/covers/lee-sun-hee-fate.svg",
    genre: "ballad",
    releaseYear: 2005,
    duration: "4:20",
    popularity: 78,
    tjNumber: "60036",
    kyNumber: "9015",
  },
  {
    id: "kim-yeon-woo-farewell-taxi",
    title: "이별택시",
    artist: "김연우",
    highestNote: "G#4",
    lowestNote: "C3",
    difficulty: 3,
    cover: "/covers/kim-yeon-woo-farewell-taxi.svg",
    genre: "ballad",
    releaseYear: 2008,
    duration: "4:13",
    popularity: 75,
    tjNumber: "16108",
    kyNumber: "77543",
  },
  {
    id: "kim-kwang-seok-around-thirty",
    title: "서른 즈음에",
    artist: "김광석",
    highestNote: "E4",
    lowestNote: "B2",
    difficulty: 2,
    cover: "/covers/kim-kwang-seok-around-thirty.svg",
    genre: "folk",
    releaseYear: 1994,
    duration: "4:18",
    popularity: 73,
    tjNumber: "1408",
    kyNumber: "7619",
  },
  {
    id: "bts-dynamite",
    title: "Dynamite",
    artist: "BTS",
    highestNote: "C#5",
    lowestNote: "G3",
    difficulty: 3,
    cover: "/covers/bts-dynamite.svg",
    genre: "kpop",
    releaseYear: 2020,
    duration: "3:19",
    popularity: 99,
    tjNumber: "68103",
    kyNumber: "23021",
  },
  {
    id: "newjeans-hype-boy",
    title: "Hype Boy",
    artist: "NewJeans",
    highestNote: "A4",
    lowestNote: "G3",
    difficulty: 2,
    cover: "/covers/newjeans-hype-boy.svg",
    genre: "kpop",
    releaseYear: 2022,
    duration: "2:59",
    popularity: 96,
    tjNumber: "68567",
    kyNumber: "29013",
  },
  {
    id: "ive-love-dive",
    title: "LOVE DIVE",
    artist: "IVE",
    highestNote: "E5",
    lowestNote: "F#3",
    difficulty: 3,
    cover: "/covers/ive-love-dive.svg",
    genre: "kpop",
    releaseYear: 2022,
    duration: "2:57",
    popularity: 93,
    tjNumber: "68421",
    kyNumber: "28919",
  },
  {
    id: "aespa-next-level",
    title: "Next Level",
    artist: "aespa",
    highestNote: "E5",
    lowestNote: "F#3",
    difficulty: 4,
    cover: "/covers/aespa-next-level.svg",
    genre: "kpop",
    releaseYear: 2021,
    duration: "3:39",
    popularity: 91,
    tjNumber: "68321",
    kyNumber: "27812",
  },
  {
    id: "10cm-tonight-stars-fall",
    title: "오늘 밤은 어둠이 무서워요",
    artist: "10CM",
    highestNote: "E4",
    lowestNote: "A2",
    difficulty: 2,
    cover: "/covers/10cm-tonight.svg",
    genre: "indie",
    releaseYear: 2019,
    duration: "3:38",
    popularity: 70,
    tjNumber: "30214",
    kyNumber: "61723",
  },
  {
    id: "akmu-how-can-i-love-the-heartbreak",
    title: "어떻게 이별까지 사랑하겠어",
    artist: "AKMU",
    highestNote: "F5",
    lowestNote: "E3",
    difficulty: 4,
    cover: "/covers/akmu-heartbreak.svg",
    genre: "ballad",
    releaseYear: 2019,
    duration: "4:18",
    popularity: 89,
    tjNumber: "30210",
    kyNumber: "61715",
  },
  {
    id: "bruno-mars-just-the-way",
    title: "Just The Way You Are",
    artist: "Bruno Mars",
    highestNote: "F#5",
    lowestNote: "F3",
    difficulty: 4,
    cover: "/covers/bruno-mars-just-the-way.svg",
    genre: "pop",
    releaseYear: 2010,
    duration: "3:40",
    popularity: 86,
    tjNumber: "61824",
    kyNumber: "44213",
  },
  {
    id: "adele-hello",
    title: "Hello",
    artist: "Adele",
    highestNote: "F5",
    lowestNote: "F3",
    difficulty: 4,
    cover: "/covers/adele-hello.svg",
    genre: "pop",
    releaseYear: 2015,
    duration: "4:55",
    popularity: 85,
    tjNumber: "63102",
    kyNumber: "48910",
  },
]

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
