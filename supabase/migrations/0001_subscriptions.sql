create table if not exists public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    billing_key text not null,
    plan text not null default 'sniff_premium',
    status text not null default 'pending',
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
