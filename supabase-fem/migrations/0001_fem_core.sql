-- FEM 전용 Supabase 프로젝트의 스키마. 기본(Sniff·결제) 프로젝트의 supabase/migrations 와 별개다.
--
-- !! 이 파일은 FEM 전용 프로젝트에만 적용한다. 기본 프로젝트에 적용하지 말 것.
-- !! 프로젝트 생성·적용은 별도 승인 대상이다. 적용 순서는 "마이그레이션 → 코드 배포".
--
-- FEM 회원 = 이 프로젝트의 auth.users (Google·Apple 로그인). 기본 프로젝트의 사용자 ID와 무관하다.
--
--  1. fem_subscriptions : FEM 계정의 구독 상태. 서버(service role)만 쓴다.
--                         결제 연동이 이 표를 채우는 방식은 아직 정해지지 않았다(별도 결정·승인 대상).
--                         행이 없으면 구독 없음이다. 가입·로그인만으로는 행이 생기지 않는다.
--  2. fem_jobs          : 작업 이력과 월 이용 횟수 기준.
--  3. fem_reserve_job() : 사용자 단위 잠금 안에서 "이번 달 사용량 확인 + 행 생성"을 한 번에 한다.

create table if not exists public.fem_subscriptions (
    user_id uuid primary key references auth.users (id) on delete cascade,
    plan text not null default 'fem_pro',
    status text not null,
    service_end_date timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fem_subscriptions_status_check
        check (status in ('active', 'cancel_scheduled', 'past_due', 'canceled'))
);

alter table public.fem_subscriptions enable row level security;

drop policy if exists "Members can read own fem subscription" on public.fem_subscriptions;
create policy "Members can read own fem subscription"
    on public.fem_subscriptions for select
    using (auth.uid() = user_id);

-- 쓰기 정책 없음 + 권한 회수: 브라우저 세션 역할은 구독 상태를 만들거나 바꿀 수 없다.
revoke insert, update, delete, truncate on public.fem_subscriptions from anon, authenticated;

create table if not exists public.fem_jobs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    plan text not null default 'fem_pro',
    status text not null default 'awaiting_upload',
    file_name text not null,
    file_format text not null,
    file_size_bytes bigint not null,
    settings jsonb not null default '{}'::jsonb,
    engine_job_id text,
    metrics jsonb,
    error_message text,
    -- 브라우저가 만든 요청 키. (user_id, request_key) 유일 → 재시도가 새 작업·새 차감을 만들지 않는다.
    request_key uuid,
    -- 월 이용 횟수에 세는지. 규칙은 웹 서버(job-service.ts)가 정한다.
    counts_toward_quota boolean not null default true,
    -- 엔진 판정과 오류 코드.
    result text,
    error_code text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint fem_jobs_status_check
        check (status in ('awaiting_upload', 'queued', 'running', 'completed', 'failed', 'canceled')),
    constraint fem_jobs_result_check
        check (result is null or result in ('success', 'warning', 'failed'))
);

create index if not exists fem_jobs_user_created_idx
    on public.fem_jobs (user_id, created_at desc);

create unique index if not exists fem_jobs_user_request_key_idx
    on public.fem_jobs (user_id, request_key) where request_key is not null;

create index if not exists fem_jobs_user_quota_idx
    on public.fem_jobs (user_id, created_at) where counts_toward_quota;

alter table public.fem_jobs enable row level security;

drop policy if exists "Members can read own fem jobs" on public.fem_jobs;
create policy "Members can read own fem jobs"
    on public.fem_jobs for select
    using (auth.uid() = user_id);

revoke insert, update, delete, truncate on public.fem_jobs from anon, authenticated;

create or replace function public.fem_reserve_job(
    p_user_id uuid,
    p_request_key uuid,
    p_plan text,
    p_file_name text,
    p_file_format text,
    p_file_size_bytes bigint,
    p_settings jsonb,
    p_month_start timestamptz,
    p_monthly_limit integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_job public.fem_jobs;
    v_used integer;
begin
    if p_user_id is null or p_request_key is null or p_monthly_limit is null or p_monthly_limit < 0 then
        raise exception 'fem_reserve_job: invalid arguments';
    end if;

    -- 같은 사용자의 동시 요청을 줄 세운다(트랜잭션이 끝나면 풀린다).
    perform pg_advisory_xact_lock(hashtextextended('fem_jobs:' || p_user_id::text, 0));

    select count(*) into v_used
      from public.fem_jobs
     where user_id = p_user_id and counts_toward_quota and created_at >= p_month_start;

    select * into v_job from public.fem_jobs
     where user_id = p_user_id and request_key = p_request_key;
    if found then
        return jsonb_build_object('kind', 'existing', 'used', v_used, 'job', to_jsonb(v_job));
    end if;

    if v_used >= p_monthly_limit then
        return jsonb_build_object('kind', 'quota_exceeded', 'used', v_used, 'job', null);
    end if;

    insert into public.fem_jobs
        (user_id, plan, status, file_name, file_format, file_size_bytes, settings, request_key, counts_toward_quota)
    values
        (p_user_id, p_plan, 'awaiting_upload', p_file_name, p_file_format, p_file_size_bytes, p_settings,
         p_request_key, true)
    returning * into v_job;

    return jsonb_build_object('kind', 'created', 'used', v_used + 1, 'job', to_jsonb(v_job));
end;
$$;

-- 서버(service role)만 호출한다. 브라우저 세션 역할에서는 실행할 수 없다.
revoke all on function public.fem_reserve_job(uuid, uuid, text, text, text, bigint, jsonb, timestamptz, integer) from public;
revoke all on function public.fem_reserve_job(uuid, uuid, text, text, text, bigint, jsonb, timestamptz, integer) from anon, authenticated;
grant execute on function public.fem_reserve_job(uuid, uuid, text, text, text, bigint, jsonb, timestamptz, integer) to service_role;
