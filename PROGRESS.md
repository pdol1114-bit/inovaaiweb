# PROGRESS

## 2026-07-30 — 결제 페이지 KB 에스크로 이체 인증마크 추가

### 변경 내용
- `src/components/layout/KBAuthMark.tsx` 신규 생성: KB에서 제공한 원본
  `<script>`/`<form>` 기반 팝업 인증마크 스니펫을 React 클라이언트 컴포넌트로
  변환. `document.KB_AUTHMARK_FORM` 대신 `useRef`로 폼을 참조해 제출하고,
  팝업 오픈 로직은 `onClick` 핸들러(`handlePopKBAuthMark`)로 이전. 폼 값
  (page/cc/mHValue)은 KB가 발급한 원본 값 그대로 유지 (변경 시 인증 무효화 우려).
- 업데이트된 작업 지시서(WORK_ORDER_footer_business_info (1).md)에 따라
  **푸터가 아닌 `/ko/payment` 결제 버튼 하단**에만 `<KBAuthMark />` 배치
  (결제 직전 안전거래 인증 확인용). 카드 배경이 흰색이라 별도 wrapper 없이
  원본 이미지 그대로 사용.

### 검증
- `npx tsc --noEmit`, `npm run build` 통과.
- 로컬 dev 서버 확인: `/ko/payment`에는 escrowcmark.gif 노출, 공통 푸터에는
  노출되지 않음.

## 2026-07-30 — 푸터 통신판매업신고번호 반영 (전자상거래법)

### 배경
통신판매업 신고증 발급 완료 (제 2026-충북음성-0248 호). 전자상거래법에 따라
푸터의 통신판매업신고번호가 실제 값으로 표시되고, 클릭 시 공정거래위원회
사업자정보확인 팝업으로 연결되어야 함.

### 변경 내용
- `src/lib/business-info.ts` 신규 생성: 사업자등록번호(479-81-03783),
  통신판매업신고번호(ko/en), 공정위 팝업 URL 생성 유틸(`getFtcBizCommUrl`)을
  한곳에서 관리하도록 분리 (하드코딩 제거).
- `src/components/layout/footer.tsx`: 사업자등록번호/통신판매업신고번호를
  config 값으로 렌더링하도록 변경. 통신판매업신고번호는
  `http://www.ftc.go.kr/bizCommPop.do?wrkr_no=4798103783` 링크로 새 창 오픈.
- `messages/ko.json`, `messages/en.json`: `Footer.businessNumber` /
  `Footer.telecomSalesNumber`(값이 박혀있던 키) → `businessNumberLabel` /
  `telecomSalesNumberLabel`(라벨만 갖는 키)로 분리.

### 검증
- `npx tsc --noEmit`, `npm run build` 통과.
- 로컬 dev 서버에서 `/ko/pricing` 렌더링 확인: 통신판매업신고번호가
  `wrkr_no=4798103783` 링크로 정상 출력됨.

## 2026-07-21 — 프로젝트 폴더 용량 정리 (5.7GB → 720MB)

### 원인
- `.npmrc`에 `cache=./.npm-cache`가 설정돼 있어 npm 캐시가 프로젝트 폴더
  안에 쌓이고 있었음 (정상은 `~/.npm`). `_cacache`만 3.7GB.
- `.next/dev` 등 로컬 개발 빌드 산출물이 1.0GB 누적.
- `out/` 정적 export 산출물 16MB.

### 조치
- `.npm-cache/`, `.next/`, `out/` 삭제 (전부 재생성 가능한 캐시/빌드 산출물,
  소스코드 아님).
- `.npmrc`에서 `cache=./.npm-cache` 줄 제거 → 이후 npm은 전역 캐시(`~/.npm`)
  사용, 프로젝트 폴더 안에 캐시가 다시 쌓이지 않음.

### 결과
- 폴더 총 용량 5.7GB → 720MB.
- `node_modules`(517MB), `.git`(168MB, Apple 개인키 커밋 이력 포함)은
  정상 범위라 그대로 둠.

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
