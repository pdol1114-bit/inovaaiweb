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
