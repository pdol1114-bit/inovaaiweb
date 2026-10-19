
# PROGRESS

## 2026-10-19 — Phase 5 후속: 작업 규칙·health 대기 행 수·운영 시험 절차

### 범위와 상태
- 현재 대화에 직전 세션의 승인 계획 2~6번 원문이 없어 해당 원문을 요청한 상태다.
  아래는 이번 메시지에 명시된 독립 작업만 반영한 결과이며, 전체 후속 작업 완료를 의미하지 않는다.
- `6c02127`: 사용자 제공 문구 그대로 `AGENTS.md` 생성, 이 파일만 별도 로컬 커밋.
- health에 `mailConfigBlocked` 추가: `status='failed'`, `next_attempt_at is not null`,
  `last_error`가 `HTTP_401:` 또는 `HTTP_403:`으로 시작하는 행의 정확한 수.
  미래 재시도 대기도 포함하고, 최종 실패·다른 오류·sent는 제외한다.
- `mailConfigBlocked`는 `checks` 바깥 표시값이다. 기존 boolean 6개, `ok`, HTTP 200/503 판정 유지.
  집계 조회 실패(0010 미적용 등)는 `null`로 표시해 0건과 구별한다. 60초 캐시 적용.
- 발송 정책·청구·재시도·웹훅 코드는 변경하지 않았다. `apphosting.yaml`의 `MAIL_*`는 주석 유지,
  발신 주소는 allowlist 시험 전에 사용자가 별도로 전달한다.
- push, 0010 적용, 시크릿 등록·변경, 롤아웃, 운영 시험은 실행하지 않았다.

### 검증·명령어
- AGENTS 커밋: `npm run build` 통과. 최초 시도는 Google Fonts 네트워크 제한으로 실패해
  네트워크 허용 후 같은 명령으로 통과했다.
- `npx tsc --noEmit`: 삭제된 `/test-payment`를 참조하는 `.next/dev/types/validator.ts` 캐시로 최초 실패.
  해당 생성 파일을 OS 임시 폴더에 이동·보관한 뒤 통과. 소스·tsconfig 수정 없음.
- `node scripts/verify-mail-health.mjs`: **16개 모의 시나리오 통과**.
  실제 health route·메일 모드 파서를 transpile해 실행하고 DB·PG만 모의 처리한다.
  네트워크·운영 키·운영 DB 접근 없음.
  - 신규 5개: 401/403 대기만 집계, 빈 대기열 0, 조회 오류 null, throw null, 60초 캐시 갱신.
  - 회귀 11개: 모드 4종, 잘못된 메일 키 3종, 기존 DB 검사 실패 2종, PG 오류·미설정 2종.
  - 매 시나리오에서 boolean 항목 6개와 no-store 확인. 집계 실패가 정상 health를 503으로 바꾸지 않음.
- (이 커밋): health 표시·모의 시험 스크립트·운영 절차 보강.
- 후속 커밋: `npm run build`, `npx tsc --noEmit` 모두 통과.
  빌드는 Google Fonts 접근 제한으로 최초 실패한 뒤 승인된 네트워크 허용 재실행으로 통과했다.
- `npx eslint src/app/api/health/billing/route.ts scripts/verify-mail-health.mjs`, `git diff --check` 통과.
  시험 스크립트의 로더 변수명에 대한 lint 오류를 수정한 뒤 모의 시험 16개·lint를 재실행해 통과.

### 운영 시험 절차 보강 (아래 Phase 5·4 절차 참조)
- 맨 위에 전체 청구 배치 경고, 매 실행 직전 전체 구독 행 확인 SQL 추가.
- Phase 5 첫 실패·재시도·최종 종료 시험은 테스트 구독의 `billing_key=null` 경로로 설명.
  PG 호출 전 실패 위치 `src/lib/billing/recurring.ts:201`, `:204`와 PG 호출 `:274`를 명시.
- 테스트 외 구독이 있거나 테스트 계정 여부가 불명확하면 실행 중단.
  운영 시험은 별도 승인 후 진행하며 이번 작업에서는 실행하지 않았다.

## 2026-10-19 — 결제 Phase 5: 안내 메일 발송 (Resend)

### 변경 내용 (커밋별)
| 커밋 | 파일 | 내용 |
|---|---|---|
| 47fbbd2 | `supabase/migrations/0010_notification_delivery.sql` | sending 상태, attempts·last_error·provider_message_id·sending_started_at·next_attempt_at·dedupe_key(unique). **미적용** |
| f0d48d6 | `src/lib/notifications/{templates,resend,config,mask}.ts`, `scripts/render-notifications.mts` | 템플릿 2종, Resend 클라이언트(fetch), 메일 설정·모드, 주소 마스킹 |
| 29c8384 | `src/lib/notifications/dispatch.ts`, `src/lib/billing/recurring.ts`, cron route | 선점·발송 공통 함수, 기록 지점 2곳 즉시 발송, cron f 단계 |
| (이 커밋) | health, `apphosting.yaml`, PROGRESS.md | resendApiKey 점검, mailMode 표시, RESEND_API_KEY 참조, MAIL_* 주석 |

### 알림 유형 (기록 지점 2곳만)
| kind | 기록 시점 | payload |
|---|---|---|
| payment_failed_first | 정기 청구 첫 실패로 past_due 전환 (recurring.ts applyChargeFailure, attempts=1) | subscription_id, due_date, amount, card_brand, card_last4, retry_dates, grace_ends_at |
| subscription_canceled_nonpayment | 미납 최종 종료 (cancelForNonPayment) | subscription_id, reason(PAYMENT_FAILED_FINAL·GRACE_EXPIRED), due_date, amount, card_brand, card_last4, canceled_at, charge_attempts, grace_ends_at |
- dedupe_key = `kind:subscription_id:due_date`, 기록은 충돌 시 무시.
- 카드 정보·금액은 기록 시점 스냅샷 (그 사이 재구독해도 메일 내용이 바뀌지 않음). 수신 주소는 발송 시 auth 에서 조회.
- past_due 사용자가 새 카드로 재구독하면: 구독이 active·미래 결제일이 되므로 재시도(d 단계: status=past_due 조건)와
  최종 종료(e 단계: past_due 조건)가 실행되지 않는다 (2026-10-19 Phase 4 실결제 테스트에서 미납 회차 미청구 확인).
  이미 기록된 첫 실패 안내는 그대로 발송된다.

### 발송 구조
- `deliverNotification()` 하나를 즉시 발송과 cron f 가 공유. 선점: status ∈ (pending, failed) 이고 attempts 가
  읽은 값과 같을 때만 sending(+1). 0행이면 다른 실행이 가져간 것.
- Resend `Idempotency-Key` = notification id (24h). 결과 기록 전 중단돼도 재발송이 중복되지 않는다.
- 재시도 최대 5회, 간격 1h·1h·24h·24h. 영구 오류·5회 초과는 failed + next_attempt_at=null (행 삭제 없음).
- cron f: 10분 넘은 sending → pending 복구 후 pending·재시도 대상 failed 발송. 메일 집계는 `summary.mail` 로 분리.
- 기록 지점은 `queueAndSend()` 로만 호출: throw 없음, 15초 상한 → 청구 결과·응답·집계 영향 없음.
- MAIL_MODE: off(미설정 기본, 선점 안 함·pending 유지) / allowlist(MAIL_ALLOWLIST 수신자만, 그 외 행은 미변경) / live.
  MAIL_FROM·API 키·사이트 주소 중 하나라도 없으면 off 와 같다.
- 로그: `[mail] id=… kind=… to=s***6@gmail.com attempt=… result=… provider_id=…` (키·본문·카드 정보 미출력).

Resend 응답 분기 (문서 확인):
| 응답 | 처리 |
|---|---|
| 2xx | sent |
| 409 concurrent_idempotent_requests · resource_locked | 재시도 |
| 409 invalid_idempotent_request (같은 키·다른 본문) | 재시도, 최소 25시간 뒤 (키 보관 24h) — 영구 실패 아님 |
| 429 · 5xx · 타임아웃(10초) · 네트워크 | 재시도 |
| 401 · 403 (키 무효·도메인 미인증) · 404 · 405 | 재시도 (설정 수정 후 복구) |
| 400 · 422 | 영구 실패 |

### 검증 (로컬)
- `npm run build` 통과, 클라이언트 번들에 메일 관련 코드 0건.
- `node scripts/render-notifications.mts` — 3 샘플 렌더 + 결정성(같은 입력 같은 출력) + 알 수 없는 kind null.
- Resend 클라이언트를 로컬 모의 서버로: 위 표 11가지 응답 모두 설계대로, 모든 요청에 Idempotency-Key.
- 발송 로직을 가짜 DB·모의 Resend 로: 즉시 발송·dedupe 무시 / 같은 행 동시 10회 → 1회 발송 /
  allowlist 밖 미변경 / off·MAIL_FROM 없음 선점 안 함 / 500 → 1h 재시도 → 5회째 최종 실패 /
  422 즉시 최종 / NO_RECIPIENT·UNKNOWN_KIND / 멈춘 sending 복구 / Resend 무응답에도 상한 내 반환·예외 없음.
- health: resendApiKey 정상 true, 끝 개행 false, 접두어 다름 false. mailMode 표시, 항목 6개.
- **미검증**: 실제 Resend 발송, 운영 DB 경로 (아래 테스트 절차).

### Kevin 할 일 — 순서대로
1. **값 확정 후 apphosting.yaml 의 MAIL_* 주석 해제** (MAIL_FROM, MAIL_REPLY_TO, MAIL_SUPPORT_EMAIL,
   MAIL_MODE=allowlist, MAIL_ALLOWLIST=테스트 주소). 비워 둔 채 배포하면 발송하지 않을 뿐 장애는 없다.
2. **Resend 도메인 인증** (발신 도메인 DNS: SPF·DKIM 레코드, Resend 대시보드에서 Verified 확인)
3. **0010 적용** (Supabase SQL Editor). 적용 전 배포하면 기록·발송 쿼리가 실패한다 (청구는 영향 없음).
4. **resend-api-key 등록** — 값이 화면·셸 히스토리에 남지 않는 방식:
   ```sh
   gcloud secrets create resend-api-key --replication-policy=automatic --data-file=- --project sniff-by-hatch-app
   # ↑ 실행 후 키를 붙여 넣고, Enter 없이 Ctrl-D (Enter 를 치면 개행이 값에 들어간다)
   firebase apphosting:secrets:grantaccess resend-api-key --backend sniff-web-server --project sniff-by-hatch-app
   gcloud secrets versions access latest --secret resend-api-key --project sniff-by-hatch-app | wc -c
   gcloud secrets versions access latest --secret resend-api-key --project sniff-by-hatch-app | tail -c 1 | xxd   # 마지막 바이트가 0a 면 개행 포함 → 재등록
   ```
   기대 길이: (등록 후 Kevin 이 알려주면 기록)
5. **push** → 롤아웃 성공 확인 (resend-api-key 가 없으면 롤아웃 실패)
6. **health**: 여섯 항목 모두 true, `"mailMode":"allowlist"`, `"mailConfigBlocked":0` 확인.
   값이 null이면 집계 불가, 양수이면 401·403 설정 오류로 발송 대기 중인 행이 있음 (정상 여부 판정과 별개).
7. **테스트 절차** (아래)
8. **공개 당일**: apphosting.yaml 의 MAIL_MODE 를 live 로 → push → 롤아웃 → health 에서 `"mailMode":"live"` 확인

### 테스트 절차 (allowlist) — 운영 실행은 별도 승인 후
> **경고: cron 수동 트리거는 전체 청구 배치를 실행함. web_subscriptions에 테스트 외
> 구독이 없는 공개 전에만 실행. 실행 직전 구독 행 조회로 확인**

이번 작업에서는 실행하지 않는다. 발신 주소는 미정이며 `apphosting.yaml`의 `MAIL_*` 주석을 유지한다.
사용자가 주소를 별도로 전달하고 설정·0010 적용·시크릿 등록·배포를 승인한 뒤 진행한다.
테스트 계정을 MAIL_ALLOWLIST에 넣고, 매 수동 트리거 직전에 아래 조회 결과가 모두 테스트 계정인지 확인한다.
키·전체 이메일 주소·카드 정보는 조회 결과나 작업 문서에 남기지 않는다.
```sql
select id, user_id, status, next_billing_date, failed_attempts, next_retry_at, grace_ends_at
  from web_subscriptions order by created_at;
```
테스트 외 구독이 한 행이라도 있거나 테스트 계정 여부가 불명확하면 실행하지 않는다.
아래의 “출금 없음”은 준비한 테스트 구독의 경로에만 해당한다.

1. **대기열 직접 기록 → cron 발송** (출금 없음):
   ```sql
   insert into web_notifications (user_id, kind, payload, dedupe_key) values
   ('<UID>', 'payment_failed_first',
    '{"subscription_id":"test","due_date":"2026-11-19T01:18:36+00:00","amount":3300,"card_brand":null,"card_last4":null,
      "retry_dates":["2026-11-19T15:00:00Z","2026-11-21T15:00:00Z"],"grace_ends_at":"2026-11-22T14:59:59.999Z"}',
    'test:payment_failed_first:1');
   ```
   → 배치 수동 실행 → 메일 수신, 행 status=sent·provider_message_id 기록, 로그 `[mail] … result=sent`.
2. **실제 흐름** (준비한 테스트 구독은 PG 청구 호출 없음): 테스트 계정의 구독만 아래처럼 준비한다.
   기존 테스트 빌링키가 있다면 PG 콘솔에서 해당 테스트 키를 정리하고, 키 값은 출력·기록하지 않는다.
   ```sql
   update web_subscriptions
      set billing_key=null, status='active', failed_attempts=0,
          next_billing_date=now()-interval '1 hour', next_retry_at=null, grace_ends_at=null
    where user_id='<UID>';
   ```
   코드 근거: `src/lib/billing/recurring.ts:201`의 `!sub.billing_key` 분기가
   `:204`에서 `applyChargeFailure()`로 반환한다. PG 사전 조회(`:219`)와
   청구 호출(`:274`)보다 앞이므로 이 테스트 구독은 PG 청구를 호출하지 않는다.
   → 전체 구독 행을 다시 조회·확인 → 배치 → `charge.past_due_1`, 첫 실패 메일 즉시 발송 확인.
   이어서 Phase 4 테스트 5·6번처럼 테스트 구독의 `next_retry_at`만 과거로 바꾸되,
   매 배치 직전 전체 구독 행 조회와 아래 키 없음 검사를 확인한다 (`has_no_billing_key=true` 필수).
   ```sql
   select id, status, failed_attempts, billing_key is null as has_no_billing_key,
          next_billing_date, next_retry_at, grace_ends_at
     from web_subscriptions where user_id='<UID>';
   ```
   마지막에 `retry.canceled_PAYMENT_FAILED_FINAL`, 최종 종료 메일 발송을 확인한다.
   유예 만료 경로는 첫 실패 상태를 별도로 준비하고 `grace_ends_at`을 과거로 설정해
   `final.canceled_GRACE_EXPIRED`와 최종 종료 메일을 확인한다.
3. **allowlist 차단**: 다른 계정 user_id 로 1번 행 기록 → 배치 후에도 status=pending·attempts=0 (발송 없음). 확인 후 그 행은 status='failed' 로 바꿔 둘 것 (삭제 금지).
4. 배치 수동 실행:
   ```sh
   curl -s -X POST -H "Authorization: Bearer $(gcloud secrets versions access latest --secret billing-cron-secret --project sniff-by-hatch-app)" \
     https://inovaai.ai/api/cron/billing
   ```
   응답에는 청구 counts 만, 메일 집계는 로그 `[cron/billing] summary {… "mail":{…}}`.
   결과 확인은 본문·전체 이메일·카드 값을 조회하지 않고 아래 상태 필드만 사용한다.
   ```sql
   select id, kind, status, attempts, last_error, provider_message_id, next_attempt_at
     from web_notifications where user_id='<UID>' order by created_at desc;
   ```

## 2026-10-19 — 결제 Phase 4: 매월 자동청구 · 미납 처리 · 대사

### 변경 내용 (커밋별)
| 커밋 | 파일 | 내용 |
|---|---|---|
| 288be51 | `supabase/migrations/0009_recurring_billing.sql` | past_due, 재시도 컬럼, web_payments.kind, web_notifications. **미적용** |
| f7a48f6 | `settlement.ts`, `webhook.ts`, `subscription.ts` | 정기 청구 확정(기준일 유지·회차 진행), 재구독 시 재시도 초기화, 웹훅 전액 취소에 past_due 포함 |
| 0afc8d3 | `initial-charge.ts` | past_due 사용자 카드 재등록 = 재구독 (첫 결제, 미납 회차 미청구) |
| 370144c | `cancel-subscription/route.ts`, `settlement.ts` | past_due 즉시 해지 (pending 결제 중이면 409), 회차 진행 실패 needs_review 로그 |
| d1c69f6 | `period.ts`, `scripts/verify-billing-period.mts` | KST 하루 경계 함수 (10 checks) |
| e1c8a45 | `src/lib/billing/recurring.ts`, `src/app/api/cron/billing/route.ts`, `apphosting.yaml`, health | 일일 배치, BILLING_CRON_SECRET 참조, health 에 billingCronSecret |
| 60155f8 | `SubscriptionManager.tsx`, `messages/ko.json`, `messages/en.json` | past_due 화면 |
| 3b22fdf | `src/app/api/webhook/portone/route.ts` | WEBHOOK_SECRET_INVALID 로그 (응답 500 유지) |

### 미납 정책 구현 (D = 회차 결제일의 KST 날짜)
| 시점 | 처리 | 실패 시 |
|---|---|---|
| D 배치 | 1차 청구 | past_due, failed_attempts=1, next_retry_at=D+1 00:00, grace_ends_at=D+3 23:59:59 |
| D+1 배치 | 재시도 | failed_attempts=2, next_retry_at=D+3 00:00 |
| D+3 배치 | 마지막 재시도 | canceled, service_end_date=지금, 빌링키 삭제, web_notifications 기록 |
- 성공: active, 재시도 컬럼 초기화, next_billing_date = started_at 기준 다음 회차 (재시도일 기준 아님).
- 청구 대상: active 이고 next_billing_date 의 KST 날짜 ≤ 오늘 (결제일 시각이 배치보다 늦어도 당일 청구).
- 재시도는 유예(grace_ends_at) 안에서만. 유예가 끝난 past_due 는 e 단계가 종료 (배치 누락 대비).
- 늦게 첫 실패가 난 경우에도 재시도는 최소 다음 날 (같은 날 반복 청구 방지).

### 배치 `POST /api/cron/billing`
인증 `Authorization: Bearer <billing-cron-secret>` (SHA-256 후 timing-safe 비교, 32자 미만이면 500).
순서: a 대사(35일 paid + 5분 넘은 pending → 웹훅 처리기) → b 만료 정리 → c 정기 청구 → d 재시도 → e 최종 실패.
예산 240초 (Cloud Run 타임아웃 300초). 남은 건은 다음 정시 실행이 처리 (10~14시 매시).
로그: `[cron/billing] summary {...counts}` + `step=… id=… result=…`.

이중 청구 방지 4겹: 회차 부분 unique(subscription_id, period_start) · 사용자 pending 잠금(0007) ·
고정 paymentId(`spr`+hex32) · **잠금 후 구독 재확인** + 갱신 조건(next_billing_date=회차, failed_attempts 기대값).

### past_due 재구독 동시성 확인
| 경합 | 막는 장치 | 결과 |
|---|---|---|
| 배치가 잠금 보유 중 재등록 | 사용자 pending 잠금 | register-key 409 IN_PROGRESS |
| 재등록이 잠금 보유 중 배치 | 사용자 pending 잠금 | 배치 skipped_locked, 이후 구독은 active·미래 결제일이라 대상 아님 |
| 배치가 past_due 를 읽은 뒤 재등록 완료, 그 후 배치가 잠금 | **배치 잠금 후 재확인** (status·결제일·실패 횟수·빌링키 비교) | 잠금 해제 후 skipped_changed |
| 배치 성공 후 재등록 | register-key 잠금 후 재확인 | 409 ALREADY_SUBSCRIBED, 새 빌링키 삭제 |
| past_due 즉시 해지 vs 배치 | 해지 시 pending 확인(409), 배치 재확인 | 확인과 갱신 사이 극히 짧은 구간만 남음 → 발생 시 needs_review 로그 |
계획 보고의 "구독 갱신 조건"만으로는 3행을 막지 못해(갱신은 출금 뒤) 잠금 후 재확인을 추가했다.

### 메일 (구현 안 함)
리포에 발송 수단 없음. 최종 실패 안내는 `web_notifications` 에 pending 으로 쌓인다.
선택지: **Resend 권장**(inovaai.ai DNS 인증 + API 키 시크릿 1개, fetch 만으로 호출) /
Google Workspace SMTP(admin@inovaai.ai 앱 비밀번호 + nodemailer) /
Supabase(인증 메일 전용, 일반 메일은 Edge Function + 외부 서비스 필요).

### 카드 변경
기능 없음. past_due 는 결제 페이지에서 새 카드로 재구독하는 것이 유일한 경로 (기준일이 새로 잡힘).

### 검증
- `npm run build` 통과. 클라이언트 번들에 cron 시크릿·배치·service role 참조 0건.
- `node scripts/verify-billing-period.mts` 10 checks 통과.
- 로컬: cron 무인증·잘못된 시크릿 401, GET 405, 올바른 시크릿 → 인증 통과 후 (로컬 DB 키 없음) 500.
  웹훅 시크릿이 base64 아님 → 500 + `WEBHOOK_SECRET_INVALID` 로그.
- **미검증**: 배치의 DB·포트원 경로 전체, past_due 화면 렌더 (아래 테스트 절차로 확인).

### 시크릿 등록 절차 (공통) — 키별 기대 길이
값은 프롬프트에 **한 번만** 붙여 넣는다 (2026-10-19 두 번 이중 붙여넣기 장애). 등록 후 길이 확인:
```sh
gcloud secrets versions access latest --secret <이름> --project sniff-by-hatch-app | tr -d '\n' | wc -c
```
| Secret Manager 이름 | 기대 길이 | 비고 |
|---|---|---|
| supabase-service-role-key | 219 | JWT (role=service_role) |
| portone-webhook-secret | 50 | `whsec_` + base64 44자 |
| portone-api-secret | 80 | 2026-10-19 현재 값 기준 (값 출력 없이 측정) |
| billing-cron-secret | 64 | 아래 명령으로 생성한 hex |
새 버전 등록 후에는 롤아웃이 필요하다 (리비전이 버전에 고정). 확인: `curl -s https://inovaai.ai/api/health/billing`.

### Kevin 체크리스트 — 순서대로
1. **0009 적용** (Supabase SQL Editor). 적용 전 배포하면 구독 조회가 실패한다.
2. **cron 시크릿 생성·등록·길이 확인** (값이 화면에 나오지 않는 방식):
   ```sh
   openssl rand -hex 32 | tr -d '\n' | gcloud secrets create billing-cron-secret \
     --replication-policy=automatic --data-file=- --project sniff-by-hatch-app
   firebase apphosting:secrets:grantaccess billing-cron-secret --backend sniff-web-server --project sniff-by-hatch-app
   gcloud secrets versions access latest --secret billing-cron-secret --project sniff-by-hatch-app | wc -c   # 64
   ```
3. **push** → 롤아웃 성공 확인 (시크릿 없으면 롤아웃 실패)
4. **health**: 다섯 항목 모두 true (`billingCronSecret` 포함)
5. **Cloud Scheduler API 활성화·작업 생성** (매일 KST 10~14시 매시 정각):
   ```sh
   gcloud services enable cloudscheduler.googleapis.com --project sniff-by-hatch-app
   gcloud scheduler jobs create http sniff-billing-daily \
     --project sniff-by-hatch-app --location us-central1 \
     --schedule "0 10-14 * * *" --time-zone "Asia/Seoul" \
     --uri https://inovaai.ai/api/cron/billing --http-method POST \
     --headers "Authorization=Bearer $(gcloud secrets versions access latest --secret billing-cron-secret --project sniff-by-hatch-app)" \
     --attempt-deadline 300s --max-retry-attempts 0
   ```
   시크릿 교체 시 `gcloud scheduler jobs update http sniff-billing-daily --update-headers ...` 로 헤더도 갱신.
6. **테스트 절차** (아래). 끝나면 테스트 결제는 콘솔에서 취소하고 테스트 행 정리.

### 테스트 절차 (한 달을 기다리지 않고)
> **경고: cron 수동 트리거는 전체 청구 배치를 실행함. web_subscriptions에 테스트 외
> 구독이 없는 공개 전에만 실행. 실행 직전 구독 행 조회로 확인**

```sql
select id, user_id, status, next_billing_date, failed_attempts, next_retry_at, grace_ends_at
  from web_subscriptions order by created_at;
```
테스트 외 구독이 있거나 계정 여부가 불명확하면 실행하지 않는다. 운영 시험은 별도 승인 후 수행한다.
준비: 테스트 계정으로 첫 결제를 완료해 active 구독을 만든다. `<UID>` = 테스트 계정 user_id.
배치 수동 실행 (둘 중 하나):
```sh
gcloud scheduler jobs run sniff-billing-daily --location us-central1 --project sniff-by-hatch-app
# 또는
curl -s -X POST -H "Authorization: Bearer $(gcloud secrets versions access latest --secret billing-cron-secret --project sniff-by-hatch-app)" \
  https://inovaai.ai/api/cron/billing
```
확인 쿼리:
```sql
select status, next_billing_date, failed_attempts, next_retry_at, grace_ends_at, started_at
  from web_subscriptions where user_id = '<UID>';
select payment_id, kind, status, failure_reason, period_start, period_end, paid_at
  from web_payments where user_id = '<UID>' order by created_at desc;
```

| # | 경로 | 준비 SQL / 조작 | 기대 결과 |
|---|---|---|---|
| 1 | 정기 청구 성공 (**3,300원 실청구**) | `update web_subscriptions set next_billing_date = now() - interval '1 hour' where user_id='<UID>';` → 배치 | `charge.paid` 1. spr 행 kind=recurring paid, period_start=바꾼 결제일. next_billing_date = started_at 기준 다음 회차 |
| 2 | 겹친 실행 | 1과 같은 준비 후 curl 두 개를 동시에 실행 | 한쪽 paid, 다른 쪽 skipped_locked (청구 1건) |
| 3 | 1차 실패 (출금 없음) | 포트원 콘솔에서 구독 빌링키 삭제 → 1의 준비 SQL → 배치 | `charge.past_due_1`. status=past_due, failed_attempts=1, next_retry_at=내일 00:00 KST, grace=D+3 끝. failed 행 |
| 4 | 화면 | 3 상태에서 /account/subscription | 결제 실패 배지, 재시도·기한, 새 카드 결제 안내 |
| 5 | 재시도 실패 | `update web_subscriptions set next_retry_at = now() - interval '1 minute' where user_id='<UID>';` → 배치 | `retry.past_due_2`, next_retry_at=D+3 00:00 (또는 내일 중 늦은 쪽) |
| 6 | 마지막 재시도 실패 | 5의 SQL 다시 → 배치 | `retry.canceled_PAYMENT_FAILED_FINAL`, canceled, web_notifications pending 1건 |
| 7 | 유예 만료 | 3까지 다시 만든 뒤 `update web_subscriptions set grace_ends_at = now() - interval '1 minute' where user_id='<UID>';` → 배치 | `final.canceled_GRACE_EXPIRED` |
| 8 | past_due 재구독 | 3 상태에서 /payment 새 카드 등록 (**3,300원 실청구**) | active, started_at=새 결제 시각, 재시도 컬럼 null, 미납 회차 미청구 |
| 9 | past_due 즉시 해지 | 3 상태에서 구독관리 해지 | canceled, service_end_date=지금 |
| 10 | 재시도 성공 (**실청구**) | 정상 빌링키가 있는 구독에서 `update web_subscriptions set status='past_due', failed_attempts=1, next_billing_date=now()-interval '1 day', next_retry_at=now()-interval '1 minute', grace_ends_at=now()+interval '2 day' where user_id='<UID>';` → 배치 | `retry.paid`, active, 재시도 컬럼 null, next_billing_date = started_at 기준 다음 회차 |
| 11 | 청구 전 재조회 | 1 이후 직전 paid 결제를 콘솔에서 전액 취소, 웹훅이 반영되기 전에 1의 준비 SQL → 배치 | 웹훅이 먼저 반영하면 구독 canceled 로 청구 대상 아님. 아니면 `charge.skipped_last_payment_cancelled` |

정리: 테스트로 청구된 결제는 콘솔에서 취소, 테스트 계정의 web_payments·web_subscriptions·web_notifications·web_webhook_events 행 삭제.

## 2026-10-19 — 결제 Phase 3: 포트원 웹훅 처리

### 변경 내용 (커밋별)
| 커밋 | 파일 | 내용 |
|---|---|---|
| 9d144b1 | `supabase/migrations/0008_web_webhook_events.sql` | 처리 완료 웹훅 기록 테이블 + 이중 청구 방지 인덱스에 partial_cancelled 포함. **미적용** |
| 08ce48c | `src/lib/billing/settlement.ts`, `initial-charge.ts` | pending 확정 공통 로직 분리 (일시 오류 throw). 요청 경로는 잡아서 202 |
| 80bf7cf | `src/lib/billing/webhook.ts`, `src/app/api/webhook/portone/route.ts` | 웹훅 처리 |
| 4f9d32d | `src/app/api/health/billing/route.ts` | 웹훅 시크릿을 base64 디코딩 가능 여부까지 점검 |

### 웹훅 흐름
1. 서명 검증 (raw body, webhook-id/timestamp/signature 헤더, 타임스탬프 허용 범위) → 실패 400
2. `web_webhook_events` 에 같은 webhook-id 가 있으면 → 200 (처리 없음)
3. Transaction.Paid / Failed / Cancelled / PartialCancelled 외 → 200 (기록 없음)
4. `web_payments` 에 없는 paymentId → ignored 기록 + 200
5. 포트원 결제 재조회 → 실제 상태 × DB 행 상태로 처리 → 기록 + 200
6. 일시 오류(DB, 포트원 조회) → 기록 없이 500 (포트원 재전송)

| 실제 상태 | 행 상태 | 처리 | result |
|---|---|---|---|
| PAID | pending | 검증 후 paid + 구독 활성화 (Phase 2 의 202 마무리) | processed |
| PAID | paid | 없음 | processed |
| PAID | failed·cancelled | 자동 처리 안 함 | needs_review |
| FAILED | pending | failed + 새 빌링키 삭제 | processed |
| CANCELLED | paid·partial_cancelled | 아래 전액 취소 | processed |
| PARTIAL_CANCELLED | paid | partial_cancelled 기록만, 구독 변경 없음 | processed |
| 미확정(READY 등) | pending | 없음 | ignored |

전액 취소: 결제 행 cancelled. 그 결제가 해당 구독의 최신 paid 결제이고 period_end 가
현재보다 뒤일 때만 구독 즉시 종료 — status=canceled, service_end_date=canceled_at=포트원
취소 시각, next_billing_date=null, 빌링키 삭제(실패 시 500 → 재전송 때 재시도). 과거 회차는 기록만.

멱등성: 처리 "후" 기록. 처리 로직은 모든 갱신에 기존 상태 조건을 걸어 동시 중복 처리도 안전.

로그 형식 (시크릿·빌링키 미출력):
```
[webhook/portone] id=<webhook-id> type=Transaction.Cancelled paymentId=spi… result=processed detail=CANCELLED_SUBSCRIPTION_ENDED
```

### 검증
- `npm run build` 통과. ko/en 키 파리티 일치(파트 A).
- 로컬 `next start` + 테스트용 임의 시크릿으로 서명한 요청:
  헤더 없음·서명 불일치·10분 전 타임스탬프 → 400 (MISSING_REQUIRED_HEADERS / NO_MATCHING_SIGNATURE /
  TIMESTAMP_TOO_OLD), BillingKey.Issued → 200 ignored, Transaction.Paid(로컬 DB 키 없음) → 500 TEMPORARY_FAILURE.
- **미검증**: DB 를 거치는 처리 경로 전체 (로컬 service role 없음, DB 쓰기 금지). 아래 실전 테스트로 확인.

### Kevin 체크리스트 — 순서대로
1. **0008 적용**: Supabase SQL Editor 에서 `0008_web_webhook_events.sql` 실행
2. **push** → 롤아웃 성공 확인
3. **health 점검**: `curl -s https://inovaai.ai/api/health/billing` → `"ok":true`, 네 항목 모두 true
   (`portoneWebhookSecret` false 면 시크릿이 base64 가 아님 → 콘솔 값 재등록 + 롤아웃)
4. **웹훅 URL 등록**: 포트원 콘솔 > 결제 연동 > 웹훅. 주소 `https://inovaai.ai/api/webhook/portone`,
   버전 2024-04-25. 콘솔의 웹훅 시크릿이 Secret Manager `portone-webhook-secret` 과 같은 값인지 확인
5. **호출 테스트**: 콘솔 "호출 테스트" → 기대값 **HTTP 200, 로그 result=ignored**
   (detail=UNKNOWN_PAYMENT 또는 UNHANDLED_TYPE)
6. **테스트 결제 취소** (spi8aa9dde378114cd8b8363ff137e6b7ab, 포트원 콘솔에서 전액 취소)
7. **결과 확인** — 기대값:
   - web_payments: status=cancelled, failure_reason=PAYMENT_CANCELLED
   - web_subscriptions: status=canceled, service_end_date = canceled_at = 취소 시각, next_billing_date=null, billing_key=null
   - 포트원 콘솔: 해당 빌링키 삭제됨
   - 로그: `type=Transaction.Cancelled paymentId=spi8aa9… result=processed detail=CANCELLED_SUBSCRIPTION_ENDED`
   - web_webhook_events: 해당 webhook-id 행 result=processed
   ```sh
   gcloud logging read 'resource.labels.service_name="sniff-web-server" AND textPayload:"webhook/portone"' \
     --project sniff-by-hatch-app --freshness=30m --format='value(timestamp,textPayload)'
   ```
8. **DB 정리**: 테스트 계정의 web_subscriptions·web_payments·web_webhook_events 행 삭제

결과가 다르면(500 반복, needs_review 등) 로그의 detail 을 확인하고 정리 전에 보고할 것.

## 2026-10-19 — 결제 장애 대응과 코드 보완 3건

### 장애 (2026-10-19 08:03·08:05 KST)
"지금 구독하기" → "예기치 못한 오류". register-key 500,
`failed to create pending payment: Invalid API key`. Secret Manager
`supabase-service-role-key` 버전 2가 정상 JWT(219자)를 **두 번 이어 붙인 438자**였다.
Kevin 이 버전 4(219자, role=service_role, ref=hvloodegutmwxbabdsjf)를 등록하고 롤아웃
(리비전 build-2026-10-18-003, 키 버전 4 참조). 08:28:57 첫 실결제 정상 처리
(web_payments paid, web_subscriptions active, 다음 결제일 2026-11-19 KST).
결제 호출 전 단계라 출금은 없었고, 빌링키 2개가 포트원에 남았다.

### 보완
| 커밋 | 내용 |
|---|---|
| 020efa1 | 결제 호출 전 단계 예외 시 잠금 해제 + 새 빌링키 삭제 (IN_PROGRESS·검증 통신 오류는 삭제 안 함) |
| 3386155 | `PreChargeError` → 500 `PRECHARGE_FAILED`, 결제 이후 예외는 `SERVER_ERROR`. 화면 "결제가 진행되지 않았습니다" |
| 36310d1 | `GET /api/health/billing` — 시크릿 유효성 점검 |

### 배포 후 점검 (매 롤아웃마다)
```sh
curl -s https://inovaai.ai/api/health/billing
# 기대 (Phase 5 이후 정상 기준, 여섯 항목 모두 true. mailMode 는 표시만 하며 ok 판정에 포함되지 않음):
# {"ok":true,"checks":{"supabaseAdmin":true,"paymentsTable":true,"portoneApi":true,"portoneWebhookSecret":true,
#   "billingCronSecret":true,"resendApiKey":true},"mailMode":"allowlist|live","mailConfigBlocked":0}
# 공개 이후에는 "mailMode":"live" 인지도 확인
```
- 하나라도 false 면 503. 원인은 Cloud Run 로그 `[health/billing]` 에서 확인.
- `supabaseAdmin` false: service role 키 무효 (이번 장애 유형). 길이 219 확인:
  `gcloud secrets versions access latest --secret supabase-service-role-key --project sniff-by-hatch-app | tr -d '\n' | wc -c`
- 결과는 인스턴스별 60초 캐시. 시크릿 교체 직후에는 새 롤아웃 + 1분 뒤 확인.
- 시크릿을 새 버전으로 등록해도 기존 리비전은 이전 버전에 고정돼 있으므로 롤아웃이 필요하다.

## 2026-10-18 — 결제 Phase 2: 카드 등록 시 즉시 청구

### 변경 내용 (커밋별)
| 커밋 | 파일 | 내용 |
|---|---|---|
| 3d7345d | `middleware.ts`, `src/utils/supabase/middleware.ts` | 갱신된 세션 쿠키와 SDK 캐시 방지 헤더(Cache-Control/Expires/Pragma)를 intl 응답에 반영. `/api` 제외 매처 유지 |
| 3cdbee7 | `src/lib/billing/period.ts`, `scripts/verify-billing-period.mts` | KST 기준 월 결제일 계산. 기준일(started_at)에서 매번 계산해 말일 보정 후 원래 일자로 복귀 |
| 3b94746 | `src/lib/billing/initial-charge.ts`, `src/lib/portone/server.ts`, `src/lib/billing/constants.ts`, register-key 라우트, `0007_web_payments_pending_lock.sql` | 빌링키 검증 → 잠금 → 재확인 → 즉시 청구 → 결제 조회로 확정 → 활성화/정리 |
| 81a207a | `src/components/payment/registerBillingKey.ts`, `SubscribeButton.tsx` | 모바일 redirectUrl 복귀 쿼리 처리. 데스크톱과 같은 헬퍼 사용 |
| 13553cd | `SubscribeButton.tsx`, `messages/ko.json`, `messages/en.json` | 결제 중·완료·확인 중·실패 상태 문구. 자동 갱신 고지의 "매월 같은 날" → 말일 보정 반영 |

### register-key 흐름
1. 세션 사용자 확인 (user_id 는 세션에서만)
2. 포트원 빌링키 조회: `status === "ISSUED"` 이고 `customer.id === user.id` (SubscribeButton 이 이미
   customerId 에 user.id 를 넣고 있어 수정 불필요)
3. `web_payments` 에 pending 행 insert = 사용자 잠금
4. 잠금 후 구독 재확인. 409 는 `active`, 또는 `cancel_scheduled` 이면서 종료일 전(해지취소 안내).
   종료일 지난 해지예약은 만료로 보고 진행. 409 시 잠금 행 삭제, 현재 구독 키와 다른 새 빌링키 삭제
5. `SNIFF_PREMIUM_MONTHLY_PRICE` 로 빌링키 결제 → **결과와 무관하게** 결제 조회로 확정
   (PAID + 금액 + KRW + 빌링키 + 고객 ID 모두 일치해야 성공)
6. 성공: 구독 upsert(active, started_at=포트원 paidAt, next_billing_date=+1개월, 해지 흔적 초기화) →
   결제 행 paid(paid_at, period_start/end, subscription_id) → 이전 빌링키 삭제
7. 실패 확정: 결제 행 failed(failure_reason), 새 빌링키 삭제, 구독 미변경 → 402
8. 결과 불명(통신 오류, PAY_PENDING, 검증 불일치, 활성화 DB 오류): pending 유지, 빌링키 유지 → 202

### 이중 청구 방지
1. 0007: `web_payments(user_id) where status = 'pending'` 부분 unique. 동시 요청 중 하나만 통과(23505 → 409)
2. 잠금 후 구독 재확인: 먼저 끝난 요청이 이미 활성화한 경우 차단
3. 시도별 고정 paymentId: 같은 ID 재요청은 포트원이 `ALREADY_PAID` 로 거절
- 5분 넘은 pending 은 다음 요청 때 포트원 결제 조회로 paid(활성화)/failed 로 정리한 뒤 잠금 해제.
  포트원에 결제 건이 없으면 5분 경과 시점에 failed 로 확정.

### paymentId 규칙
`spi` + 하이픈 없는 UUID v4 = 35자, 영숫자만. 포트원 KCP 문서 확인 결과 paymentId 는
"KCP의 경우 최대 40자", "한글, 특수문자 미지원". 승인안의 `spi_` 에서 밑줄을 뺐다.
Phase 4 정기청구는 `spr` 접두사로 구분 예정.

### 검증
- `npm run build` 통과 (exit 0). 클라이언트 번들(`.next/static`)에 service role·API secret·
  결제 호출·금액 상수 참조 0건.
- `node scripts/verify-billing-period.mts` 9개 통과 (1/31 평년·윤년, 2/29, 3/31, 12/31,
  KST 새벽 경계 2건, 다음 결제일 복귀, 첫 기간). Node 의 MODULE_TYPELESS 경고는 무해.
- 로컬 `next start` + curl: `/` → 307 `/ko`, `/ko|en/payment` 200, 고지 문구 노출,
  비로그인 register-key 401, `/api` 로케일 리다이렉트 없음, 페이지 응답에 `Cache-Control: private, no-store`.
- 브라우저(headless Chromium, iPhone 13 에뮬레이션):
  - 실패 코드 복귀 → "카드 등록에 실패했습니다" 표시, 쿼리 제거, register-key 미호출
  - 성공 쿼리 복귀(가짜 빌링키, 비로그인) → register-key 1회 호출 → 401 → `/ko/auth` 이동
  - 페이지 에러 0건
- **미검증**: 실제 빌링키 결제·결제 조회·빌링키 삭제 (실결제 금지). 로그인 상태 세션 쿠키 갱신.
  0007 SQL 실행.

### 알려진 한계 / 확인 필요
- **KCP 빌링키 결제의 고객 정보 필수 항목 미확정.** 문서 요약상 이름·전화번호·이메일이
  필수일 수 있다. 현재는 customer.id, email, OAuth 메타데이터의 이름(있을 때)만 보낸다.
  첫 실결제에서 PG 오류가 나면 결제 행 failure_reason 을 확인할 것.
- 결과 불명(202) 후 포트원에 결제 건이 없어 5분 뒤 failed 로 정리되는 경우, 그 시도의
  빌링키는 정리 경로에서 알 수 없어 포트원에 남는다 (드묾).
- 검증 불일치(PAID 인데 금액·키·고객 불일치)는 자동 처리하지 않고 pending 으로 남겨
  사용자가 잠긴다. 서버 로그 "manual review needed" 로 확인 후 수동 조치.
- 첫 결제 성공 시 구독관리 링크로 이동하는 화면을 보여준다. 결제 페이지 자체는 새로고침
  전까지 갱신되지 않는다 (의도).

### 배포 순서 (Kevin)
1. Supabase SQL Editor 에서 `0006_web_payments.sql` 적용
2. 이어서 `0007_web_payments_pending_lock.sql` 적용
3. 테스트 계정 행(web_subscriptions) 삭제
4. push → 롤아웃 성공 확인
5. 실카드로 결제 1건 확인 → 웹 `/account/subscription` 표시, `web_payments` paid 행,
   포트원 콘솔 결제 내역 확인 → 필요 시 콘솔에서 결제 취소(환불)
6. Phase 1 의 `0005` 는 아직이면 5 확인 후 적용

0006·0007 적용 전에 배포되면 pending insert 가 실패해 결제 호출 없이 500 으로 끝난다
(출금 없음).

### Phase 3 이후로 넘긴 것
웹훅 처리·멱등성, 월별 자동청구 스케줄러, 미납 처리, 만료 처리 스케줄러화.

## 2026-10-18 — 결제 Phase 1: 서버 권한 기반과 데이터 구조

### 시크릿 (Secret Manager)
`apphosting.yaml` 에서 아래 세 개를 RUNTIME 전용 `secret:` 참조로 둔다.
값은 Kevin 이 직접 등록한다. 저장소·채팅·셸 히스토리에 값을 남기지 말 것.

| 환경변수 | Secret Manager 이름 | 값 출처 |
|---|---|---|
| SUPABASE_SERVICE_ROLE_KEY | supabase-service-role-key | Supabase 대시보드 > Project Settings > API > service_role |
| PORTONE_API_SECRET | portone-api-secret | 포트원 콘솔 > 결제 연동 > 연동 정보 > V2 API Secret |
| PORTONE_WEBHOOK_SECRET | portone-webhook-secret | 포트원 콘솔 > 결제 연동 > 웹훅 > 웹훅 시크릿 |

등록 (값은 프롬프트에서 입력. 명령줄 인자로 넘기지 말 것):
```sh
firebase apphosting:secrets:set supabase-service-role-key --project sniff-by-hatch-app
firebase apphosting:secrets:set portone-api-secret --project sniff-by-hatch-app
firebase apphosting:secrets:set portone-webhook-secret --project sniff-by-hatch-app
```

`secrets:set` 이 백엔드 접근 권한 부여를 묻지 않았거나 거절했다면:
```sh
firebase apphosting:secrets:grantaccess supabase-service-role-key,portone-api-secret,portone-webhook-secret \
  --backend sniff-web-server --project sniff-by-hatch-app
```

확인:
```sh
firebase apphosting:secrets:describe supabase-service-role-key --project sniff-by-hatch-app
```

참조된 시크릿이 하나라도 없거나 접근 권한이 없으면 롤아웃이 실패한다.

### 변경 내용 (커밋별)
| 커밋 | 파일 | 내용 |
|---|---|---|
| 620e8c3 | `src/utils/supabase/admin.ts`, `.env.example` | service role 서버 전용 클라이언트. `server-only`, 호출 시점에 키 확인 |
| 468b27b | `apphosting.yaml`, `PROGRESS.md` | 시크릿 3개 RUNTIME 전용 secret 참조 |
| c1989b2 | register-key·cancel·resume 라우트, `src/lib/subscription.ts` | `web_subscriptions` 쓰기 4곳을 admin 클라이언트로. 읽기·세션 확인은 그대로 |
| b42a605 | `supabase/migrations/0005_…`, `0006_web_payments.sql` | RLS 쓰기 정책 제거, 결제 이력 테이블. **미적용** |
| 12e531b | `src/lib/billing/constants.ts` | `SNIFF_PREMIUM_MONTHLY_PRICE = 3300` (VAT 포함), 미연결 |

판단 기록:
- admin 클라이언트는 RLS 를 우회하므로 만료 정리 update 에 `.eq("user_id", userId)` 를 추가했다.
  다른 세 곳은 이미 user_id 로 한정돼 있었다.
- 만료 정리에서 admin 클라이언트 생성이 실패하면(키 미설정) 예외를 잡아 기존 실패 경로와
  같은 결과(화면상 canceled)를 돌려준다. 결제·구독관리 페이지가 500 이 되지 않게 하려는 것.
  register-key·cancel·resume 은 키가 없으면 500 이 되고, 클라이언트는 기존 실패 문구를 보여준다.
- 트리거 함수는 리포에 기존 것이 없어 `public.web_set_updated_at()` 으로 새로 만들었다.
  실DB 에 앱 쪽 `set_updated_at` 류가 있을 수 있어 덮어쓰지 않도록 웹 전용 이름을 썼다.
- `web_payments.user_id` 는 FK 없음(계정 삭제 후 결제 기록 보존). `subscription_id` 는
  `on delete set null` 이라 구독 행이 cascade 로 지워져도 결제 행은 남는다.
- 이중 청구 방지는 `(subscription_id, period_start) where status in ('pending','paid')` 부분 unique.

### 검증
- `npm run build` 통과 (exit 0). billing 3개·webhook 라우트, payment·account/subscription 페이지 정상 등록.
- `.next/static`(클라이언트 번들)에 `SUPABASE_SERVICE_ROLE_KEY`·`createAdminClient`·
  `SNIFF_PREMIUM_MONTHLY_PRICE` 참조 0건. 서버 청크에만 존재.
- `npx tsc --noEmit` 은 `.next/dev/types/validator.ts` 의 삭제된 `test-payment` 참조 1건만
  보고 (로컬 dev 캐시 잔재, 이번 변경과 무관. 다음 `npm run dev` 때 재생성됨).
- **미검증**: 마이그레이션 SQL 은 실행해 보지 않았다 (로컬 Postgres 없음, Docker 데몬 꺼짐).
  Supabase SQL Editor 적용 시 오류가 나면 트랜잭션(begin/commit)이라 전체가 롤백된다.
- **미검증**: 실제 service role 키로의 쓰기 동작. 시크릿 등록·배포 후 확인 필요.

### 배포 순서 (Kevin) — 순서를 지킬 것
1. 포트원 콘솔에서 V2 API Secret, 웹훅 시크릿 발급
2. 시크릿 3개 Secret Manager 등록 + 백엔드 접근 권한 부여 (위 명령어)
3. `0006_web_payments.sql` 적용 (독립적이라 언제든 가능)
4. push → 롤아웃 성공 확인 → 카드 등록·해지·해지취소 동작 확인
5. `0005_web_subscriptions_lock_writes.sql` 적용

주의:
- 2 전에 push 하면 롤아웃이 실패한다 (참조된 시크릿 부재).
- 4 전에 0005 를 적용하면 현재 프로덕션 코드의 카드 등록·해지가 RLS 에 막힌다.
- 시크릿이 들어가면 코드 변경 없이 동작이 달라지는 곳: 카드정보(카드사·마스킹 번호) 조회가
  실제 호출되고, 해지 만료 시 빌링키가 포트원에서 실제 삭제되며, 웹훅이 500 대신
  서명 검증 후 200 을 반환한다. 4 단계 확인 때 함께 볼 것.
- 웹훅은 아직 로그만 남긴다 (처리는 Phase 2).

### Phase 2 로 넘긴 것
즉시 청구, 빌링키 소유자 검증, 모바일 리다이렉트 복귀, 웹훅 처리·멱등성, 월별 청구,
미납 처리, 만료 처리 스케줄러화, 월말 날짜 계산, 미들웨어 세션 쿠키 버그.

## 결제 현황 점검 (2026-10-18)

읽기 전용 점검. 코드·스키마·패키지 변경 없음, 실결제/테스트결제 호출 없음.
Supabase 실DB는 조회하지 않았고 마이그레이션 파일과 코드 기준으로 판단했다.

### 직전 상태 요약
- 마지막 PROGRESS 항목(2026-08-15): 포트원 실연동(live) 채널 전환, `/test-payment` 삭제,
  자동갱신 고지 추가. 구현 범위는 "빌링키 발급(카드 등록)까지".
- PROGRESS 미기록 커밋(2026-08-18): 정기자동결제 그룹아이디 미설정 오류
  ("batchPaymentGroupId를 가져오는데 실패") 해결 과정에서 채널 재생성 → 채널키 교체,
  PG 에러 원문 화면 노출 제거, `/api` 를 i18n 미들웨어에서 제외(404 수정),
  PG 인증서 gitignore 패턴 추가. 이후(10월) 커밋은 결제와 무관.
- `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET` 은 `apphosting.yaml` 에서 여전히 주석 상태.

### 결제 관련 파일
| 파일 | 역할 |
|---|---|
| `src/components/payment/SubscribeButton.tsx` | 브라우저 SDK `requestIssueBillingKey` 호출 → `/api/billing/register-key` POST |
| `src/app/api/billing/register-key/route.ts` | 세션 user_id 로 `web_subscriptions` upsert (status=active, next_billing_date=+1개월) |
| `src/app/api/billing/cancel-subscription/route.ts` | active → cancel_scheduled, service_end_date=next_billing_date |
| `src/app/api/billing/resume-subscription/route.ts` | cancel_scheduled → active |
| `src/app/api/webhook/portone/route.ts` | 웹훅 서명 검증 후 type 로그만 남기고 200 |
| `src/lib/portone/config.ts` | storeId/channelKey/모드 환경변수 읽기 |
| `src/lib/portone/server.ts` | 서버 SDK 클라이언트, 빌링키 삭제, 카드정보 조회 |
| `src/lib/subscription.ts` | 구독 조회 + 조회 시점에 만료된 해지예약을 canceled 로 정리(빌링키 삭제) |
| `src/app/[locale]/payment/page.tsx` | 결제 페이지. 구독 중이면 구독관리 링크로 대체 |
| `src/app/[locale]/account/subscription/page.tsx`, `src/components/account/SubscriptionManager.tsx` | 구독관리(해지/해지취소) UI |
| `middleware.ts`, `src/utils/supabase/middleware.ts` | 세션 갱신 + next-intl. `/api/` 는 매처에서 제외 |
| `supabase/migrations/0001~0004`, `supabase/inspect_subscriptions.sql` | 0003 만 유효. 0001·0002 실행 금지, 0004 실행 보류 |
| 진입 링크 | `sniff`, `pricing`, `auth/success`, navbar, footer → `/payment`, `/account/subscription` |

### 항목별 판정
| 항목 | 판정 | 근거 |
|---|---|---|
| 빌링키 발급(register-key) | 부분 구현 | `SubscribeButton.tsx:48-76`, `register-key/route.ts:5-56`. iframe(데스크톱) 흐름만 처리. 모바일 리다이렉트 복귀(`redirectUrl`, `SubscribeButton.tsx:58`)의 쿼리 파라미터를 받는 코드가 어디에도 없음. 빌링키 유효성·소유자 서버 검증 없음 |
| 발급 직후 첫 결제(즉시 청구) | 없음 | `payWithBillingKey` 호출 0건. 카드 등록만으로 status=active 가 됨(`register-key/route.ts:37`) |
| 3,300원 금액 상수 | 없음(표시 문구만) | `messages/ko.json:170,194,552,563,578`, `en.json` 동일 줄. 코드 상수 없음 |
| 결제 이력 테이블·저장 | 없음 | 테이블·코드 모두 0건 |
| 월별 자동청구 스케줄러 | 없음 | cron/Scheduler/`createPaymentSchedule` 0건. `subscription.ts:26` 주석에 "스케줄러 인프라 없음" 명시 |
| 웹훅 수신 | 부분 구현 | `webhook/portone/route.ts:12-27` 서명 검증은 구현. 이벤트 처리·DB 반영 없음(`:29-31`). 시크릿 미등록으로 현재 운영에선 항상 500(`:5-9`) |
| 웹훅 멱등성 | 없음 | 웹훅 ID 저장·중복 체크 없음 |
| 해지(cancel_scheduled)·기간 유지 | 구현됨(조건부) | `cancel-subscription/route.ts:33-51`, `subscription.ts:29-60`. 단 컬럼명은 `current_period_end` 가 아니라 `next_billing_date`/`service_end_date`. 만료 정리는 사용자가 페이지에 접근할 때만 일어남 |
| 미납 시 구독 차단 | 없음 | 미납 상태값(past_due 등) 없음. 웹에는 구독으로 잠그는 기능 자체가 없음(2026-08-05 기록) |

### Supabase 참조
- 테이블: `public.web_subscriptions` 하나뿐 (`register-key:32`, `cancel:40`, `resume:32`, `subscription.ts:47,68`). RPC 호출 0건.
- 컬럼(0003): id, user_id(unique), billing_key, plan(default 'sniff_premium'), status,
  next_billing_date, service_end_date, canceled_at, started_at, card_brand,
  card_number_masked, created_at, updated_at.
- status CHECK: `active`, `cancel_scheduled`, `canceled`.
- RLS: 본인 행 select/insert/update 3정책. delete 정책 없음.
- `public.subscriptions` 는 앱 전용. 웹 코드 참조 0건. 0002 오염 컬럼은 0004 승인 대기.

### apphosting.yaml 환경변수 (이름만)
| 변수 | 상태 | availability |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | 활성, value | BUILD, RUNTIME |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 활성, value | BUILD, RUNTIME |
| NEXT_PUBLIC_SITE_URL | 활성, value | BUILD, RUNTIME |
| NEXT_PUBLIC_PORTONE_STORE_ID | 활성, value | BUILD, RUNTIME |
| NEXT_PUBLIC_PORTONE_CHANNEL_KEY | 활성, value | BUILD, RUNTIME |
| NEXT_PUBLIC_PORTONE_MODE | 활성, value | BUILD, RUNTIME |
| PORTONE_WEBHOOK_SECRET | 주석, secret 참조 | RUNTIME |
| PORTONE_API_SECRET | 주석, secret 참조 | RUNTIME |
| NEXT_PUBLIC_SHOW_UPCOMING_SERVICES | 주석, value | BUILD, RUNTIME |

Supabase service role 키는 어디에도 없다.

### 발견한 문제점
1. **카드 등록만으로 active.** 첫 결제 없이 status=active, next_billing_date=+1개월이 되고,
   그 날짜에 청구할 주체도 없다. 사실상 무료 구독이 생성된다.
2. **RLS 가 사용자에게 구독 행 직접 쓰기를 허용.** anon 키로 브라우저에서 status·
   next_billing_date·billing_key 를 임의로 insert/update 할 수 있다. 웹에 프리미엄 게이트가
   생기거나 앱이 이 테이블을 보기 시작하면 결제 우회 경로가 된다.
3. **모바일 리다이렉트 흐름 미처리.** 모바일 결제창은 `redirectUrl` 로 돌아오며 결과를
   쿼리로 넘기는데, 결제 페이지가 이를 읽지 않아 빌링키가 저장되지 않는다.
4. **register-key 가 빌링키를 검증하지 않음.** 아무 문자열이나 보내도 active 로 저장된다.
   카드정보 조회는 실패해도 통과(`server.ts:51-55`), API 시크릿 미설정이면 조회 자체를 건너뜀.
5. **서버 권한 경로 부재.** 웹훅·스케줄러는 사용자 세션이 없어 현재 RLS 로는 DB 를 쓸 수 없다.
   service role 키(Secret Manager)가 필요하다.
6. **만료 처리가 접근 의존.** 해지예약 사용자가 다시 방문하지 않으면 canceled 전환과
   빌링키 삭제가 영원히 일어나지 않는다.
7. **next_billing_date 월말 오버플로.** `setMonth(+1)` 은 1/31 → 3/3 처럼 밀린다
   (`register-key/route.ts:29-30`).
8. **미들웨어가 갱신된 세션 쿠키를 버림.** `middleware.ts:9-10` 에서 `updateSession` 응답을
   무시하고 intl 응답만 반환한다. 토큰 갱신 쿠키가 브라우저에 안 내려가 간헐적 로그아웃
   원인이 될 수 있다. 결제 API 의 401 로 이어질 수 있다.
9. **재구독 시 기존 빌링키 미삭제.** upsert 로 덮어써 이전 빌링키가 포트원에 남는다.

### 구현 우선순위 제안
1. 서버 전용 Supabase 클라이언트(service role, Secret Manager) 추가. RLS 의 insert/update
   정책을 제거해 구독 행 쓰기를 서버로 한정.
2. `PORTONE_API_SECRET`·`PORTONE_WEBHOOK_SECRET` Secret Manager 등록 후 apphosting.yaml 주석 해제.
3. 금액·주문명 서버 상수(3,300 KRW) 정의, 결제 이력 테이블(payment_id unique, status, amount,
   paid_at, failure_reason) 신설.
4. register-key 재설계: 빌링키 조회로 소유자(customerId) 검증 → 즉시 `payWithBillingKey` 3,300원 →
   결제 조회로 PAID 확인 후에만 active, 기간 설정. 모바일 리다이렉트 복귀 처리 포함.
5. 웹훅 처리: 이벤트 ID 기반 멱등 테이블, 결제 상태는 웹훅 본문이 아니라 API 재조회로 확정.
6. 월별 청구: 포트원 결제예약(`createPaymentSchedule`)으로 다음 회차 예약하는 방식과
   Cloud Scheduler → 내부 청구 엔드포인트 방식 중 선택. 해지 시 예약 취소 연동.
7. 미납 처리: status 에 past_due 추가, 재시도 횟수·유예기간 정책 결정 후 차단.
8. 만료 처리를 스케줄러로 이전, 월말 날짜 계산 수정, 미들웨어 쿠키 버그 수정.

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
