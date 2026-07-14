# PROGRESS

## 2026-07-13 — NextAuth/Firebase 잔재 제거, 빌드 에러 수정

### 상황
`npm run build`가 6개 module-not-found 에러로 실패 중이었다. 원인은
"Migrate authentication from Firebase to Supabase" 커밋에서 `auth.ts`,
`@/lib/auth-utils`, `next-auth` 패키지, Firebase 설정을 제거했지만 이를
import하던 파일들이 남아있었기 때문. 이로 인해 Vercel 배포가 계속 실패해서
최근 커밋들(pricing, 환불정책, 개인정보처리방침 등)이 라이브에 반영되지
못하고 있었다.

### 삭제한 파일
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/components/providers/session-provider.tsx`
- `src/app/api/debug-apple/route.ts`
- `src/app/api/debug-auth/route.ts`
- `src/app/api/debug-vars/route.ts`
- `src/lib/firebase/config.ts` (어디서도 import되지 않는 Firebase 잔재.
  `firebase` 패키지 미설치로 빌드 타입 에러 발생 → 조사 후 삭제 확인받음)

### 인증 로직 변경
- `src/components/layout/navbar.tsx`: `next-auth/react`의 `useSession`/`signOut` 제거.
  `@/utils/supabase/client`의 `createClient()`로 전환 —
  마운트 시 `supabase.auth.getUser()`로 초기 상태 확인 후
  `supabase.auth.onAuthStateChange`로 상태 변화 구독(언마운트 시 해제).
  로그아웃은 `supabase.auth.signOut()` 후 홈으로 이동.
- `src/app/[locale]/sniff/page.tsx`: `@/../auth`의 `auth()` 제거.
  `@/utils/supabase/server`의 `createClient()` + `supabase.auth.getUser()`로 대체.
  로그인 여부에 따라 "시작하기" 버튼이 `/payment` 또는 `/pricing`으로 분기하는
  기존 동작은 그대로 유지.
- `src/app/[locale]/layout.tsx`: 더 이상 필요 없는 `SessionProvider` 래퍼 제거.

### 기타
- `messages/ko.json`, `messages/en.json`의 `Navbar` 네임스페이스에 `login`/`logout`
  키 추가 (기존에 키가 없어 화면에 "Navbar.login" 그대로 노출되던 버그 수정).
- `next.config.ts`에 `turbopack.root`를 프로젝트 루트로 명시해
  "multiple lockfiles" 워크스페이스 경고 제거.

### 검증
- `npm run build` — 에러 0, exit code 0으로 통과.
- `npm run dev` + Playwright(headless Chromium)로 실제 렌더링 확인:
  - `/ko/sniff`, `/en/sniff` 네비바 로그인 버튼이 "로그인"/"Login"으로 정상 표시
    (더 이상 "Navbar.login" 아님) — 스크린샷으로 확인.
  - 로그아웃 상태에서 sniff 페이지의 "시작하기" 링크가 `/ko/pricing`으로 정상 분기.
  - `/ko/pricing`, `/ko/refund-policy` 정상 렌더, 콘솔 에러 없음.
- **미검증**: 실제 OAuth(Google/Apple) 로그인 → 네비바 로그인 상태 전환 → 로그아웃
  전체 왕복은 실제 자격 증명이 필요해 이 환경에서 end-to-end로 재현하지 못했다.
  navbar/sniff의 Supabase 연동 코드는 이 저장소에서 이미 쓰이고 있는 표준
  `@supabase/ssr` 패턴(`src/utils/supabase/client.ts`, `server.ts`, `src/app/actions/auth.ts`)을
  그대로 따른다.

### 알려진 별개 이슈 (이번 범위 밖, 미수정)
- 빌드 중 `Error: MISSING_MESSAGE: Privacy.section11Title (en)` 로그가 출력됨
  (`/en/privacy` 페이지의 사전 존재 번역 누락). 빌드 자체를 막지는 않음.

## 인프라 (2026-07 확정)

- 웹 배포: Firebase App Hosting (프로젝트 sniff-by-hatch-app, 백엔드 sniff-web-server, 콘솔 계정 admin@inovaai.ai)
- 배포 트리거: main 브랜치 push 시 자동 (GitHub Actions의 hosting 워크플로우는 죽은 잔재, 추후 삭제 예정)
- 서버 환경변수: apphosting.yaml (공개값만. 비밀값은 추후 Secret Manager)
- 인증: Supabase (hvloodegutmwxbabdsjf). OAuth 제공자 설정 = 대시보드 Authentication → Providers, URL 설정 = URL Configuration (Site URL: https://inovaai.ai)
- Google OAuth: GCP sniff-by-hatch-app의 sniff-backend(웹)/sniff-android
- Apple OAuth: Team ID M7LMNHX3LH, Services ID ai.inovaai.web, Key ID 8TUCZV6WHB. secret은 6개월 만료 JWT → 만료 전 재생성 필요 (2027년 1월 초 갱신). 옛 키 9N9655A977은 2026-07-14 폐기됨
- 롤백: Firebase 콘솔 → App Hosting → 출시 탭에서 이전 성공 빌드로
