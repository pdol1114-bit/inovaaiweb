-- 결제 Phase 5: web_notifications 메일 발송 상태 관리 (Resend).
--
-- 상태 전이: pending → sending(선점) → sent
--                               ↘ failed(재시도 대기 또는 최종) → sending ...
-- - 선점: status ∈ (pending, failed) 이고 attempts 가 기대값일 때만 sending 으로 바꾼다
--   (UPDATE … WHERE … RETURNING). 동시 실행 중 하나만 발송한다.
-- - sending 으로 10분 넘게 멈춘 행은 cron 이 pending 으로 되돌린다 (sending_started_at).
-- - 재시도: 최대 5회, 간격 1h·1h·24h·24h (next_attempt_at). 영구 오류는 next_attempt_at=null.
-- - Resend Idempotency-Key = notification id (24시간 중복 발송 방지).
-- - dedupe_key: 같은 사건의 대기열 중복 기록 방지 (예: kind:subscription_id:due_date).
--   기록은 on conflict do nothing.
-- 기존 행은 status 기본값 pending 그대로 발송 대상이 된다. 행은 삭제하지 않고 상태로만 관리.
--
-- 의존: 0009. push 전에 적용할 것.

begin;

alter table public.web_notifications
    drop constraint if exists web_notifications_status_check;
alter table public.web_notifications
    add constraint web_notifications_status_check
        check (status in ('pending', 'sending', 'sent', 'failed'));

alter table public.web_notifications
    add column if not exists attempts integer not null default 0,
    add column if not exists last_error text,
    add column if not exists provider_message_id text,
    add column if not exists sending_started_at timestamptz,
    add column if not exists next_attempt_at timestamptz,
    add column if not exists dedupe_key text;

alter table public.web_notifications
    drop constraint if exists web_notifications_attempts_check;
alter table public.web_notifications
    add constraint web_notifications_attempts_check check (attempts >= 0);

-- null 은 여러 개 허용 (unique 는 null 끼리 충돌하지 않음)
create unique index if not exists web_notifications_dedupe_key_key
    on public.web_notifications (dedupe_key);

create index if not exists web_notifications_retry_idx
    on public.web_notifications (next_attempt_at)
    where status = 'failed';
create index if not exists web_notifications_sending_idx
    on public.web_notifications (sending_started_at)
    where status = 'sending';

comment on column public.web_notifications.attempts is '발송 시도 횟수 (선점 시 +1). payload.charge_attempts(결제 시도)와 별개';
comment on column public.web_notifications.last_error is '마지막 발송 실패 사유 (짧은 코드. 본문·수신 주소·키 미포함)';
comment on column public.web_notifications.provider_message_id is 'Resend email id';
comment on column public.web_notifications.next_attempt_at is 'failed 재시도 시각. null 이면 최종 실패';
comment on column public.web_notifications.dedupe_key is '같은 사건 중복 기록 방지 키 (kind:subscription_id:due_date)';

commit;
