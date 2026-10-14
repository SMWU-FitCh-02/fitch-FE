// 전시회용 저작권 프리(CC BY) 곡의 출처 정보. Free Music Archive 기준.
// 곡의 title/artist는 DB에 등록된 값과 같아야 매칭된다 (buildSongKey 기준, 공백만 정규화).

export type SongCreditInfo = {
  title: string
  artist: string
  license: string
  licenseUrl: string
  sourceUrl: string
}

export const SONG_CREDITS: SongCreditInfo[] = [
  {
    "title": "사랑의 빈도",
    "artist": "Adeline Yeo (HP)",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/adeline-yeo-hp/single/-13/"
  },
  {
    "title": "Canvas of the Sky",
    "artist": "Andrey Petrov",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/andrey-petrov/single/canvas-of-the-sky/"
  },
  {
    "title": "Can’t Wait Till I Graduate",
    "artist": "Andrey Petrov",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/andrey-petrov/single/cant-wait-till-i-graduate/"
  },
  {
    "title": "New day",
    "artist": "Andrey Petrov",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/andrey-petrov/sunset-reggae-dreams/new-day-3/"
  },
  {
    "title": "Quiet! None can hear",
    "artist": "Andrey Petrov",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/andrey-petrov/single/quiet-none-can-hear/"
  },
  {
    "title": "So much music’s playing in the world",
    "artist": "Andrey Petrov",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/andrey-petrov/single/so-much-musics-playing/"
  },
  {
    "title": "Who said",
    "artist": "Andrey Petrov",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/andrey-petrov/single/who-said/"
  },
  {
    "title": "Winter (Зима)",
    "artist": "Andrey Petrov",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/andrey-petrov/single/winter-zima/"
  },
  {
    "title": "You’ve got to be kidding",
    "artist": "Andrey Petrov",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/andrey-petrov/single/youve-got-to-be-kidding/"
  },
  {
    "title": "All For Nothing",
    "artist": "Anthem of Rain",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/anthem-of-rain/freedom/all-for-nothing/"
  },
  {
    "title": "Lost Without You",
    "artist": "Anthem of Rain",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/anthem-of-rain/freedom/lost-without-you/"
  },
  {
    "title": "Rock This House",
    "artist": "Anthem of Rain",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/anthem-of-rain/freedom/rock-this-house/"
  },
  {
    "title": "Secret Hopes",
    "artist": "Anthem of Rain",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/anthem-of-rain/freedom/secret-hopes/"
  },
  {
    "title": "Evil Cannot Create",
    "artist": "Elephant Funeral",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/Caleb_Lemond/The_Learning_Curve/Evil_Cannot_Create/"
  },
  {
    "title": "mad scientist",
    "artist": "Fog Lake",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/Fog_Lake/Virgo_indigo/Fog_Lake_-_virgo_indigo_-_03_mad_scientist/"
  },
  {
    "title": "nocturnal blues",
    "artist": "Fog Lake",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/Fog_Lake/Virgo_indigo/Fog_Lake_-_virgo_indigo_-_09_nocturnal_blues/"
  },
  {
    "title": "pretty lights",
    "artist": "Fog Lake",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/Fog_Lake/Virgo_indigo/Fog_Lake_-_virgo_indigo_-_10_pretty_lights/"
  },
  {
    "title": "push",
    "artist": "Fog Lake",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/Fog_Lake/Dragonchaser/Fog_Lake_-_dragonchaser_-_11_push/"
  },
  {
    "title": "Chasing Clouds",
    "artist": "Franzi Kruth",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/franzi-kruth/love-is-art-vol-1-2/chasing-clouds-2/"
  },
  {
    "title": "Everybody Knows You Came For Me",
    "artist": "Franzi Kruth",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/franzi-kruth/love-is-art-vol-1-2/everybody-knows-you-came-for-me-2/"
  },
  {
    "title": "Hair Longer Than My Skirt",
    "artist": "Franzi Kruth",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/franzi-kruth/love-is-art-vol-1-2/hair-longer-than-my-skirt-2/"
  },
  {
    "title": "I Hate Fireworks",
    "artist": "Lopkerjo",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/john-lopker/sound-n-fury/i-hate-fireworks/"
  },
  {
    "title": "Zealots and Zombies",
    "artist": "Lopkerjo",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/john-lopker/zealots-and-zombies/zealots-and-zombies/"
  },
  {
    "title": "Crypto Scam",
    "artist": "NoKings XXX",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/nokings-xxx/myob-maga/crypto-scam/"
  },
  {
    "title": "Merry Christmas",
    "artist": "Shane Ivers",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/shane-ivers/single/merry-christmas-5/"
  },
  {
    "title": "Arbeit oder Liebe",
    "artist": "Torsten Torsten",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/torsten-torsten/arbeit-oder-liebe/arbeit-oder-liebe/"
  },
  {
    "title": "The Annunakis",
    "artist": "Wren West",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/carlos-javed-1/natures-sacred-symphony-continues/the-annunakis/"
  },
  {
    "title": "The Falling Stars",
    "artist": "Wren West",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/carlos-javed-1/natures-sacred-symphony-continues/the-falling-stars/"
  },
  {
    "title": "The Natures Friend",
    "artist": "Wren West",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/carlos-javed-1/natures-sacred-symphony-continues/the-natures-friend/"
  },
  {
    "title": "The Universal Dream",
    "artist": "Wren West",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "sourceUrl": "https://freemusicarchive.org/music/carlos-javed-1/natures-sacred-symphony-continues/the-universal-dream/"
  }
]

const byKey = new Map(SONG_CREDITS.map((c) => [creditKey(c.title, c.artist), c]))

function creditKey(title: string, artist: string): string {
  const n = (s: string) => s.trim().replace(/\s+/g, " ")
  return `${n(title)}::${n(artist)}`
}

export function findCredit(title: string, artist: string): SongCreditInfo | undefined {
  return byKey.get(creditKey(title, artist))
}
