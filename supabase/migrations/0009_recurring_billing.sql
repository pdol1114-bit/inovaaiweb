-- 결제 Phase 4: 매월 자동청구 · 미납(past_due) · 안내 대기열.
--
-- 미납 일정 (D = next_billing_date 의 KST 날짜, 배치는 매일 KST 10~14시 매시 실행)
--   D     1차 청구 실패 → past_due, failed_attempts=1, next_retry_at=D+1 00:00 KST,
--                          grace_ends_at=D+3 23:59:59 KST
--   D+1   재시도 실패   → failed_attempts=2, next_retry_at=D+3 00:00 KST
--   D+3   마지막 재시도 실패 → canceled, service_end_date=지금, 빌링키 삭제, 안내 대기열 기록
--   재시도 성공 → active, 재시도 컬럼 초기화, 다음 결제일은 started_at 기준 다음 회차
-- 미납 중에는 next_billing_date 를 바꾸지 않는다 (미납 회차의 결제일 D 를 뜻한다).
--
-- 의존: 0003, 0006. push 전에 적용할 것.

begin;

-- 1) web_subscriptions: past_due 상태 + 재시도 관리 컬럼
alter table public.web_subscriptions
    drop constraint if exists web_subscriptions_status_check;
alter table public.web_subscriptions
    add constraint web_subscriptions_status_check
        check (status in ('active', 'cancel_scheduled', 'past_due', 'canceled'));

alter table public.web_subscriptions
    add column if not exists failed_attempts integer not null default 0,
    add column if not exists next_retry_at timestamptz,
    add column if not exists grace_ends_at timestamptz;

alter table public.web_subscriptions
    drop constraint if exists web_subscriptions_failed_attempts_check;
alter table public.web_subscriptions
    add constraint web_subscriptions_failed_attempts_check check (failed_attempts >= 0);

comment on column public.web_subscriptions.failed_attempts is '현재 미납 회차의 청구 실패 횟수 (성공 시 0)';
comment on column public.web_subscriptions.next_retry_at is 'past_due 다음 재시도 시각';
comment on column public.web_subscriptions.grace_ends_at is 'past_due 유예 종료 시각 (결제일 D+3 일 끝, KST)';

-- 배치 조회용
create index if not exists web_subscriptions_due_idx
    on public.web_subscriptions (next_billing_date)
    where status = 'active';
create index if not exists web_subscriptions_retry_idx
    on public.web_subscriptions (next_retry_at)
    where status = 'past_due';

-- 2) web_payments.kind: 첫 결제(initial)와 정기 청구(recurring) 구분.
--    결제 확정 시 첫 결제는 started_at(기준일)을 새로 쓰고, 정기 청구는 기준일을 유지한 채
--    next_billing_date 만 다음 회차로 넘긴다.
alter table public.web_payments
    add column if not exists kind text not null default 'initial';
alter table public.web_payments
    drop constraint if exists web_payments_kind_check;
alter table public.web_payments
    add constraint web_payments_kind_check check (kind in ('initial', 'recurring'));

-- 대사(최근 paid 재조회)용
create index if not exists web_payments_paid_at_idx
    on public.web_payments (paid_at)
    where status = 'paid';

-- 3) web_notifications: 안내 메일 대기열.
--    메일 발송 수단이 아직 없어 기록만 한다. 발송 실패가 청구·상태 처리를 막지 않도록 분리.
create table if not exists public.web_notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    kind text not null,
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'pending',
    created_at timestamptz not null default now(),
    sent_at timestamptz,
    constraint web_notifications_status_check check (status in ('pending', 'sent', 'failed'))
);

comment on table public.web_notifications is
    '사용자 안내 메일 대기열. 메일 발송 수단 연동 전까지 pending 으로 쌓인다.';
comment on column public.web_notifications.user_id is
    'FK 없음: 계정 삭제 후에도 발송 이력 보존 (web_payments.user_id 와 같은 원칙)';

create index if not exists web_notifications_pending_idx
    on public.web_notifications (created_at)
    where status = 'pending';

alter table public.web_notifications enable row level security;
-- 정책 없음: service role 만 사용.

commit;
