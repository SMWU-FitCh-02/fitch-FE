import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { StoreProvider } from "@/lib/store"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "FitCh — 내 음역대에 맞는 노래 추천",
  description: "AI 음역대 분석 + 맞춤 노래 추천으로 노래방을 즐겁게",
}

export const viewport: Viewport = {
  themeColor: "#0a1024",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-app-gradient">
        <StoreProvider>
          <div className="mobile-shell bg-app-gradient">{children}</div>
        </StoreProvider>
      </body>
    </html>
  )
}
