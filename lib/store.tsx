"use client"

import * as React from "react"

export type RangeRecord = {
  testedAt: string
  lowestNote: string
  highestNote: string
  comfortableHigh: string
  voiceTone: "bright" | "warm" | "husky" | "soft"
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
  library: string[] // song ids saved
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
  loggedIn: false,
}

type Ctx = {
  profile: UserProfile
  setProfile: (p: UserProfile | ((prev: UserProfile) => UserProfile)) => void
  toggleLibrary: (id: string) => void
  hasRange: boolean
}

const StoreCtx = React.createContext<Ctx | null>(null)

const STORAGE_KEY = "fitch:profile:v1"

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = React.useState<UserProfile>(DEFAULT_PROFILE)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
      if (raw) setProfileState({ ...DEFAULT_PROFILE, ...JSON.parse(raw) })
    } catch {}
    setHydrated(true)
  }, [])

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

  const value = React.useMemo<Ctx>(
    () => ({
      profile,
      setProfile,
      toggleLibrary,
      hasRange: !!profile.range,
    }),
    [profile, setProfile, toggleLibrary]
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
