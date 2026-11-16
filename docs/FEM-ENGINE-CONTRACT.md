# FEM 엔진 연동 계약 (inovaaiweb ↔ FEM 워커)

2026-11-16 개정. 이전 판(multipart 단일 제출, mixed/quadratic/cm/m, Aspect Ratio 지표)은 실제 엔진과
맞지 않아 폐기했다. 워커 쪽 원문: `FEM-Worker/README.md`, `FEM-Worker/docs/DESIGN.md`.

## 상태 (과장 금지)

| 항목 | 상태 |
|---|---|
| 웹 서버 로직 ↔ 로컬 워커 ↔ 실제 엔진 | 통합 시험 통과 (`npm run test:fem`, 저장소는 시험용 메모리 구현) |
| 실제 세션(일회용 로컬 Supabase 2개: 기본·FEM 전용) → 웹 API → 로컬 워커 → 실제 엔진 | 시험 통과 (`tests/fem/session-e2e.test.mjs`, 9개) |
| FEM 전용 Supabase 프로젝트 | **없음** — 만들지 않았다(유료 자원, 별도 승인). 코드는 설정이 없으면 FEM 로그인·실행을 모두 막는다 |
| Google·Apple OAuth 실제 왕복, 로그인 성공 후 FEM 복귀, 실제 Supabase 프로젝트 대상 시험 | **미실시** |
| FEM 계정의 구독 결제 연결 | **없음** — 설계 단계. 지금 코드로는 FEM 계정이 구독 상태가 될 경로가 없다(전원 403) |
| FEM AI Pro 신규 판매 | **중지** — 화면·결제 페이지·등록 API에서 막음(아래 "FEM 신규 결제 차단") |
| 클라우드 워커(객체 저장소 직접 업로드, Cloud Run) | **미실시** — 자원 없음 |
| Abaqus 실제 솔버 검증 | **미실시** |
| FEM 프로젝트 스키마 `supabase-fem/migrations/0001_fem_core.sql` 적용 | **미적용** (프로젝트 없음, 별도 승인) |

## 환경변수 — 워커 (서버 전용, `NEXT_PUBLIC_` 금지)

- `FEM_ENGINE_URL` : 워커 기본 URL
- `FEM_ENGINE_API_KEY` : 워커 인증키 (Secret Manager). **둘 다** 있어야 "설정됨"이다.
  키 없이 워커를 호출하는 경로는 없다.

둘 중 하나라도 없으면 웹은 `503 ENGINE_NOT_CONFIGURED`를 돌려주고 작업 행도 만들지 않는다
(기능 차단 스위치로 쓸 수 있다). 화면은 "엔진 미연결" 상태의 기존 프리뷰 문구로 돌아간다.

## 환경변수 — FEM 전용 Supabase 프로젝트

- `NEXT_PUBLIC_FEM_SUPABASE_URL`, `NEXT_PUBLIC_FEM_SUPABASE_ANON_KEY` : 공개 식별자(BUILD + RUNTIME).
- `FEM_SUPABASE_SERVICE_ROLE_KEY` : 서버 전용 시크릿(RUNTIME, Secret Manager). 기본 프로젝트의 `SUPABASE_SERVICE_ROLE_KEY`와 다른 키다.

URL·anon 키가 없거나, URL이 기본 프로젝트(`NEXT_PUBLIC_SUPABASE_URL`)와 같으면 "미설정"이다(`src/utils/supabase/fem-config.ts`).
미설정이면 FEM 로그인 화면은 "준비 중"을 보여 주고 FEM API는 `503 FEM_AUTH_NOT_CONFIGURED`다. 기본 프로젝트로 대신 붙지 않는다.

## 로그인과 계정 (FEM 회원은 FEM 전용 Supabase 프로젝트에서 따로 관리)

2026-11-16 사용자 결정: FEM 회원을 Sniff와 따로 관리한다(FEM 전용 Supabase 프로젝트, 로그인 방식은 Google·Apple 그대로).
직전의 "기존 Supabase Auth 그대로 사용" 구현을 이 결정으로 바꿨다.

- FEM 회원 = FEM 프로젝트의 `auth.users`. 기본(Sniff·결제) 프로젝트의 계정과 사용자 ID가 무관하고, 자동으로 연결·병합하지 않는다.
  Sniff에 로그인해 있어도 FEM에는 따로 로그인(처음이면 가입)해야 한다. 한 브라우저에 두 세션이 함께 있을 수 있다.
- 코드: `src/utils/supabase/fem.ts`(서버·service role 클라이언트), `fem-config.ts`(설정, 세션 쿠키 이름 `sb-fem-auth-token` 고정),
  `src/app/actions/fem-auth.ts`(Google·Apple 로그인, 로그아웃), `src/app/[locale]/fem-ai/auth/page.tsx`, `…/auth/callback/route.ts`.
  기존 로그인 코드(`src/app/actions/auth.ts`, `src/app/[locale]/auth/page.tsx`, `src/utils/supabase/{server,client,admin}.ts`)는 그대로다.
- 로그인 동선: FEM 화면 → `/{locale}/fem-ai/auth` → FEM 프로젝트의 OAuth → `/{locale}/fem-ai/auth/callback` → `/{locale}/fem-ai#mesh-workspace`.
  성공·실패 이동 경로는 고정이며 쿼리·쿠키로 받지 않는다(외부 이동 불가). 실패는 `/{locale}/fem-ai/auth?error=failed`.
- 세션 갱신: `src/utils/supabase/middleware.ts`가 FEM 세션 쿠키가 있는 요청에서만 FEM 세션을 갱신한다(없으면 기존 동작 그대로).
- 이것은 **로그인(계정 확인)** 이며 휴대폰·실명 본인인증이 아니다 — 화면에도 그렇게 쓰지 않는다. 비밀번호 가입 기능은 없다.
- 비로그인: 소개·지원 범위·설정 화면은 볼 수 있다. 업로드·실행·조회·다운로드는 서버가 401로 거절한다.
- 로그인 화면으로 가면 선택한 파일은 유지되지 않는다(안내 문구 있음). 로그인 전에 업로드하거나 브라우저 저장소에 CAD를 두지 않는다.
- 서버 검사 위치: 모든 FEM API가 `src/lib/fem/server.ts::femContext()`를 지난다 — FEM 프로젝트 설정 → FEM 세션 확인(`auth.getUser()`) →
  FEM 구독(`fem_subscriptions`, `src/lib/fem/membership.ts`) → 워커 설정. 사용자 ID는 여기서 얻은 값만 쓰고(요청 본문·쿼리·헤더의 ID는
  읽지 않는다), DB 조회는 `user_id`로 한정하며, 워커 호출의 `X-Fem-User-Id`도 이 값이다. 워커는 그 ID가 작업 소유자와 다르면 404를 준다.
  기본 프로젝트의 세션·`web_subscriptions`는 FEM 권한으로 보지 않는다.
- 화면은 로그인(FEM 계정 표시, FEM 로그아웃) / FEM 구독 / 이번 달 이용 / 엔진을 따로 표시한다. 가입·로그인만으로 구독이나 실행 횟수가
  생기지 않는다. **무료 체험 횟수는 없다**(정해지면 별도 구현).
- 웹에는 취소·삭제 API를 두지 않았다(워커에는 있고 소유권 검사를 한다).
- 기존 로그인 콜백(`src/app/[locale]/auth/callback/route.ts`)은 `next` 쿼리를 더 이상 받지 않는다(이전에는 검사 없이 origin 뒤에 붙여
  `@host` 등으로 외부 이동이 가능했다. 저장소 안에 `next`를 넘기는 호출부는 없었다).

### 미해결 — 운영 적용 전에 정해야 한다

1. **FEM 구독 결제 연결.** 결제·웹훅·정기결제·해지·계정 화면은 전부 기본 프로젝트의 계정과 `web_subscriptions`를 쓴다. 그 경로로 FEM을 팔면
   Sniff 계정에 구독이 생기고 FEM 계정에는 권한이 생기지 않으므로 **FEM 신규 판매를 막았다**(아래). 결제·웹훅·정기결제 로직 자체는 바꾸지 않았다.
   `fem_subscriptions` 표는 FEM 결제 연결 전까지의 임시 형태다.
   기본 프로젝트에 기존 FEM 구독이 있는지는 확인하지 못했다 — 있다면 분리 후 "요금은 나가는데 FEM을 못 쓰는" 상태가 되므로 운영 적용 전 확인이 필요하다.
2. 기본 프로젝트의 `fem_jobs`(마이그레이션 `0011`, 운영 미적용)는 이제 쓰지 않는다. `0011`의 구독 다중 플랜 부분은 결제 코드가 쓴다.
3. FEM 프로젝트 생성, Google·Apple 제공자 등록(Apple은 서비스 ID·키 필요), 리디렉션 허용 URL에 `/{ko|en}/fem-ai/auth/callback` 추가,
   환경변수·시크릿 등록.
4. 약관·개인정보처리방침에 FEM 계정을 따로 보관한다는 내용 반영 여부.

## FEM 신규 결제 차단 (FEM 계정용 결제 연결 전)

판정은 `src/lib/billing/sales.ts::decideNewSale()` 한 곳: plan 없음·`sniff_premium` → 판매, `fem_pro` → 판매 중지, 그 밖의 값 → 알 수 없음.
판매 중지·알 수 없는 값을 Sniff 플랜으로 바꿔 처리하지 않는다.

| 진입점 | 처리 |
|---|---|
| FEM 소개(`fem-ai/page.tsx`) 구독 버튼 | 링크 제거, "결제 준비 중" 표시 |
| FEM 작업 화면(`FemWorkspace.tsx`) 구독 안내 | 링크 없음, 준비 중 문구 |
| 요금 화면(`pricing/page.tsx`) FEM 카드 | 비활성 버튼 + 안내. Sniff 구독 링크는 그대로 |
| 구독 화면(`SubscriptionManager.tsx`) | "FEM Pro 구독하기"·종료된 FEM의 "다시 구독하기"·미납 FEM의 "새 카드로 결제" 링크 제거 후 안내. 해지·해지 취소 버튼은 그대로 |
| `/{locale}/payment?plan=fem_pro` 직접 접근 | 결제 SDK가 없는 `/{locale}/payment/unavailable?plan=fem_pro`로 이동(다른 쿼리는 버린다). 기존 FEM 구독이 있는 계정에는 구독 관리 링크 |
| `/{locale}/payment?plan=<알 수 없는 값>` | 같은 안내 경로(`plan=unknown`). Sniff 결제 화면으로 보여 주지 않는다 |
| `SubscribeButton` | 판매 중이 아닌 plan이면 결제 SDK·등록 API를 부르지 않는다(이중 방어) |
| `POST /api/billing/register-key` | `fem_pro` → `403 PLAN_NOT_ON_SALE`, 알 수 없는 값 → `400 INVALID_PLAN`. 포트원 호출·DB 쓰기 전 |
| `chargeInitialSubscription()` | 같은 판정을 한 번 더(포트원 호출 전) |
| 로그인 완료 화면(`auth/success`), FEM 로그인 화면 | FEM 결제 링크 없음(확인) |

막지 않은 것(기존 계약 처리): `cancel-subscription`, `resume-subscription`, 정기결제 배치, 웹훅.

## 지원 범위

| 항목 | 값 |
|---|---|
| 요소 전략 | `hex` → 엔진 `hex_priority`(hex8 + wedge6), `tet` → 엔진 `tet_only`(tet4 100%). `mixed` 미지원 |
| 요소 차수 | 1차만. 2차(`quadratic`) 미지원 |
| 단위 | mm만. STEP은 엔진이 mm로 읽고 BREP은 단위 정보가 없어 좌표 그대로. 변환 없음 |
| 파일 | `.step` `.stp` `.brep`, 1 ~ 52,428,800바이트(50 MiB — 엔진의 바이트 비교값과 같다) |
| 품질 목표값 | 작업별 입력 없음. 엔진 고정 기준(Hex SJ 0.5 / Skew 0.5, Tet SJ 0.1)으로 경고 판정 |
| 제한 | 작업 180초, 요소 200만, 동시 실행 1건(나머지는 대기) |

## 브라우저 ↔ 웹 API (모두 FEM 계정 로그인 + FEM 구독 필요, 사용자 ID는 FEM 서버 세션에서만 얻는다)

| 경로 | 설명 |
|---|---|
| `GET /api/fem/jobs` | `{authenticated, subscribed, engine:{configured, reachable, verified}, quota\|null, limit}` — `quota: null`은 "확인 불가"(실행 차단) |
| `POST /api/fem/jobs` | JSON `{requestKey(UUID), fileName, fileSize, settings:{size, strategy}}` → `{id, status, upload, quota}`. 파일은 받지 않는다 |
| `PUT upload.url` | 브라우저가 파일을 올린다. 클라우드: 객체 저장소 서명 URL(`mode: direct`), 로컬 워커: `/api/fem/jobs/{id}/upload`(`mode: proxy`) |
| `POST /api/fem/jobs/{id}/start` | 워커가 업로드 파일을 재검증(크기·형식·내용)한 뒤 대기열에 넣는다 |
| `GET /api/fem/jobs/{id}` | 상태·지표·경고·엔진 오류 원문. `sync`: `ok` / `unavailable`(워커 조회 실패) / `expired`(결과 만료·삭제) |
| `GET /api/fem/jobs/{id}/download?format=inp\|msh` | 완료 작업의 실제 출력. 서명 URL로 303 또는 스트림(+`X-Content-SHA256`) |
| `GET /api/fem/jobs/{id}/preview` | 그 작업 메쉬에서 엔진이 만든 `viewer.json` (직접 URL 안내 또는 본문) |

오류 구분: `DELIVERY_FAILED`(통신 실패) / `SUBMIT_REJECTED`+`code`(워커가 거절) / 작업 `status: failed`
(실제 메싱 실패, `errorCode`·`errors[]`에 엔진 코드와 `cause`·`hint`) / `RESULT_EXPIRED`.

## 중복 제출과 월 이용량 (FEM Pro 월 40회 — 정책 값은 그대로)

- `requestKey`는 브라우저가 실행 시도마다 만든다. 같은 키의 재전송은 같은 작업을 돌려주고 새 작업·새 실행을 만들지 않는다.
- 작업 이력(`fem_jobs`)과 이용량은 FEM 프로젝트에 있다. 한도 확인과 작업 행 생성은 DB 함수 `fem_reserve_job`이 사용자 단위 잠금 안에서 한 번에 한다.
- 세는 기준은 `fem_jobs.counts_toward_quota`:

| 경우 | 횟수 |
|---|---|
| 진행 중(업로드 대기·대기열·실행) | 1회를 잡아 둠 |
| 완료(성공), 완료(경고), 메싱 실패(엔진 판정), 시간 초과 | 계산 |
| 전달 실패, 제출 거절, 업로드 미완료, 취소, 워커 오류·실행 유실 | 계산 안 함 |

  이전 코드는 "취소가 아닌 모든 행"을 셌다(전달 실패도 차감). 위 표는 이번 연동에서 정한 규칙이며
  **사용자 확인이 필요한 정책 결정**이다. 청구·구독·웹훅 로직은 바꾸지 않았다.
- 이용량 조회 실패는 잔여 40회로 처리하지 않는다 — `quota: null`, 실행 차단.

## 결과 표시 원칙

- `result: warning`은 경고 목록과 함께 "완료(경고 있음)"으로 표시한다.
- 없는 지표는 `—`(null). `maxAspectRatio`는 항상 null(엔진 미제공)이고 모서리 길이비는 별도 항목이다.
- "품질 기준 미달 요소"(`belowThresholdElements`)와 "퇴화·무효 요소"(`invalidElements`)는 다른 항목이다.
- 3D 미리보기는 실제 `viewer.json`만 그린다. 서버 한도(32 MiB)·화면 한도(삼각형 60만)를 넘으면 생략하고 그 사실을 표시한다(간소화본 없음).

## 시험

```bash
npm run test:fem                 # 단위 13개 + (환경변수가 있으면) 실제 워커 통합 10개
node --test tests/fem/session-e2e.test.mjs   # 실제 세션 9개 — 일회용 로컬 Supabase 2개 전용(파일 머리말 참고)
node --test tests/billing/sales.test.mjs tests/billing/sales-block-e2e.test.mjs   # 판매 차단·결제 회귀(모의 PG, 실제 결제 없음)
tests/fem/sql/run.sh             # FEM 프로젝트 스키마를 일회용 로컬 Postgres에서 시험 (docker 필요)
```
통합 시험 환경변수: `FEM_TEST_WORKER_URL`, `FEM_TEST_WORKER_KEY`, `FEM_TEST_SAMPLES`(합성 샘플 폴더).
