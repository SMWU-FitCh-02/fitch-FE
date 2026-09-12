// Generate stylized SVG album covers for each song
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, "..", "public", "covers")
mkdirSync(OUT_DIR, { recursive: true })

const songs = [
  { id: "iu-good-day", title: "좋은 날", artist: "IU", palette: ["#FFB347", "#FF6B9D", "#7B5BFF"], mood: "spark" },
  { id: "iu-night-letter", title: "밤편지", artist: "IU", palette: ["#1B2D6B", "#3E5FB0", "#8FA8E8"], mood: "moon" },
  { id: "park-hyo-shin-wildflower", title: "야생화", artist: "박효신", palette: ["#0F2A23", "#3E8C71", "#F2C94C"], mood: "flower" },
  { id: "park-hyo-shin-snow-flower", title: "눈의 꽃", artist: "박효신", palette: ["#1A2A4A", "#86A8E7", "#FFFFFF"], mood: "snow" },
  { id: "paul-kim-every-day", title: "모든 날, 모든 순간", artist: "폴킴", palette: ["#FFD6E0", "#FFB6C1", "#F08080"], mood: "petal" },
  { id: "younha-event-horizon", title: "사건의 지평선", artist: "윤하", palette: ["#0A0F2C", "#5B3FCF", "#FF6EC7"], mood: "galaxy" },
  { id: "kim-bum-soo-i-miss-you", title: "보고 싶다", artist: "김범수", palette: ["#0A0A1A", "#1F1F4D", "#B96BFF"], mood: "rain" },
  { id: "lim-jae-bum-for-you", title: "너를 위해", artist: "임재범", palette: ["#1A0A0A", "#7A1F1F", "#F2C94C"], mood: "fire" },
  { id: "sung-si-kyung-on-the-street", title: "거리에서", artist: "성시경", palette: ["#1B1F3A", "#5C6B99", "#E2D89F"], mood: "street" },
  { id: "lee-sun-hee-fate", title: "인연", artist: "이선희", palette: ["#3B0F2E", "#9B3D6F", "#F2C094"], mood: "thread" },
  { id: "kim-yeon-woo-farewell-taxi", title: "이별택시", artist: "김연우", palette: ["#101A33", "#1F4F8C", "#FFD166"], mood: "taxi" },
  { id: "kim-kwang-seok-around-thirty", title: "서른 즈음에", artist: "김광석", palette: ["#2A1B0F", "#7A5C3C", "#E8C795"], mood: "vinyl" },
  { id: "bts-dynamite", title: "Dynamite", artist: "BTS", palette: ["#FFE066", "#FF8FA3", "#9D8CFF"], mood: "burst" },
  { id: "newjeans-hype-boy", title: "Hype Boy", artist: "NewJeans", palette: ["#C9F0E0", "#A8E6CF", "#FFE5B4"], mood: "pastel" },
  { id: "ive-love-dive", title: "LOVE DIVE", artist: "IVE", palette: ["#2B1B5C", "#7B5BFF", "#FFD1FF"], mood: "wave" },
  { id: "aespa-next-level", title: "Next Level", artist: "aespa", palette: ["#000020", "#00E5FF", "#FF00C8"], mood: "neon" },
  { id: "10cm-tonight", title: "오늘 밤은 어둠이...", artist: "10CM", palette: ["#1E1E2E", "#404060", "#FFCC66"], mood: "lantern" },
  { id: "akmu-heartbreak", title: "어떻게 이별까지...", artist: "AKMU", palette: ["#F5E6D3", "#D9B996", "#8B5E3C"], mood: "warm" },
  { id: "bruno-mars-just-the-way", title: "Just The Way", artist: "Bruno Mars", palette: ["#1A1A2E", "#E94560", "#F2C94C"], mood: "retro" },
  { id: "adele-hello", title: "Hello", artist: "Adele", palette: ["#1B1B1B", "#5B5B5B", "#D4AF37"], mood: "mono" },
]

function makeCover(s) {
  const [c1, c2, c3] = s.palette
  let art = ""

  switch (s.mood) {
    case "spark":
      art = `
        <circle cx="200" cy="200" r="140" fill="url(#g1)" />
        ${Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2
          const x1 = 200 + Math.cos(a) * 160
          const y1 = 200 + Math.sin(a) * 160
          return `<line x1="200" y1="200" x2="${x1}" y2="${y1}" stroke="${c3}" stroke-width="3" opacity="0.5" />`
        }).join("")}
        <circle cx="200" cy="200" r="80" fill="${c3}" opacity="0.8"/>
      `
      break
    case "moon":
      art = `
        <circle cx="280" cy="130" r="70" fill="${c3}" opacity="0.95" />
        <circle cx="260" cy="120" r="60" fill="${c1}" />
        ${Array.from({ length: 30 }).map(() => {
          const cx = Math.random() * 400
          const cy = Math.random() * 400
          const r = Math.random() * 1.5 + 0.3
          return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c3}" opacity="${Math.random()*0.8+0.2}" />`
        }).join("")}
      `
      break
    case "flower":
      art = `
        ${Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2
          const cx = 200 + Math.cos(a) * 60
          const cy = 200 + Math.sin(a) * 60
          return `<ellipse cx="${cx}" cy="${cy}" rx="40" ry="70" fill="${c3}" opacity="0.85" transform="rotate(${(i * 60)} ${cx} ${cy})"/>`
        }).join("")}
        <circle cx="200" cy="200" r="35" fill="${c2}" />
      `
      break
    case "snow":
      art = `
        ${Array.from({ length: 60 }).map(() => {
          const cx = Math.random() * 400
          const cy = Math.random() * 400
          const r = Math.random() * 3 + 0.5
          return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c3}" opacity="${Math.random()*0.8+0.2}" />`
        }).join("")}
        <g transform="translate(200 200)">
          ${[0, 60, 120, 180, 240, 300].map((a) => `<line x1="0" y1="0" x2="${Math.cos((a*Math.PI)/180)*60}" y2="${Math.sin((a*Math.PI)/180)*60}" stroke="${c3}" stroke-width="3"/>`).join("")}
        </g>
      `
      break
    case "petal":
      art = `
        ${Array.from({ length: 18 }).map(() => {
          const cx = Math.random() * 400
          const cy = Math.random() * 400
          const r = Math.random() * 16 + 8
          const rot = Math.random() * 360
          return `<ellipse cx="${cx}" cy="${cy}" rx="${r*0.5}" ry="${r}" fill="${c3}" opacity="${Math.random()*0.5+0.3}" transform="rotate(${rot} ${cx} ${cy})"/>`
        }).join("")}
      `
      break
    case "galaxy":
      art = `
        ${Array.from({ length: 100 }).map(() => {
          const cx = Math.random() * 400
          const cy = Math.random() * 400
          const r = Math.random() * 1.8 + 0.3
          return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${Math.random() > 0.5 ? c3 : c2}" opacity="${Math.random()*0.8+0.2}" />`
        }).join("")}
        <ellipse cx="200" cy="200" rx="170" ry="40" fill="none" stroke="${c2}" stroke-width="2" opacity="0.4" transform="rotate(-20 200 200)"/>
        <ellipse cx="200" cy="200" rx="120" ry="25" fill="none" stroke="${c3}" stroke-width="2" opacity="0.5" transform="rotate(-20 200 200)"/>
      `
      break
    case "rain":
      art = `
        ${Array.from({ length: 80 }).map(() => {
          const x = Math.random() * 400
          const y = Math.random() * 400
          const len = Math.random() * 16 + 6
          return `<line x1="${x}" y1="${y}" x2="${x - 4}" y2="${y + len}" stroke="${c3}" stroke-width="1.5" opacity="${Math.random()*0.7+0.3}" />`
        }).join("")}
      `
      break
    case "fire":
      art = `
        ${Array.from({ length: 12 }).map((_, i) => {
          const cx = 200 + (Math.random() - 0.5) * 100
          const cy = 320 - i * 18
          const r = 60 - i * 4
          return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${i % 2 ? c2 : c3}" opacity="${0.5 + (12-i)/30}" />`
        }).join("")}
      `
      break
    case "street":
      art = `
        <rect x="60" y="240" width="80" height="160" fill="${c2}" opacity="0.7"/>
        <rect x="160" y="160" width="80" height="240" fill="${c2}" opacity="0.6"/>
        <rect x="260" y="200" width="80" height="200" fill="${c2}" opacity="0.7"/>
        ${Array.from({ length: 10 }).map(() => {
          const cx = 80 + Math.random() * 280
          const cy = 180 + Math.random() * 200
          return `<rect x="${cx}" y="${cy}" width="6" height="6" fill="${c3}"/>`
        }).join("")}
      `
      break
    case "thread":
      art = `
        ${Array.from({ length: 8 }).map((_, i) => {
          const r = 30 + i * 18
          return `<circle cx="200" cy="200" r="${r}" stroke="${c3}" stroke-width="2" fill="none" opacity="${0.9 - i * 0.08}"/>`
        }).join("")}
        <circle cx="200" cy="200" r="20" fill="${c2}"/>
      `
      break
    case "taxi":
      art = `
        <rect x="80" y="220" width="240" height="80" rx="10" fill="${c3}"/>
        <rect x="120" y="180" width="160" height="50" rx="6" fill="${c2}"/>
        <circle cx="140" cy="300" r="20" fill="${c1}"/>
        <circle cx="260" cy="300" r="20" fill="${c1}"/>
        <rect x="170" y="160" width="60" height="20" rx="4" fill="${c3}"/>
      `
      break
    case "vinyl":
      art = `
        <circle cx="200" cy="200" r="160" fill="${c2}"/>
        <circle cx="200" cy="200" r="160" stroke="${c3}" stroke-width="1" fill="none"/>
        <circle cx="200" cy="200" r="120" stroke="${c3}" stroke-width="1" fill="none" opacity="0.5"/>
        <circle cx="200" cy="200" r="80" stroke="${c3}" stroke-width="1" fill="none" opacity="0.5"/>
        <circle cx="200" cy="200" r="50" fill="${c3}"/>
        <circle cx="200" cy="200" r="6" fill="${c1}"/>
      `
      break
    case "burst":
      art = `
        ${Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2
          const cx = 200 + Math.cos(a) * 100
          const cy = 200 + Math.sin(a) * 100
          const r = 30 + Math.random() * 20
          return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${i%3===0 ? c3 : c2}" opacity="0.85"/>`
        }).join("")}
        <circle cx="200" cy="200" r="60" fill="${c1}"/>
      `
      break
    case "pastel":
      art = `
        <circle cx="120" cy="140" r="80" fill="${c2}" opacity="0.85"/>
        <circle cx="270" cy="170" r="100" fill="${c3}" opacity="0.85"/>
        <circle cx="180" cy="290" r="90" fill="${c1}" opacity="0.95"/>
      `
      break
    case "wave":
      art = `
        ${Array.from({ length: 6 }).map((_, i) => {
          const y = 80 + i * 50
          return `<path d="M0 ${y} Q100 ${y - 30} 200 ${y} T400 ${y}" stroke="${c3}" stroke-width="3" fill="none" opacity="${0.9 - i * 0.1}"/>`
        }).join("")}
      `
      break
    case "neon":
      art = `
        <rect x="60" y="60" width="280" height="280" rx="20" stroke="${c2}" stroke-width="3" fill="none"/>
        <rect x="100" y="100" width="200" height="200" rx="14" stroke="${c3}" stroke-width="3" fill="none"/>
        <text x="200" y="220" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="56" fill="${c3}">∞</text>
      `
      break
    case "lantern":
      art = `
        ${Array.from({ length: 14 }).map(() => {
          const cx = Math.random() * 400
          const cy = Math.random() * 400
          const r = Math.random() * 14 + 6
          return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c3}" opacity="${Math.random()*0.7+0.3}"/>`
        }).join("")}
      `
      break
    case "warm":
      art = `
        <circle cx="200" cy="240" r="160" fill="${c3}" opacity="0.85"/>
        <circle cx="200" cy="240" r="100" fill="${c2}" opacity="0.85"/>
        ${Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2
          return `<line x1="200" y1="240" x2="${200+Math.cos(a)*200}" y2="${240+Math.sin(a)*200}" stroke="${c3}" stroke-width="2" opacity="0.4"/>`
        }).join("")}
      `
      break
    case "retro":
      art = `
        ${[0, 1, 2, 3].map((i) => `<rect x="60" y="${80 + i * 60}" width="280" height="40" fill="${i % 2 ? c2 : c3}" opacity="${0.9 - i * 0.15}"/>`).join("")}
        <circle cx="200" cy="200" r="40" fill="${c3}"/>
      `
      break
    case "mono":
    default:
      art = `
        <rect x="60" y="60" width="280" height="280" fill="${c2}"/>
        <rect x="80" y="80" width="240" height="240" stroke="${c3}" stroke-width="2" fill="none"/>
        <text x="200" y="220" text-anchor="middle" font-family="serif" font-style="italic" font-size="48" fill="${c3}">${s.title.slice(0,1)}</text>
      `
      break
  }

  const initials = s.artist
    .replace(/[\(\)]/g, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  ${art}
  <g>
    <text x="24" y="354" font-family="-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif" font-size="22" font-weight="800" fill="rgba(255,255,255,0.95)">${escapeXml(s.title)}</text>
    <text x="24" y="376" font-family="-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif" font-size="13" font-weight="500" fill="rgba(255,255,255,0.75)">${escapeXml(s.artist)}</text>
  </g>
</svg>`
  return svg
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

for (const s of songs) {
  const svg = makeCover(s)
  writeFileSync(resolve(OUT_DIR, s.id + ".svg"), svg)
  console.log("wrote", s.id)
}
console.log("Done.")
