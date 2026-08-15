
# PROGRESS

## 2026-08-15 — 포트원 실연동(live) 채널 전환 및 결제페이지 심사 요건 보완

### 변경 내용
- `apphosting.yaml` — `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` 를 실연동 채널(sniff_Web)
  키로, `NEXT_PUBLIC_PORTONE_MODE` 를 `test` → `live` 로 **함께** 교체.
  storeId 는 채널 상위 개념이라 변경 없음. KCP SITE KEY 는 포트원 콘솔에만
  입력하며 저장소에 넣지 않는다 (`NEXT_PUBLIC_*` 금지).
- `/test-payment` 라우트 삭제. 주문명 "PG 심사용 테스트 결제" / 금액 1,000원이라
  심사원이 URL을 발견하면 반려 사유가 되고, 실연동 전환 후에는 존재 자체가 실제
  과금 위험이다. 프로덕션 코드에 이 경로로 향하는 링크는 없었다.
- 결제페이지에 자동갱신 고지 문구 추가 (13px / slate-700, 결제 버튼 바로 위).
  해지 경로를 `/account/subscription` 링크로 연결. 구독 상태와 무관하게 노출된다.
- KB에스크로 인증마크 제거. 디지털 콘텐츠 구독은 에스크로 의무 대상이 아니고,
  링크가 `href="#"` 로 죽어 있었다. 추가로 마크 이미지가 `http://img1.kbstar.com`
  평문 HTTP라 HTTPS 페이지에서 mixed content 로 차단되는 상태였다.
  `KBAuthMark.tsx` 파일 자체는 미사용 상태로 남겨 뒀다 (되돌리기 쉽게).
- `/sniff` 히어로에 "Premium 구독하기" CTA 추가 → `/payment` 직행.
  기존 "시작하기" 는 비로그인 시 `/pricing` 으로 우회해서, 등록 사이트주소
  (inovaai.ai/ko)에서 결제페이지까지 4단계였다. 기존 동선은 건드리지 않았다.

### 검증 (프로덕션 inovaai.ai, 배포 후)
- 실연동 채널키가 배포된 클라이언트 번들에 인라인됨. 구 테스트 채널키
  (`...c79f4965...`)는 서빙되는 청크에서 완전히 사라짐.
- `/ko/test-payment` → **HTTP 404** (삭제 확인).
- 자동갱신 문구: 데스크톱(1440px)·모바일(iPhone 13) 양쪽 노출 확인.
  computed `font-size: 13px`, 결제 버튼보다 위에 위치, "구독 관리" 링크 동작.
- ko/en 메시지 키 파리티 일치, `MISSING_MESSAGE` 0건.
- KB에스크로 마크 마크업 잔재 0건.

### 미검증 / 남은 작업
- **결제창 URL·상점명(체크사항 5번)은 확인하지 못했다.** `/test-payment` 삭제
  후 결제창을 여는 유일한 경로가 `/payment` 의 "지금 구독하기" 인데,
  `SubscribeButton` 이 비로그인 사용자를 `/auth` 로 보낸다 (Playwright 로 실제
  클릭해 `https://inovaai.ai/ko/auth` 리다이렉트 확인). 심사용 계정
  (`review@inovaai.ai`) 로 로그인해야 결제창까지 도달 가능 —
  계정 생성은 사용자가 직접 수행 예정.
  확인할 것: 결제창 호스트가 `testspay.kcp.co.kr` 가 **아닐 것**,
  상점명이 `이노바에이아이_자동결제` 일 것.
- 실결제·환불 테스트는 수행하지 않았다 (사용자가 직접 수행).
- `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET` 여전히 미발급/미등록.
  PG-API 인증서·개인키·정기자동결제 그룹아이디 미발급이라 현재 구현 가능한
  범위는 빌링키 발급(카드 등록)까지다.

## 2026-08-09 — KCP 테스트 결제창 호출 검증 및 배포 (PG 심사용)

### 배경
포트원 안내상 PG사·카드사 입점심사를 통과하려면 결제페이지와 결제모듈 호출이
실제로 구현돼 있어야 하고, 심사관이 접근 가능한 URL이 필요하다.

### 연동 모드 판별 방식 교체
기존 `isPortOneTestMode()` 는 `channelKey.includes("test")` 로 판별했는데,
PortOne V2의 채널 키는 `channel-key-{UUID}` 고정 형식이라 test/live 구분자가
아예 없다. 항상 부정확한 검사였고, 실제로 테스트 채널을 "LIVE — 실제 결제됨"
으로 잘못 표시하고 있었다.

`NEXT_PUBLIC_PORTONE_MODE` 환경변수로 명시하도록 교체했다. **미설정 시 실결제로
간주**한다 — 값을 빠뜨렸을 때 실결제 채널이 "TEST"로 보이는 쪽이 그 반대보다
위험하기 때문이다.

### 변경 내용
- `src/app/[locale]/test-payment/page.tsx` 신규. storeId·channelKey·연동 모드·
  결제 금액(1,000원)을 화면에 그대로 노출해 어떤 채널로 호출되는지 눈으로 확인 가능.
  심사 통과 후 제거할 임시 페이지라 다국어 키는 추가하지 않고 한국어 문자열 직접 사용.
- `src/lib/portone/config.ts` — 위 모드 판별 교체.
- `apphosting.yaml` — 통째로 주석 처리돼 있던 포트원 블록에서 `STORE_ID`,
  `CHANNEL_KEY`, `MODE=test` 주석 해제. 이 셋이 없으면 배포된 페이지에서 결제창이
  뜨지 않는다. `PORTONE_API_SECRET`·`PORTONE_WEBHOOK_SECRET` 은 Secret Manager
  등록 전이라 주석 유지 (참조만 풀면 배포가 실패한다).

### 검증
- `npm run build` 통과. `/ko/test-payment`, `/en/test-payment` SSG 프리렌더.
- 로컬 + **프로덕션(inovaai.ai)** 양쪽에서 Playwright(headless Chromium)로
  실제 버튼 클릭까지 확인:
  - `https://inovaai.ai/ko/test-payment` → HTTP 200
  - 모드 표시 `TEST`, 금액 `1,000원`
  - 결제창 iframe: `pg/kcp-v2/payment/general/...` (KCP V2 연동 확인)
  - 결제창 iframe: `testspay.kcp.co.kr/cardMethod.do` — **KCP 테스트 서버**
    (실서버 `smpay` 아님). 실제 출금 없음.
  - 결제창 헤더 `[ TEST ] NHN KCP`, 카드사 선택·약관 동의 정상 렌더
  - 콘솔 에러 0건
- 배포는 main push 후 약 100초 만에 롤아웃 완료.

### 미검증 / 남은 작업
- **카드번호 입력 이후 결제 승인은 진행하지 않았다.** 승인까지 가면 웹훅 →
  `web_subscriptions` 반영 경로가 엮이는데 그쪽은 아직 미검증이다.
- `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET` 미발급/미등록.
  승인 이후 웹훅 검증과 `src/lib/portone/server.ts` 의 빌링키·카드정보 조회는
  이 값들이 있어야 동작한다.
- 실연동 전환 시 `apphosting.yaml` 의 `CHANNEL_KEY` 와 `MODE` 를 **함께** 바꿔야
  한다. 하나만 바꾸면 표시와 실제가 어긋난다.
- `/test-payment` 는 심사 통과 후 제거 예정. robots.txt·sitemap 이 없고 이 페이지로
  향하는 내부 링크도 없어 크롤링 노출 위험은 낮지만, 오래 둘 거면 noindex 검토.

## 2026-08-05 — 웹 정기결제를 web_subscriptions 로 분리

### 배경
`public.subscriptions` 는 Sniff 앱 구독 게이트가 이미 쓰던 테이블이었다
(provider / product_id / external_subscription_id 등 앱스토어용 컬럼, 실사용 2건).
0001은 `create table if not exists` 라 no-op 이었고, 0002만 앱 테이블에
컬럼 5개·인덱스 1개·status CHECK 제약을 추가해 오염시켰다. CHECK 제약은
앱이 'expired'·'trial' 등을 쓰면 앱 구독 처리를 깨뜨릴 수 있어 수동 드롭 완료.

### 같은 테이블을 쓸 수 없었던 이유
1. `register-key` 의 upsert(onConflict: user_id)가 앱 구독 행을 덮어씀
2. 기존 유니크는 `(user_id) WHERE status='active'` 부분 유니크라
   `onConflict: "user_id"` 가 대상 제약을 못 찾아 런타임 실패
3. 앱·웹 구독 공존 시 `.maybeSingle()` 이 다중 행에서 깨짐

### 조치
- `0003_web_subscriptions.sql` 신설: 웹 전용 `public.web_subscriptions`.
  user_id **단독** 유니크(부분 유니크 아님)로 upsert 정상 동작 보장,
  status CHECK(active/cancel_scheduled/canceled), RLS 3정책, 해지예약 부분 인덱스.
- `0004_revert_subscriptions_pollution.sql` 작성(**실행 보류**): 0002가 앱 테이블에
  남긴 컬럼·인덱스 제거. 앱 백엔드가 해당 컬럼을 이미 쓸 가능성이 있어 상단에
  경고와 확인 방법을 명시했고 승인 전까지 실행하지 않는다.
- 코드 5곳을 `web_subscriptions` 로 전환 (`from("subscriptions")` 잔존 0건).
- 0001·0002 상단에 "의도대로 적용되지 않았음 / 실행하지 말 것" 헤더 추가.

### 앱 구독과의 관계 (4번 조사)
웹에는 **구독 여부로 기능을 잠그는 로직이 없다.** `getSubscriptionForUser` 사용처는
결제페이지(버튼 분기), 구독관리 페이지(상태 표시), 해지·해지취소 API뿐이고
AI 분석 등 실제 프리미엄 기능은 앱(별도 레포)에 있다. 따라서 두 테이블을 OR로
확인할 필요가 현재는 없다. 다만 웹에 프리미엄 기능이 생기면 그 시점에
앱 구독(subscriptions)과 웹 구독(web_subscriptions)을 함께 봐야 한다.

### 검증
- 빌드·타입체크 통과, `from("subscriptions")` 0건.
- **테이블 부재 상태에서도 안전**: 0003 실행 전 배포되어도 조회 실패가 null 로
  처리되어 `/ko|/en/payment`, `/account/subscription` 모두 200, 결제 버튼 정상 노출.


## 2026-08-04 — 070 유선전화 반영 (심사 필수 6개 항목 완비)

`lib/business-info.ts`의 `LANDLINE`에 `070-4136-7975` 입력, TODO 주석 제거.
값만 채우면 되도록 설계해둔 대로 코드 변경은 이 한 줄뿐이다.

### 반영 확인
ko/en × 푸터·결제페이지 4곳 모두 노출 확인.
카드사 심사 필수 6개 항목이 결제페이지에서 전부 채워졌다:
상호 / 사업자등록번호 / 대표자명 / 사업장주소 / **전화번호(유선)** / 통신판매업신고번호.
기존 010은 `CUSTOMER_PHONE`으로 "고객문의" 줄에 그대로 유지.

### 검증 중 걸린 함정
로컬 검증에서 4곳 모두 미노출로 나와 잠깐 코드 문제로 보였으나, 원인은
이전 `npm start` 프로세스가 3000 포트를 잡고 있어(`EADDRINUSE`) 새 서버가
뜨지 못하고 **구버전 빌드가 응답**한 것이었다. 프로세스 정리 후 정상 확인.
빌드 산출물(`.next`)에는 번호가 박혀 있는데 응답에는 없다는 불일치로 발견.


## 2026-08-04 — 배포 중단 원인 규명 및 복구 (락파일 깨짐)

### 증상
프로덕션(inovaai.ai)에 08-03 이후 커밋이 하나도 반영되지 않음.
$4.99 가격, "대표: 성지세, 강유석" 등 구버전 내용이 그대로 노출.

### 진단
프로덕션 HTML의 마커(`Daeha 2-gil`, `Representatives:` 복수형, KB 배지 wrapper 유무)로
배포 시점을 **99adf89(07-30 빌드 004)** 로 특정. Cloud Run 리비전 목록도
`sniff-web-server-build-2026-07-30-004`가 마지막.

App Hosting REST API로 롤아웃 133건을 조회한 결과 **07-31 이후 전부 FAILED**
(마지막 성공 rollout-2026-07-30-004). Cloud Build 로그:

```
npm ci can only install packages when your package.json and package-lock.json are in sync.
Missing: @swc/helpers@0.5.23 from lock file
```

### 근본 원인
`next-intl`이 끌어오는 `@swc/core@1.15.43`의 peerDependency가
`@swc/helpers >=0.5.17`인데, 락파일에는 next가 고정한 `0.5.15`만 있고
peer를 충족하는 항목이 없었다. 07-31 포트원 SDK 설치(`npm install @portone/...`)
당시 npm이 `"added 2 packages, removed 1 package"`를 출력했는데 그 removed가
`@swc/helpers`였고, package.json diff만 확인하고 락파일을 검증하지 않아 놓쳤다.

로컬 npm 11.8은 이 peer 불충족을 허용해 `npm ci`·빌드가 모두 통과했고,
빌더의 npm(Node 20 이미지)은 엄격해서 실패했다 — 로컬에서 재현되지 않은 이유.

### 조치
`package-lock.json` 전체 재생성(`rm package-lock.json && npm install`).
`node_modules/next-intl/node_modules/@swc/helpers@0.5.23` 항목이 추가되어
빌더가 요구하던 상태가 됐다. 백업 락파일에 `npm install --package-lock-only`를
돌리는 최소 수정도 시도했으나 같은 이유로 항목이 추가되지 않아 재생성을 택했다.

부작용: 범위(^) 내 패치·마이너 상승 — next-intl 4.13.2→4.13.5,
@supabase/ssr 0.12.1→0.12.4, supabase-js 2.110.3→2.112.0, tailwindcss 4.3.2→4.3.3.
next·react·react-dom·포트원 SDK는 변동 없음. package.json은 무변경.

### 함께 처리
- `Pricing.freePrice`: `₩0`/`KRW 0` → `무료`/`Free` (지시)
- 가격 하드코딩 전수 검사: .tsx/.ts 0건, messages 달러 표기 0건
- 대표자: 저장소는 이미 "대표: 성지세" 단독. 남은 "강유석" 2건은
  **저작권자**(등록 C-2026-013694)와 **개인정보보호책임자**로 대표자와 무관해 유지.

### 검증
- 로컬 프로덕션 빌드(`npm start`)로 ko/en 28개 페이지 fetch → 달러 표기 **0건**.
- `/ko|/en/payment` 사업자정보 5개 항목(상호·대표·사업자등록번호·주소·통신판매업신고번호)
  + 고객문의·이메일 노출. 전화번호는 070 미개통으로 조건부 숨김. 구버전 블록 0건.
- `rm -rf node_modules && npm ci` → 정상, 빌드·타입체크 통과, 키 파리티 446/446.


## 2026-08-04 — 심사 대비 정리 (/product 삭제, 출시 전 서비스 메뉴 숨김)

### 1. /product 라우트 삭제
`src/app/[locale]/product/` 제거. 플레이스홀더 박스 3개 + Unsplash 스톡 이미지 +
i18n 미적용(ko에서도 영어) 상태라 "사이트 100% 완성" 항목에 걸렸다.
`Product` i18n 네임스페이스는 **애초에 존재하지 않았고**(전부 하드코딩이었음)
다른 곳에서의 참조도 0건이라 삭제만으로 정리됐다. ko/en 모두 404 확인.

### 2. 출시 전 서비스 메뉴 숨김 (환경변수 토글)
`src/lib/upcoming-services.ts` 신설. `NEXT_PUBLIC_SHOW_UPCOMING_SERVICES`가
`'true'`일 때만 노출하고 **미설정이 곧 숨김**이다 — NEXT_PUBLIC_은 빌드타임에
인라인되므로 값을 비운 채 배포해도 안전한 쪽이 기본값이어야 한다.
따라서 apphosting.yaml에는 값을 넣지 않고 주석으로만 자리를 잡아뒀다.

적용 지점 (지시서의 네비/푸터 + **홈 서비스 카드**):
- 네비바 데스크톱·모바일: `links` 배열을 `filterVisibleServices()`로 필터
- 푸터: 하드코딩 `<li>` 5개를 같은 배열 구조로 바꾼 뒤 동일 필터 적용
- **홈 서비스 카드**: 지시 범위 밖이었으나, 심사원이 가장 먼저 보는 화면에서
  3개 카드의 "더 알아보기"가 그대로 COMING SOON으로 연결돼 숨김 목적이
  무력화됐다. 카드 자체는 남기고 **링크만** 조건부로 처리 —
  사업 범위 소개는 유지하면서 미완성 페이지 유입만 차단.

라우트는 유지되어 URL 직접 접근은 계속 가능하다.

### 검증
- `/ko|/en/product` → 404. 라우트 목록에서 제거 확인.
- 홈·pricing·payment·about × ko/en 전 조합에서 3개 서비스 링크 **0개**.
- `/ko|/en/fem-ai`, csv-automation, sniff-hospital 직접 접근 → 200.
- 토글을 `true`로 두면 링크 9개 복구(네비 데스크톱 3 + 푸터 3 + 홈 카드 3,
  모바일 메뉴는 열기 전이라 SSR HTML 미포함) → 원복 경로 확인 후 되돌림.
- 빌드·타입체크 통과, 키 파리티 446/446.

### 참고
`.env.example`에 `PORTONE_API_SECRET`도 함께 문서화했다(구독 해지 기능에서
이미 사용 중인데 누락돼 있었음). apphosting.yaml에도 `secret:` 참조 형태로 주석 추가.


## 2026-08-04 — 카드사 심사 대비 사이트 전수 점검

점검 목적. 명백한 오타·깨진 링크만 수정하고 판단 필요 건은 보고만 했다.

### 수정한 것 (2건)
- `auth/page.tsx`: 회원가입 동의 문구의 이용약관·개인정보처리방침 링크가
  `href="#"`로 죽어 있었다. `/{locale}/terms`, `/{locale}/privacy`로 연결.
  전자상거래법상 가입 시 약관 접근이 필요하고 심사원이 가입 흐름에서 바로 본다.
- `messages/en.json`: 영문 가격이 `$4.99`로 남아 있었다(어제는 RefundPolicy만
  수정됨). 실제 청구는 KCP를 통한 ₩3,300이라 영문 페이지가 실청구액과 달랐다.
  Payment.price / Pricing.premiumPrice / Pricing.freePrice를 KRW로 통일.

### 보고만 한 것 (수정 안 함)
- `/product`: 전체 하드코딩 영어(i18n 미적용, ko에서도 영어 노출) +
  "Image Analysis Visualization" 등 빈 플레이스홀더 박스 3개 + Unsplash 스톡
  이미지. 어디서도 링크되지 않는 고아 페이지지만 URL 직접 접근은 가능.
- `/fem-ai`, `/csv-automation`, `/sniff-hospital`: 화면 전체를 덮는
  "COMING SOON" 오버레이(`fixed inset-0`). 세 서비스 모두 네비바·푸터에
  링크돼 있어 심사원이 클릭하면 바로 보인다.
- Apple 로그인: 과거 커밋에서 "revoked" Apple 키를 제거했는데 재설정 여부
  미확인. 미재설정이면 가입 수단 2개 중 1개가 실패한다.

### 점검 결과 이상 없던 항목
- 라우트 18개 ko/en 전부 200, 빈 페이지 없음.
- 내부 링크 전부 실존 라우트를 가리킴. 죽은 `#` 링크는 위 auth 2건이 전부였고
  KBAuthMark의 `href="#"`는 onClick 팝업용 정상 패턴.
- 필수 문서(약관·개인정보·환불정책·사업자정보) ko/en 양쪽 도달 가능.
- "가격문의/전화문의/0원" 등 심사 불가 표현 없음.
- 빌드 경고 0건, MISSING_MESSAGE 0건, 타입체크 통과.


## 2026-08-04 — 구독 관리 페이지 및 해지 기능 구현

### 배경
웹에 해지 수단이 없어 KCP 부가합의서 제6조의2 2항 미충족, 이용약관 제11조 ③의
"서비스 내 관리 화면"과 구현 불일치, 등록은 웹/해지는 이메일이라는 다크패턴
소지가 있었음.

### 빌링키 삭제 시점 — 종료일까지 유지하기로 결정
포트원 V2 SDK(`payment.billingKey.deleteBillingKey`)에는 **예약 삭제가 없다.**
해지 신청 즉시 삭제하면 해지 취소 시 카드 재등록이 필요해져 요건("종료일 전까지
언제든 해지 취소")과 충돌한다. 따라서:
- 해지 신청 시점: 빌링키 **보관**, status만 `cancel_scheduled`
- 이용 종료일 도달 시: 빌링키 삭제 + status `canceled` + billing_key null
자동청구 스케줄러가 아직 없어 보관 자체로 인한 과금 위험은 없다.
**추후 정기청구 잡을 만들 때 반드시 `cancel_scheduled`를 건너뛰어야 한다.**

### 스케줄러 없이 상태 전이 처리
크론 인프라가 없어 **접근 시점 체크**로 구현했다. `lib/subscription.ts`의
`getSubscriptionForUser()`가 구독을 읽을 때마다 `cancel_scheduled`이고
`service_end_date`가 지났으면 그 자리에서 `canceled`로 전환하고 빌링키를 지운다.
구독 페이지·해지·해지취소 API 모두 이 함수를 거치므로 어느 경로로 들어와도
동일하게 정리된다. 한계: 아무도 접근하지 않으면 DB상 전이가 지연된다(과금은
없으므로 실질 영향 없음). 추후 크론 도입 시 같은 함수를 재사용하면 된다.

### 추가/변경 파일
- `supabase/migrations/0002_subscription_cancellation.sql`:
  canceled_at, service_end_date, started_at, card_brand, card_number_masked 추가.
  status CHECK 제약(active/cancel_scheduled/canceled) + 부분 인덱스.
- `src/lib/portone/server.ts`: 포트원 서버 클라이언트, 빌링키 삭제/카드정보 조회.
  API Secret 미설정 시 null 반환해 호출부에서 구분 처리.
- `src/lib/subscription.ts`: 구독 조회 + 만료 정리 공용 로직.
- `src/app/api/billing/cancel-subscription/route.ts`,
  `.../resume-subscription/route.ts`: 두 핸들러 모두 **인자를 받지 않는다**
  (`export async function POST()`). 요청 본문을 읽을 수 없으므로 body로
  타인 user_id를 넘기는 공격이 구조적으로 불가능하다.
- `src/app/[locale]/account/subscription/page.tsx` + `components/account/
  SubscriptionManager.tsx`: 상태별 분기, 확인 모달, 해지 취소.
- `register-key`: next_billing_date(+1개월)·카드정보·started_at 저장하도록 보강.
- 진입 경로 3곳: 네비바(데스크톱·모바일, 로그인 시), 결제페이지(구독 중이면
  결제 버튼 대신 [구독 관리하기]), 푸터.
- 환불정책 item2: 해지 경로를 웹 [구독 관리] 우선 + 이메일 병기로 갱신.

### 다크패턴 방지
확인 1회만, 설문·리텐션 오퍼 없음, [돌아가기]/[해지 신청] 두 버튼을 같은 크기·
같은 비중으로 배치, 해지 진입점을 네비바·결제페이지·푸터 3곳에 노출.

### 검증
- 빌드·타입체크 통과, ko/en 키 파리티 446/446, 4개 라우트 등록 확인.
- 미인증 cancel/resume → 401. body에 타인 user_id 넣어도 401(본문 자체를 읽지 않음).
- 미로그인 `/ko/account/subscription` → 307 `/ko/auth` 리다이렉트.
- **미검증**: 로그인 상태의 실제 해지→예약→취소 흐름과 DB 상태 전이.
  마이그레이션 0002 미적용 + 포트원 API Secret 미발급이라 실행 불가.

### 이용약관 정합성
제11조 ③("서비스 내 관리 화면 또는 앱마켓 구독 관리, 또는 고객센터")이 이제
실제 구현과 일치. 제11조 ④(결제주기 종료일까지 이용권한 유지, 다음 주기부터
미결제)도 이번 구현과 정확히 일치해 수정 불필요.

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
