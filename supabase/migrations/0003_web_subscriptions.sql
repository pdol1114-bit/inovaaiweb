-- 웹 정기결제(포트원 빌링키) 전용 테이블.
--
-- public.subscriptions 는 Sniff 앱의 구독 게이트가 이미 쓰고 있던 테이블이라
-- (provider / product_id / external_subscription_id 등 앱스토어용 컬럼 보유),
-- 웹 결제 데이터를 같은 테이블에 넣으면 다음 문제가 생긴다:
--   1) register-key 의 upsert(onConflict: user_id)가 앱 구독 행을 덮어씀
--   2) subscriptions 의 유니크는 (user_id) WHERE status='active' 인 부분 유니크라
--      onConflict: user_id 가 정상 동작하지 않음
--   3) 사용자가 앱·웹 구독을 동시에 가지면 단일 행 조회(.maybeSingle())가 깨짐
-- 따라서 웹 구독은 이 테이블로 완전히 분리한다. 앱 테이블은 건드리지 않는다.

create table if not exists public.web_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    -- 구독 종료 시 빌링키를 삭제하고 null 로 비우므로 nullable 이어야 한다.
    billing_key text,
    plan text not null default 'sniff_premium',
    status text not null default 'active',
    next_billing_date timestamptz,
    service_end_date timestamptz,
    canceled_at timestamptz,
    started_at timestamptz not null default now(),
    card_brand text,
    card_number_masked text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint web_subscriptions_status_check
        check (status in ('active', 'cancel_scheduled', 'canceled'))
);

-- 웹 구독은 사용자당 1개. 부분 유니크가 아닌 단독 유니크여야
-- register-key 의 upsert(onConflict: "user_id")가 동작한다.
create unique index if not exists web_subscriptions_user_id_key
    on public.web_subscriptions (user_id);

-- 이용 종료일이 지난 해지 예약 건을 접근 시점에 정리하기 위한 인덱스
create index if not exists web_subscriptions_cancel_scheduled_idx
    on public.web_subscriptions (service_end_date)
    where status = 'cancel_scheduled';

alter table public.web_subscriptions enable row level security;

create policy "Users can read own web subscription"
    on public.web_subscriptions for select
    using (auth.uid() = user_id);

create policy "Users can insert own web subscription"
    on public.web_subscriptions for insert
    with check (auth.uid() = user_id);

create policy "Users can update own web subscription"
    on public.web_subscriptions for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
