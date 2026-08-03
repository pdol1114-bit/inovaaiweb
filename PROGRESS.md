# PROGRESS

## 2026-08-03 — 환불정책 재작성 (당월 이용 후 종료 / 일할 환불 없음)

### 방침 변경
해지 정책을 "당월 이용 후 종료, 일할 환불 없음"으로 확정.
직전 작업에서 추가했던 **"이용일수 비례 환불(일할 계산식)" 조항을 삭제**하고,
월 단위 결제·약정기간 없음·위약금 없음을 근거로 부분환불 미제공을 명시.

### 재작성 결과 (10개 항목)
지시된 ①~⑤ 구조를 반영하되, 지시서에 언급되지 않았지만 KCP 심사 요건상
필요한 기존 항목(요금 안내·환불 처리기간·부정이용·문의처)은 유지했다.

1. 요금 / 2. 정기결제 해지(당월 이용 유지, 해지 취소 가능) /
3. 중도 해지 시 부분환불 없음 / 4. 청약철회(전상법 §17② 제한 명시) /
5. 회사 귀책 / 6. 환불 수단 / 7. 요금 변경 사전고지 /
8. 환불 처리기간 / 9. 부정이용 / 10. 문의

`①정기결제 해지`는 문장이 길어 "해지 절차"와 "부분환불 미제공"을 2개 항목으로
분리했다(내용은 지시 그대로).

### 이용약관과의 정합성
제11조 ④(이미 결제된 기간은 결제주기 종료일까지 이용권한 유지, 다음 주기부터
미결제)가 새 정책과 일치. 제11조 ⑤·제12조 ①은 환불 기준을 유료정책 문서에
위임하는 구조라 별도 수정 불필요.

### 검증
ko/en 키 파리티 418/418, 빌드 통과, `/ko|/en/refund-policy` 10개 항목 렌더 확인.

### 미완 (별도 지시서 대기)
"구독 해지 기능 지시서"의 3번 항목 교체 지시만 전달받았고 원본 지시서를
받지 못해, 해지 기능 구현(`cancel_scheduled` 상태, service_end_date,
해지 취소 UI)은 착수하지 않음. 현재 웹에는 해지 UI·API가 없다.

## 2026-08-03 — 보안 정리 (민감파일 차단, git 규칙 명문화)

### 배경
직전 작업에서 `git add -A`로 사업자등록증·통장사본·계약서 PDF가 스테이징된
사고가 있었음(커밋 전 차단, 유출 없음). 공개 저장소이므로 사람이 매번
조심하는 방식 대신 시스템으로 막도록 정리.

### 1. .gitignore 민감파일 차단
사업자 서류 패턴(`포트원콘솔가입/`, `*사업자등록증*`, `*통장사본*`,
`*인감증명*`, `*등기부등본*`, `*주주명부*`, `*계약서*`, `*위임장*`,
`*고객확인서*`, `*보증보험*`, `*.pdf`) + `WORK_ORDER_*.md` 추가.
- 지시서에 없던 `*.docx` / `*.pptx` / `*.hwp`도 함께 추가함. 이번에 스테이징됐던
  파일에 계약서 docx와 심사자료 pptx가 있었고 `*.pdf`만으로는 안 막힌다.
- 레포에 필요한 PDF가 있는지 먼저 확인 → 추적 중인 PDF·docx·pptx 0건,
  디스크에도 0건이라 예외(`!path`) 처리 불필요.
- 실제로 더미 민감파일을 만들어 `git add -A`를 재현 → `.gitignore`와 `.npmrc`만
  스테이징되고 민감파일은 전부 차단되는 것 확인 후 더미 삭제.

### 2. CLAUDE.md 신설
`git add -A` / `git add .` 금지, 파일 명시 지정 규칙 명문화.
배포 타겟(App Hosting)·`NEXT_PUBLIC_*` 빌드타임 인라인 주의·사업자정보
단일 소스·ko/en 키 파리티 규칙도 함께 기록.

### 3. .npmrc
인증 토큰 없음(`prefer-offline=false` 한 줄). 히스토리 전체를 봐도 `.npmrc`를
건드린 커밋은 최초 커밋 1건뿐이고 토큰이 들어간 적 없음 → 공유 무방으로 판단,
커밋함. 미커밋 상태였던 변경은 `cache=./.npm-cache` 삭제로, 2026-07-21에
프로젝트 폴더 용량 3.7GB를 잡아먹던 원인을 제거한 것(그때 커밋이 누락돼 있었음).

### 4. 검증 결과
- 추적 중인 파일 중 민감파일 0건.
- 전체 히스토리(`git log --all`)에도 사업자 서류류 0건.
- **다만 별건으로 Apple 개인키(`AuthKey_9N9655A977.p8`)가 히스토리에 잔존**
  (5d21126에서 추가, 2c09d36에서 삭제). 삭제 커밋만으로는 히스토리에서
  사라지지 않아 공개 저장소에서 여전히 내려받을 수 있음. 커밋 메시지상
  이미 폐기(revoked)된 키로 보이나 확인 필요. 히스토리 재작성은 force push가
  필요한 파괴적 작업이라 사용자 판단 대기 중.

## 2026-08-03 — NHN KCP 카드사 심사 대응 (사업자정보 공용화, 환불정책 보강)

### 1. 사업자정보 공용 컴포넌트화
`src/components/layout/BusinessInfo.tsx` 신설. 값은 전부 `lib/business-info.ts`
한 곳에만 두고 푸터·결제페이지가 같이 사용 (중복 정의 제거).
- `business-info.ts`에 COMPANY_NAME / REPRESENTATIVE / BUSINESS_ADDRESS /
  LANDLINE / CUSTOMER_PHONE / SUPPORT_EMAIL 추가 (ko·en 동시 관리).
- 라벨은 i18n `BusinessInfo` 네임스페이스로 분리, 값+라벨이 한 문자열에
  섞여 있던 기존 Footer 키 7개(companyName/representative/…/email) 제거.
- 결제페이지 하단의 하드코딩 사업자정보 블록 제거 → `<BusinessInfo />`로 교체.
- 결제페이지에 환불정책·이용약관·개인정보처리방침 링크 추가.

### 2. 유선전화 필드
`LANDLINE = ""` + TODO 주석. 값이 비면 해당 줄을 렌더링하지 않음.
070 개통 후 이 상수에만 값을 넣으면 푸터·결제페이지 양쪽에 자동 반영됨
(실제로 임시값을 넣어 ko/en·푸터/결제 4곳 반영 확인 후 되돌림).
기존 010은 `CUSTOMER_PHONE`으로 분리해 "고객문의"로 계속 노출.

### 3. 환불정책 보강 (7개 → 10개 항목)
KCP 부가합의서 제6조의2 반영해 신규 3개 추가 + 기존 1개 수정:
- (신규) 이용일수 비례 환불 — 일할 계산식 명시
- (신규) 환불 수단 — 원결제수단 취소 원칙, 포인트·캐시 단독 환불 금지
- (신규) 요금 변경·유료전환 시 7일 전 사전 고지
- (수정) 구독 해지 항목: 24시간 접수 문구 추가. 기존의 "당월 부분 환불은
  제공하지 않음"은 위 비례환불 조항과 정면 충돌해 삭제함.

### 4. 개인정보처리방침 위탁 고지
`section5Trustee`(단일 문자열) → `section5TrusteeList`(배열)로 변경 후
주식회사 코리아포트원 / 엔에이치엔케이씨피 주식회사 2건 고지. ko·en 반영.

### 5. 대표자 표기
사용자 확인 후 "대표: 성지세" 단독 표기로 통일 (기존 "대표자: 성지세, 강유석").
푸터·결제페이지·이용약관 제14조 전부 반영.

### 검증
- `npx tsc --noEmit`, `npm run build` 통과. ko/en 키 파리티 418/418.
- dev 렌더 확인: 결제페이지 ko/en 사업자정보 노출, 환불정책 10개 항목 ko/en,
  개인정보처리방침 위탁 2건 ko/en, 이용약관 대표 표기, 주소 대하1길 일치.

### 미결 (사람 확인 필요)
- 070 유선번호 미개통 → 사업자정보 6개 항목 중 "전화번호"만 아직 미노출.
- 웹에 구독 해지 UI 없음 (마이페이지·해지 API 부재). 현재는 환불정책의
  이메일 접수 경로로만 충족. 상세는 아래 보고 참조.

## 2026-08-03 — 사업장 주소 정정 (대하2길 → 대하1길)

### 배경
사업자등록증상 정확한 주소는 "대하1길"인데 사이트에는 "대하2길"로 잘못 들어가
있었음. PG 심사에서 사업자등록증과 홈페이지 하단 정보가 일치해야 하므로 정정.

### 정정한 위치 (총 4곳, ko/en 전부)
주소는 `src/lib/business-info.ts`에 **없었고** i18n 메시지에만 하드코딩돼 있었음:
- `messages/ko.json` Footer.address, Terms (제14조 사업자정보 목록)
- `messages/en.json` Footer.address, Terms (동일 위치)

최종 값
- ko: `충청북도 음성군 맹동면 대하1길 4, 2층 204호`
- en: `Room 204, 2nd Floor, 4 Daeha 1-gil, Maengdong-myeon, Eumseong-gun, Chungcheongbuk-do, Korea`

grep 결과 `대하2길` / `Daeha 2-gil` 잔존 0건 (작업지시서 md 제외).

### 함께 고친 별건 버그
`messages/en.json`에 `Privacy.section11Title`이 누락돼 빌드 시
`MISSING_MESSAGE: Privacy.section11Title (en)` 에러가 나고 있었음(기존 문제,
이번 주소 수정과 무관). 본문 리스트(section11List)는 영문으로 있는데 제목만
빠진 상태라 `11. Changes to the Privacy Policy` 추가.
→ ko/en 전체 키 파리티 감사 결과 현재 410 / 410 으로 양방향 누락 0건.

### 검증
- `npm run build` MISSING_MESSAGE 에러 해소 확인.
- dev 서버에서 `/ko|/en` × `pricing(푸터)·terms·privacy` 렌더 확인 —
  주소 4곳 모두 대하1길로 출력, 영문 개인정보처리방침 11장 제목 정상 표기.

## 2026-07-31 — 배포 경로 정리 (죽은 GitHub Actions 삭제, 포트원 env 주석화)

### 실제 배포 타겟 확인
이 레포의 배포는 **Firebase App Hosting**이다.
- 프로젝트 `sniff-by-hatch-app`(.firebaserc), 백엔드 `sniff-web-server`(firebase.json)
- 런타임/빌드 환경변수는 `apphosting.yaml`에서 주입
- 배포 트리거는 레포가 아니라 Firebase 콘솔의 GitHub 연결에 설정돼 있음
- `vercel.json`, `netlify.toml`은 없음. README/과거 지시서의 "Vercel" 언급은
  create-next-app 기본 템플릿 문구와 오기이며 실제 Vercel 설정은 존재한 적 없음.

### 삭제한 워크플로
`.github/workflows/firebase-hosting-merge.yml`,
`.github/workflows/firebase-hosting-pull-request.yml` (Firebase CLI 자동 생성 잔재)

삭제 근거:
- 전체 82회 실행 중 성공은 초기 3회(2026-02-25)뿐, 이후 **79회 연속 실패**.
- 실패 지점이 `npm ci && npm run build` 단계라 배포 스텝까지 가지도 못함.
- 설령 빌드가 통과해도 이 워크플로는 **Firebase Hosting**에 배포하는데
  `firebase.json`에 `hosting` 키 자체가 없어 배포할 대상이 없음 (구조적 no-op).
- 실제 배포 경로(App Hosting)와 무관하므로 삭제해도 배포에 영향 없음.
- 참고: CI 실패의 정확한 원인 로그는 비인증 API로 접근 불가(403)라 미확인.
  로컬에서 `.env.local` 없이도 빌드는 통과하므로 환경변수 문제는 아님.

### apphosting.yaml
포트원 env 3종(`NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`,
`PORTONE_WEBHOOK_SECRET`)을 **주석으로만** 추가. `NEXT_PUBLIC_*`은 빌드 타임에
번들로 인라인되므로 빈 값으로 커밋하면 그 상태로 롤아웃되어 프로덕션이 망가진 채
굳는다. 키 발급 후 주석 해제하고 실제 값 입력할 것. 웹훅 시크릿은 평문 금지 —
Cloud Secret Manager에 등록 후 `secret:` 참조.

## 2026-07-31 — 포트원 정기결제(빌링키) 테스트 연동

### 배경
KPN/하나카드 PG 심사에 "정기결제 카드 등록 + 실제 결제창 노출" 캡처가 필수.
포트원 채널 승인 전이라도 테스트 모드로 흐름을 구현해 캡처를 확보하는 것이 목적.

### 지시서와 실제 구조의 차이 (중요)
작업지시서는 FastAPI 백엔드에 `POST /api/billing/register-key`를 만들라고
했으나, **이 레포에는 FastAPI가 없다** (Next.js + Supabase 단일 구조, Python
코드/의존성/프록시 설정 전무). 사용자 확인 후 **Next.js Route Handler로 구현**.

### 변경 내용
- `@portone/browser-sdk`, `@portone/server-sdk` 설치.
- `src/lib/portone/config.ts`: storeId/channelKey를 환경변수에서 읽음
  (하드코딩 없음). 채널키에 `test`가 포함되면 테스트 모드로 간주해 콘솔 경고.
- `src/components/payment/SubscribeButton.tsx`: "지금 구독하기" 클릭 →
  `PortOne.requestIssueBillingKey({ billingKeyMethod: "CARD", ... })` 호출.
  기존 결제 페이지는 서버 컴포넌트라 버튼만 클라이언트 컴포넌트로 분리.
  비로그인 시 `/auth`로 이동, 실패/취소 시 화면에 에러 메시지 노출(무음 실패 없음).
- `src/app/api/billing/register-key/route.ts`: 발급된 billing_key를
  Supabase `subscriptions`에 upsert.
  **user_id는 요청 본문이 아니라 서버 세션에서 가져온다** — 지시서의
  `{ user_id, billing_key }` 형태를 그대로 쓰면 타인의 user_id로 빌링키를
  덮어쓸 수 있어(IDOR) 의도적으로 바꿈.
- `src/app/api/webhook/portone/route.ts`: `@portone/server-sdk`의
  `webhook.verify`로 서명 검증(raw body 기준). 시크릿 미설정 시 500.
- `supabase/migrations/0001_subscriptions.sql`: subscriptions 테이블 + RLS
  (본인 행만 read/insert/update).
- `.env.example` 신규 + `.gitignore`에 `!.env.example` 예외 추가.

### 검증
- `npx tsc --noEmit`, `npm run build` 통과. `/api/billing/register-key`,
  `/api/webhook/portone` 라우트 정상 등록 확인.
- dev 서버: 미인증 상태 register-key 호출 → 401 `UNAUTHORIZED` (i18n 미들웨어가
  API 경로를 가로채지 않음 확인). 웹훅은 시크릿 미설정 시 500.
- **미검증**: 실제 포트원 결제창 노출 / 카드 등록 / 하나카드 결제창 단계는
  포트원 콘솔 키(storeId, channelKey)가 아직 없어 확인 불가.
  `.env.local`에 키를 채우면 바로 동작하도록 코드는 완성된 상태.

### 남은 작업 (사람이 해야 함)
1. 포트원 콘솔에서 테스트 채널 발급 → `.env.local`에 STORE_ID/CHANNEL_KEY 입력.
2. 테스트 채널에 **하나카드 포함 여부 확인** (미포함 시 포트원에 추가 요청).
3. Supabase에 `0001_subscriptions.sql` 적용.
4. 결제창 흐름 캡처 (카드등록 진입 → 카드정보 입력 → 본인인증 → 등록완료).

## 2026-07-30 — 결제 페이지 KB 에스크로 이체 인증마크 추가

### 변경 내용
- `src/components/layout/KBAuthMark.tsx` 신규 생성: KB에서 제공한 원본
  `<script>`/`<form>` 기반 팝업 인증마크 스니펫을 React 클라이언트 컴포넌트로
  변환. `document.KB_AUTHMARK_FORM` 대신 `useRef`로 폼을 참조해 제출하고,
  팝업 오픈 로직은 `onClick` 핸들러(`handlePopKBAuthMark`)로 이전. 폼 값
  (page/cc/mHValue)은 KB가 발급한 원본 값 그대로 유지 (변경 시 인증 무효화 우려).
- 업데이트된 작업 지시서(WORK_ORDER_footer_business_info (1).md)에 따라
  **푸터가 아닌 `/ko/payment` 결제 버튼 하단**에만 `<KBAuthMark />` 배치
  (결제 직전 안전거래 인증 확인용).
- (2).md 반영: 마크를 흰색 원형 배지(`rounded-full`, `p-3`,
  `shadow-[0_1px_3px_rgba(0,0,0,0.08)]`)로 감싸 카드 톤과 어울리도록 처리
  (마크 이미지 자체는 원본 그대로 유지).

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
