export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("accessToken")
}

export function saveTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") return
  localStorage.setItem("accessToken", accessToken)
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken)
}

export function clearTokens() {
  if (typeof window === "undefined") return
  localStorage.removeItem("accessToken")
  localStorage.removeItem("refreshToken")
}

async function request(path: string, options: RequestInit = {}) {
  const token = getAccessToken()
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  let body: any = null
  try {
    body = await res.json()
  } catch {
    // no JSON body
  }
  if (!res.ok) {
    const message = (body && (body.error || body.message)) || `요청에 실패했어요. (${res.status})`
    throw new Error(message)
  }
  return body
}

export type Gender = "MALE" | "FEMALE" | "OTHER"
export type ArtistGender = "MALE" | "FEMALE" | "MIXED"

export const api = {
  register(payload: {
    username: string
    password: string
    name: string
    nickname: string
    email: string
    birthDate?: string
    phoneNumber?: string
    gender?: Gender | null
  }) {
    return request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  },
  login(username: string, password: string) {
    return request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
  },
  checkUsername(username: string) {
    return request(`/auth/check-username?username=${encodeURIComponent(username)}`)
  },
  getUser(id: number): Promise<UserResponse> {
    return request(`/user/${id}`)
  },
  updateUser(
      id: number,
      payload: {
        name?: string
        nickname?: string
        email?: string
        birthDate?: string
        phoneNumber?: string
        gender?: Gender | null
        profileImage?: string | null
        preferredGenres?: string
      }
  ): Promise<UserResponse> {
    return request(`/user/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  },
  deleteUser(id: number) {
    return request(`/user/${id}`, { method: "DELETE" })
  },
  getVocalRange(userId: number) {
    return request(`/user/${userId}/vocal-range`)
  },
  getVocalHistory(userId: number) {
    return request(`/user/${userId}/vocal-history`)
  },
  uploadVoice(userId: number, blob: Blob, filename = "recording.webm") {
    const fd = new FormData()
    fd.append("file", blob, filename)
    return request(`/voice/upload?userId=${userId}`, { method: "POST", body: fd })
  },
  getSongs() {
    return request("/songs")
  },

  getSong(songId: number) {
    return request(`/songs/${songId}`)
  },
  recommend(userId: number) {
    return request(`/recommend/${userId}`)
  },
  keyAdjust(songId: number, userId: number) {
    return request(`/songs/${songId}/key-adjust?user_id=${userId}`)
  },
  toggleSongBookmark(songId: number) {
    return request(`/bookmarks/songs/${songId}`, { method: "POST" })
  },
  getSongBookmarks() {
    return request("/bookmarks/songs")
  },
  toggleChartLike(payload: { externalId: string; title: string; artist: string; artworkUrl?: string | null }) {
    return request("/bookmarks/charts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  },
  getChartLikes() {
    return request("/bookmarks/charts")
  },
  getArtistGenders(artists: string[]): Promise<Record<string, ArtistGender>> {
    if (artists.length === 0) return Promise.resolve({})
    const params = new URLSearchParams()
    artists.forEach((a) => params.append("artists", a))
    return request(`/chart/artist-genders?${params.toString()}`)
  },

  getVocalRanges(songs: { title: string; artist: string }[]): Promise<Record<string, CrawledVocalRange>> {
    if (songs.length === 0) return Promise.resolve({})
    return request(`/chart/vocal-ranges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(songs),
    })
  },
  saveVocalRange(userId: number, minNote: number, maxNote: number) {
    return request(`/user/${userId}/vocal-range`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minNote, maxNote }),
    })
  },
  // AI 자연어 검색: candidates 중에서 query에 어울리는 곡들의 인덱스를 돌려받음
  searchRecommend(
      query: string,
      candidates: { title: string; artist: string }[]
  ): Promise<{ matchedIndices: number[] }> {
    return request(`/recommend/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, candidates }),
    })
  },
  updatePreferredGenres(userId: number, genres: string[]) {
    return request(`/user/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredGenres: genres.join(",") }),
    })
  },


}



export type SongResponse = {
  songId: number
  title: string
  artist: string
  genre: string
  key: string
  minNote: number
  maxNote: number
  minNoteLabel: string
  maxNoteLabel: string
}

export type UserResponse = {
  userId: number
  username: string
  email: string
  name: string
  nickname: string
  birthDate?: string
  phoneNumber?: string
  gender?: Gender | null
  profileImage?: string | null
  createdAt?: string
  preferredGenres?: string
}

export type RecommendResponse = {
  userId: number
  userMaxNote: number
  userMaxNoteLabel: string
  recommendedSongs: SongResponse[]
}

export type ChartLikeEntry = {
  externalId: string
  title: string
  artist: string
  artworkUrl: string | null
}

export function decodeJwtSubject(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.sub ?? null
  } catch {
    return null
  }
}

// 백엔드 CrawledSongVocalRange.buildKey()와 동일한 로직
export function buildSongKey(title: string, artist: string): string {
  const normalize = (s: string) => s.trim().replace(/\s+/g, " ")
  return `${normalize(title)}::${normalize(artist)}`
}

export type CrawledVocalRange = {
  minNote: number
  maxNote: number
  minNoteLabel: string
  maxNoteLabel: string
}

// The backend's login response doesn't include userId, so we resolve it
// by matching the JWT subject (username) against /user/{id}. Scoped to a
// small range since this is a class project with a handful of test users.
export async function findUserIdByUsername(username: string, maxId = 50): Promise<number | null> {
  for (let id = 1; id <= maxId; id++) {
    try {
      const u = await api.getUser(id)
      if (u.username === username) return id
    } catch {
      // keep scanning
    }
  }
  return null
}

