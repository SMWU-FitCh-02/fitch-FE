"use client"

import * as React from "react"
import { api, type ChartLikeEntry } from "@/lib/api"

export type RangeRecord = {
  testedAt: string
  lowestNote: string
  highestNote: string
  comfortableHigh: string
  voiceTone: "bright" | "warm" | "husky" | "soft"
}

export type LikedChartSong = {
  id: string
  title: string
  artist: string
  artworkUrl: string | null
}

export type UserProfile = {
  name: string
  username?: string
  userId?: number
  email: string
  age?: string
  gender?: "male" | "female" | "other"
  avatar?: string // emoji or initial
  preferredSongIds: string[]
  preferredArtists: string[]
  preferredGenres: string[]
  range?: RangeRecord
  history: RangeRecord[]
  library: string[] // legacy local-only saved song ids (kept for backward compat, no longer written to)
  likedCharts: LikedChartSong[] // legacy local-only liked chart entries (kept for backward compat, no longer written to)
  loggedIn: boolean
}

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  username: "",
  email: "",
  preferredSongIds: [],
  preferredArtists: [],
  preferredGenres: [],
  history: [],
  library: [],
  likedCharts: [],
  loggedIn: false,
}

type Ctx = {
  profile: UserProfile
  setProfile: (p: UserProfile | ((prev: UserProfile) => UserProfile)) => void
  toggleLibrary: (id: string) => void
  toggleLikedChart: (entry: LikedChartSong) => void
  hasRange: boolean
  // real backend-backed bookmarks/likes
  bookmarkedSongIds: Set<number>
  chartLikedIds: Set<string>
  toggleSongBookmarkRemote: (songId: number) => Promise<void>
  toggleChartLikeRemote: (entry: ChartLikeEntry) => Promise<void>
}

const StoreCtx = React.createContext<Ctx | null>(null)

const STORAGE_KEY = "fitch:profile:v1"

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = React.useState<UserProfile>(DEFAULT_PROFILE)
  const [hydrated, setHydrated] = React.useState(false)
  const [bookmarkedSongIds, setBookmarkedSongIds] = React.useState<Set<number>>(new Set())
  const [chartLikedIds, setChartLikedIds] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
      if (raw) setProfileState({ ...DEFAULT_PROFILE, ...JSON.parse(raw) })
    } catch {}
    setHydrated(true)
  }, [])

  // load real bookmark/like state from the backend once we know who's logged in
  React.useEffect(() => {
    if (!hydrated || !profile.userId) return
    let cancelled = false
    api
      .getSongBookmarks()
      .then((songs: { songId: number }[]) => {
        if (!cancelled) setBookmarkedSongIds(new Set(songs.map((s) => s.songId)))
      })
      .catch(() => {})
    api
      .getChartLikes()
      .then((likes: ChartLikeEntry[]) => {
        if (!cancelled) setChartLikedIds(new Set(likes.map((l) => l.externalId)))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [hydrated, profile.userId])

  const setProfile = React.useCallback(
    (p: UserProfile | ((prev: UserProfile) => UserProfile)) => {
      setProfileState((prev) => {
        const next = typeof p === "function" ? (p as (prev: UserProfile) => UserProfile)(prev) : p
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {}
        return next
      })
    },
    []
  )

  // legacy local-only toggles — kept only so old code paths don't crash;
  // song bookmarks / chart likes should use the *Remote functions below
  const toggleLibrary = React.useCallback(
    (id: string) => {
      setProfile((p) => {
        const exists = p.library.includes(id)
        return {
          ...p,
          library: exists ? p.library.filter((x) => x !== id) : [...p.library, id],
        }
      })
    },
    [setProfile]
  )

  const toggleLikedChart = React.useCallback(
    (entry: LikedChartSong) => {
      setProfile((p) => {
        const exists = p.likedCharts.some((c) => c.id === entry.id)
        return {
          ...p,
          likedCharts: exists
            ? p.likedCharts.filter((c) => c.id !== entry.id)
            : [...p.likedCharts, entry],
        }
      })
    },
    [setProfile]
  )

  const toggleSongBookmarkRemote = React.useCallback(async (songId: number) => {
    // optimistic update
    setBookmarkedSongIds((prev) => {
      const next = new Set(prev)
      next.has(songId) ? next.delete(songId) : next.add(songId)
      return next
    })
    try {
      const res = await api.toggleSongBookmark(songId)
      setBookmarkedSongIds((prev) => {
        const next = new Set(prev)
        res.saved ? next.add(songId) : next.delete(songId)
        return next
      })
    } catch {
      // revert on failure
      setBookmarkedSongIds((prev) => {
        const next = new Set(prev)
        next.has(songId) ? next.delete(songId) : next.add(songId)
        return next
      })
    }
  }, [])

  const toggleChartLikeRemote = React.useCallback(async (entry: ChartLikeEntry) => {
    setChartLikedIds((prev) => {
      const next = new Set(prev)
      next.has(entry.externalId) ? next.delete(entry.externalId) : next.add(entry.externalId)
      return next
    })
    try {
      const res = await api.toggleChartLike(entry)
      setChartLikedIds((prev) => {
        const next = new Set(prev)
        res.saved ? next.add(entry.externalId) : next.delete(entry.externalId)
        return next
      })
    } catch {
      setChartLikedIds((prev) => {
        const next = new Set(prev)
        next.has(entry.externalId) ? next.delete(entry.externalId) : next.add(entry.externalId)
        return next
      })
    }
  }, [])

  const value = React.useMemo<Ctx>(
    () => ({
      profile,
      setProfile,
      toggleLibrary,
      toggleLikedChart,
      hasRange: !!profile.range,
      bookmarkedSongIds,
      chartLikedIds,
      toggleSongBookmarkRemote,
      toggleChartLikeRemote,
    }),
    [
      profile,
      setProfile,
      toggleLibrary,
      toggleLikedChart,
      bookmarkedSongIds,
      chartLikedIds,
      toggleSongBookmarkRemote,
      toggleChartLikeRemote,
    ]
  )

  if (!hydrated) {
    return <div className="bg-app-gradient min-h-dvh" />
  }

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = React.useContext(StoreCtx)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}
