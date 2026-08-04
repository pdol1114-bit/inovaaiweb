-- 해지 정책: 당월 이용 후 종료. 해지를 신청해도 service_end_date 까지는 이용 가능하고,
-- 그 전까지는 해지를 취소(resume)할 수 있다.
--
-- status 전이: active -> cancel_scheduled -> canceled
--              cancel_scheduled -> active (해지 취소)

alter table public.subscriptions
    add column if not exists canceled_at timestamptz,
    add column if not exists service_end_date timestamptz,
    add column if not exists started_at timestamptz not null default now(),
    add column if not exists card_brand text,
    add column if not exists card_number_masked text;

alter table public.subscriptions
    drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
    add constraint subscriptions_status_check
    check (status in ('active', 'cancel_scheduled', 'canceled'));

-- 종료일이 지난 예약 건을 찾기 위한 인덱스 (접근 시점 체크에서 사용)
create index if not exists subscriptions_cancel_scheduled_idx
    on public.subscriptions (service_end_date)
    where status = 'cancel_scheduled';
