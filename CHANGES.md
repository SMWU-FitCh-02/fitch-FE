# FitCh — 변경 사항 (통합본, 최신)

이 zip이 지금까지의 모든 변경을 합친 최신본이에요. 이전에 받은 zip들은 이제 안 쓰셔도 됩니다.

## 1. 백엔드 연동 (Spring Boot)
- **lib/api.ts** — 백엔드 API 클라이언트.
- **lib/store.tsx** — `UserProfile`에 `userId` 필드, 로컬스토리지 키 `fitch:profile:v1`로 변경.
- **app/login/page.tsx** — 로그인 후 실제 `userId` 조회해서 저장.
- **app/signup/info/page.tsx** — 회원가입 성공 후 자동 로그인.
- **components/range-test.tsx** — 실제 마이크 녹음 → `POST /voice/upload` 전송, 실패 시 시뮬레이션으로 자동 대체.
- **app/signup/range-test/page.tsx**, **app/(app)/mypage/range-test/page.tsx** — `userId` 전달.
- **app/(app)/mypage/page.tsx** — 로그아웃 시 토큰 삭제.

## 2. FitCh 리브랜딩
- `voicefit-logo.tsx` → **`fitch-logo.tsx`**로 파일명 변경, `VoicefitLogo` → `FitchLogo`.
- `package.json` name: `fitch`.
- 화면 문구 전부 "VoiceFit" → "FitCh".

## 3. 실시간 인기차트 (이번 변경 — 신규)

기존 "실시간 인기차트"는 실제로는 `lib/songs.ts`에 하드코딩된 가짜 데이터였고,
"Spotify Korea 기준"이라는 문구도 사실이 아니었어요. 이번에 **진짜 실시간 데이터**로 바꿨습니다.

- **lib/itunes.ts** (신규) — Apple의 공개 iTunes RSS 차트 피드를 호출하는 함수.
  `https://itunes.apple.com/kr/rss/topsongs/limit={n}/json` — **API 키, 가입, 비용 전혀 없음.**
- **components/chart-song-row.tsx** (신규) — 차트 항목을 보여주는 행/타일/포디움 컴포넌트.
  각 항목을 누르면 Apple Music 페이지로 새 탭에서 열립니다 (앱 내 상세 페이지로는
  안 갑니다 — 로컬 곡 카탈로그에 없는 곡이라 상세 페이지 데이터가 없어서예요).
- **app/(app)/home/page.tsx** — "실시간 인기차트" 섹션이 홈 화면 로드 시 Apple 차트를
  fetch해서 Top 5를 보여주도록 변경. 로딩 중 표시 포함.
- **app/(app)/chart/page.tsx** — `/chart` 전체 차트 페이지도 동일하게 Apple 차트
  Top 50을 실시간으로 불러오도록 전면 교체. "Spotify Korea 기준" 문구 삭제,
  "Apple Music 기준"으로 정정.

**참고**: 음역대 기반 추천(`recommendSongs`)은 그대로 로컬 곡 카탈로그(`lib/songs.ts`)를
씁니다 — Apple 차트 데이터에는 음역대(최고음/최저음) 정보가 없어서, 추천 로직과는
연결하지 않았어요. "인기차트"와 "맞춤 추천"은 서로 다른 데이터 소스라는 점 참고해주세요.

## 적용 방법

```
# voicefit 프로젝트 루트에서
rm components/voicefit-logo.tsx
cp -r <이 압축 풀은 폴더>/* .
```
`node_modules`는 그대로 쓰시면 됩니다.

## 실행
1. 백엔드: `./gradlew bootRun`
2. 프론트: `npm run dev` (3000번 포트 필수 — 백엔드 CORS 설정과 일치해야 함)
3. `http://localhost:3000` 접속. 로컬 로그인 세션은 초기화되니 새로 로그인/가입해주세요.

## 확인 안 된 부분
- `npm run dev`는 제 환경(리눅스)에서 실행해보지 못했어요 (맥 전용 네이티브 모듈
  문제). `tsc --noEmit` 타입 체크는 통과했습니다.
- iTunes RSS 피드는 비공식으로 취급되는 공개 API라, 아주 드물게 응답 형식이
  바뀔 수 있어요. 화면에 차트가 하나도 안 뜨면(로딩만 계속되거나 에러 문구가
  뜨면) 알려주세요 — 바로 봐드릴게요.

## 4. 차트 API 주소 수정 (긴급 패치)

Apple 차트가 이상한 곡(호두까기 인형 등) 4개만 보여주는 문제 확인 —
처음에 썼던 `itunes.apple.com/rss` 주소가 2022년에 Apple이 공식 폐기한
옛날 엔드포인트였어요. 아래 주소로 교체했습니다:

```
https://rss.applemarketingtools.com/api/v2/kr/music/most-played/{limit}/songs.json
```

**lib/itunes.ts**만 다시 바뀌었어요. 나머지 파일은 이전과 동일합니다.

## 5. CORS 문제 해결 (긴급 패치 2)

브라우저에서 Apple 차트 API를 직접 호출하니 CORS 정책에 막히는 문제가 있었어요
(Apple 서버가 브라우저 직접 호출을 허용하는 헤더를 안 보내줘서 발생).

**해결**: 브라우저가 Apple에 직접 요청하는 대신, 우리 Next.js 서버가 대신
요청하도록 바꿨어요 (서버-서버 통신은 CORS 제약이 없음).

- **app/api/chart/route.ts** (신규) — 서버에서 Apple 차트 API를 호출하는
  Next.js Route Handler. `/api/chart?limit=50` 형태로 우리 앱 자체에서 호출.
- **lib/itunes.ts** — Apple 주소를 직접 호출하던 걸 `/api/chart`(우리 서버)를
  호출하도록 변경.

이제 브라우저는 우리 서버(`localhost:3000`)에만 요청하고, Apple 호출은
서버 안에서 일어나기 때문에 CORS 문제 자체가 발생하지 않아요.

## 6. 추천곡 화면 실제 백엔드 연동 (이번 변경)

`/recommendations`("추천곡" 탭) 화면이 로컬 더미 곡 목록 대신 실제 백엔드
(`/recommend/{userId}`, 음역대 측정 전이면 `/songs` 전체 목록)를 사용하도록 바꿨어요.

- **lib/api.ts** — `SongResponse`, `RecommendResponse` 타입 추가.
- **lib/song-display.ts** (신규) — 백엔드엔 없는 "난이도" 배지와 앨범 커버를
  각각 최고음 기준 계산 / 곡 이름 기반 고정 색상으로 대체 생성.
- **components/backend-song-card.tsx** (신규) — 백엔드 곡 데이터를 보여주는
  카드 컴포넌트 (로컬 카탈로그용 기존 SongCard와는 별개).
- **app/(app)/recommendations/page.tsx** — 전면 재작성. 장르 필터 칩은
  백엔드에 실제 등록된 genre 값들로 동적으로 생성돼요 (K-POP/발라드 하드코딩 아님).

**중요**: 지금 백엔드 DB엔 곡이 1개뿐이라 이 화면이 거의 비어 보일 거예요.
같이 드린 `seed-songs.sh`로 곡을 15개 미리 등록해두시는 걸 추천해요.

## 7. 추천곡 카드에 실제 앨범 커버 추가 (이번 변경)

곡 카드에 색깔 블록 대신 **실제 앨범 커버 이미지**가 뜨도록 추가했어요.

- **app/api/artwork/route.ts** (신규) — Apple iTunes Search API로 곡 제목+아티스트
  기준 앨범 커버를 조회하는 서버 라우트. 결과는 1일 캐싱.
- **components/backend-song-card.tsx** — 카드가 뜰 때마다 `/api/artwork`를 호출해서
  실제 커버를 찾으면 그걸 쓰고, 못 찾으면 기존 색깔+글자 플레이스홀더로 자동 대체.

곡 제목/아티스트가 실제 iTunes 카탈로그에 있는 곡이면 진짜 앨범 사진이 뜨고,
없는 곡(비인기곡, 표기 차이 등)은 기존 플레이스홀더가 그대로 유지돼요.

## 8. 실제 곡 상세 페이지 추가 (이번 변경)

추천곡 카드를 눌러도 갈 곳이 없던 문제 해결. `/songs/{id}` 경로로 실제 백엔드
데이터 기반 상세 페이지를 새로 만들었어요.

- **app/api/artwork/route.ts** — iTunes Search API 응답에서 `previewUrl`(실제
  30초 미리듣기 오디오 링크)도 같이 반환하도록 확장.
- **lib/api.ts** — `getSong(songId)` 함수 추가 (`GET /songs/{id}`).
- **components/backend-song-card.tsx** — 카드 전체를 `/songs/{id}`로 가는
  링크로 변경.
- **app/(app)/songs/[id]/page.tsx** (신규) — 실제 곡 상세 화면.
  - 실제 앨범 커버, 실제 30초 미리듣기(재생/일시정지 가능)
  - 장르/원곡 키/최저음/최고음 — 전부 백엔드 실제 값
  - "비슷한 음역대 곡" — 백엔드 전체 곡 중 최고음 기준 ±3반음 이내 곡을
    실시간으로 필터링해서 표시
  - TJ/금영 번호, 재생시간처럼 백엔드에 없는 정보는 만들어내지 않고 제외함

기존 `/song/{id}` (로컬 목데이터용, 단수형 song)와는 별개 경로라 안 건드렸어요.

## 9. 홈 화면 "이런 곡은 어때요?" 섹션 제거 (이번 변경)

로컬 목데이터 기반이라 실제 백엔드 데이터랑 헷갈릴 수 있던 섹션을 홈 화면에서
아예 제거했어요. 이제 홈 화면 추천은 하단 탭바의 "추천곡" 탭(실제 백엔드
연동됨)에서만 보여줍니다.

- **app/(app)/home/page.tsx** — "이런 곡은 어때요?" Section 블록 삭제,
  관련해서 더 이상 안 쓰는 `recommendSongs`, `SongTile`, `Sparkles` import 정리.
- "내가 좋아한 아티스트의 곡" 섹션(로컬 데이터 기반)은 건드리지 않았어요 —
  이것도 같이 없애고 싶으시면 말씀해주세요.

## 10. 앨범 커버 조회 안정화 (이번 변경)

곡이 많은 목록(추천곡 97곡 등)에서 카드가 한꺼번에 뜰 때, 각 카드가 동시에
iTunes API를 호출하면서 rate limit에 걸려 유명한 곡도 커버를 못 찾는 경우가
있었어요.

- **lib/artwork-cache.ts** (신규) — 동시 요청을 최대 3개로 제한하고,
  한 번 찾은 결과는 캐싱해서 재검색하지 않는 공용 조회 함수.
- **components/backend-song-card.tsx**, **app/(app)/songs/[id]/page.tsx** —
  개별 fetch 대신 이 공용 함수를 쓰도록 변경.
