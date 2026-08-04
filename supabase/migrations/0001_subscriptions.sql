-- ⚠️ 이 마이그레이션은 의도대로 적용되지 않았음.
--
-- 실행 시점에 public.subscriptions 테이블이 이미 존재했고(Sniff 앱 구독 게이트용),
-- `create table if not exists` 라서 아무 일도 일어나지 않았다(no-op).
-- 따라서 여기 정의된 billing_key / plan / next_billing_date 컬럼과 RLS 정책은
-- 실제 DB에 존재하지 않는다.
--
-- 웹 정기결제는 0003_web_subscriptions.sql 의 public.web_subscriptions 를 쓴다.
-- 이 파일은 이력 보존용으로만 남긴다. 실행하지 말 것.

create table if not exists public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    -- 구독 종료 시 빌링키를 삭제하고 null 로 비우므로 nullable 이어야 한다.
    billing_key text,
    plan text not null default 'sniff_premium',
    status text not null default 'active',
    next_billing_date timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_user_id_key
    on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

create policy "Users can read own subscription"
    on public.subscriptions for select
    using (auth.uid() = user_id);

create policy "Users can insert own subscription"
    on public.subscriptions for insert
    with check (auth.uid() = user_id);

create policy "Users can update own subscription"
    on public.subscriptions for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
