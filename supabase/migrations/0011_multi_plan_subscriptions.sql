-- !! 운영 DB 에 적용하지 말 것 (2026-11-16). 운영에는 0012_billing_plan_compat.sql 만 적용한다.
--    이 파일은 "한 사용자 한 구독" 조건을 없애고 FEM 작업 테이블을 만든다. FEM 은 별도 프로젝트로 분리할 예정이다.
--    아래 SQL 은 바꾸지 않았다(로컬 시험·이력 보존용).
--
-- 다중 서비스/플랜 구독 지원 및 FEM 메싱 작업 이력·월간 쿼터 테이블.
--
-- 기존 web_subscriptions 는 (user_id) 단독 유니크였으나, Sniff Premium 과
-- FEM AI Pro 를 독립적으로 구독·해지할 수 있도록 (user_id, plan) 복합 유니크로 확장한다.
-- 기존 sniff_premium 행은 그대로 유지된다.

drop index if exists public.web_subscriptions_user_id_key;

create unique index if not exists web_subscriptions_user_id_plan_key
    on public.web_subscriptions (user_id, plan);

alter table public.web_payments
    add column if not exists plan text not null default 'sniff_premium';

-- FEM AI Pro 월간 실행 이력 및 쿼터(월 40회) 관리 테이블.
-- 쓰기는 서버(service_role) 전용이며, 사용자는 본인 작업 이력만 조회할 수 있다.
create table if not exists public.fem_jobs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    plan text not null default 'fem_pro',
    status text not null default 'queued',
    file_name text not null,
    file_format text not null,
    file_size_bytes bigint not null,
    settings jsonb not null default '{}'::jsonb,
    engine_job_id text,
    metrics jsonb,
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fem_jobs_status_check
        check (status in ('queued', 'running', 'completed', 'failed', 'canceled'))
);

create index if not exists fem_jobs_user_created_idx
    on public.fem_jobs (user_id, created_at desc);

alter table public.fem_jobs enable row level security;

create policy "Users can read own fem jobs"
    on public.fem_jobs for select
    using (auth.uid() = user_id);

