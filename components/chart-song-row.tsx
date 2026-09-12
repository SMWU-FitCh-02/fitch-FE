"use client"

import type { ChartEntry } from "@/lib/itunes"

export function ChartSongRow({ entry }: { entry: ChartEntry }) {
  return (
    <a
      href={entry.itunesUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-[12px] bg-card/70 border border-border/60 p-2.5 transition-colors hover:bg-card"
    >
      <div className="w-7 text-center text-base font-bold text-muted-foreground">
        {entry.rank}
      </div>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px]">
        {entry.artworkUrl ? (
          <img
            src={entry.artworkUrl}
            alt={entry.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{entry.title}</div>
        <div className="truncate text-xs text-muted-foreground">{entry.artist}</div>
      </div>
    </a>
  )
}

export function ChartSongTile({ entry }: { entry: ChartEntry }) {
  return (
    <a
      href={entry.itunesUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-32 shrink-0 group"
    >
      <div className="relative w-32 h-32 overflow-hidden rounded-[12px] border border-border/40">
        {entry.artworkUrl ? (
          <img
            src={entry.artworkUrl}
            alt={entry.title}
            className="object-cover h-full w-full transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>
      <div className="mt-2 truncate text-sm font-semibold">{entry.title}</div>
      <div className="truncate text-xs text-muted-foreground">{entry.artist}</div>
    </a>
  )
}

export function ChartPodiumItem({ entry }: { entry: ChartEntry }) {
  return (
    <a
      href={entry.itunesUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="relative rounded-[12px] overflow-hidden bg-surface/60 border border-border/60 p-2.5 block"
    >
      <div className="absolute top-2 left-2 z-10 h-7 w-7 rounded-full bg-gradient-to-br from-primary to-brand text-primary-foreground grid place-items-center text-xs font-extrabold">
        {entry.rank}
      </div>
      <div className="aspect-square relative rounded-[10px] overflow-hidden">
        {entry.artworkUrl ? (
          <img src={entry.artworkUrl} alt={entry.title} className="object-cover h-full w-full" />
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>
      <div className="mt-2 text-xs font-bold truncate">{entry.title}</div>
      <div className="text-[10px] text-muted-foreground truncate">{entry.artist}</div>
    </a>
  )
}
