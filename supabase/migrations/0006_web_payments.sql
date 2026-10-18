-- 웹 정기결제 결제 이력 테이블.
--
-- 포트원 결제 1건 = 1행. 쓰기는 서버 권한 클라이언트(service role)로만 하며,
-- 사용자는 본인 행 조회만 가능하다. 다른 테이블과 독립적이라 언제 적용해도 된다
-- (0003 의 web_subscriptions 만 있으면 됨).

begin;

-- updated_at 자동 갱신 함수. 리포에 기존 트리거 함수가 없고, 실DB 에 앱 쪽 함수가
-- 있을 수 있어 덮어쓰지 않도록 웹 전용 이름을 쓴다.
create or replace function public.web_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table if not exists public.web_payments (
    id uuid primary key default gen_random_uuid(),
    -- 포트원 V2 결제 ID (가맹점이 지정하는 paymentId)
    payment_id text not null,
    user_id uuid not null,
    subscription_id uuid references public.web_subscriptions (id) on delete set null,
    amount integer not null,
    currency text not null default 'KRW',
    status text not null default 'pending',
    failure_reason text,
    period_start timestamptz,
    period_end timestamptz,
    paid_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint web_payments_payment_id_key unique (payment_id),
    constraint web_payments_amount_check check (amount >= 0),
    constraint web_payments_status_check
        check (status in ('pending', 'paid', 'failed', 'cancelled', 'partial_cancelled')),
    constraint web_payments_period_check
        check (period_start is null or period_end is null or period_end > period_start)
);

comment on table public.web_payments is
    '웹 정기결제(포트원) 결제 이력. 전자상거래법상 대금결제 기록 5년 보관 대상.';
comment on column public.web_payments.user_id is
    'FK 없음: 계정 삭제 후에도 결제 기록 보존. auth.users.id 값을 그대로 저장한다.';
comment on column public.web_payments.subscription_id is
    '구독 행 삭제(계정 삭제 cascade) 시 null 로 바뀌고 결제 행은 남는다.';
comment on column public.web_payments.payment_id is
    '포트원 V2 paymentId. 멱등성 키로 쓴다.';

create index if not exists web_payments_user_id_idx
    on public.web_payments (user_id);

-- 같은 구독·같은 회차의 이중 청구 방지. 진행 중(pending)이거나 성공(paid)한 행만
-- 하나로 제한하고, 실패(failed) 행은 재시도 때문에 여러 개 생길 수 있게 둔다.
create unique index if not exists web_payments_one_active_charge_per_period
    on public.web_payments (subscription_id, period_start)
    where status in ('pending', 'paid');

drop trigger if exists web_payments_set_updated_at on public.web_payments;
create trigger web_payments_set_updated_at
    before update on public.web_payments
    for each row execute function public.web_set_updated_at();

alter table public.web_payments enable row level security;

-- 본인 행 조회만 허용. insert/update/delete 정책은 의도적으로 두지 않는다.
create policy "Users can read own web payments"
    on public.web_payments for select
    using (auth.uid() = user_id);

commit;
