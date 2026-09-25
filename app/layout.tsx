import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { StoreProvider } from "@/lib/store"
import { PwaRegister } from "@/components/pwa-register"

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
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/icon-180.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitCh",
  },
}

export const viewport: Viewport = {
  themeColor: "#0a1024",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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
      <PwaRegister />
      <StoreProvider>
        <div className="mobile-shell bg-app-gradient">{children}</div>
      </StoreProvider>
      </body>
      </html>
  )
}