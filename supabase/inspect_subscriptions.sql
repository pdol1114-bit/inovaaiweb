-- public.subscriptions 현황 조사 (읽기 전용 — 데이터 변경 없음)
-- Supabase SQL Editor에 통째로 붙여넣고 실행하세요.

-- 1) 컬럼 전체: 이름 / 타입 / null 허용 / 기본값
select
    ordinal_position                as "순번",
    column_name                     as "컬럼",
    data_type                       as "타입",
    is_nullable                     as "null허용",
    column_default                  as "기본값"
from information_schema.columns
where table_schema = 'public' and table_name = 'subscriptions'
order by ordinal_position;

-- 2) 제약조건 전체 (PK / FK / UNIQUE / CHECK)
select
    con.conname                             as "제약명",
    case con.contype
        when 'p' then 'PRIMARY KEY'
        when 'f' then 'FOREIGN KEY'
        when 'u' then 'UNIQUE'
        when 'c' then 'CHECK'
        else con.contype::text
    end                                     as "종류",
    pg_get_constraintdef(con.oid)           as "정의"
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace ns on ns.oid = rel.relnamespace
where ns.nspname = 'public' and rel.relname = 'subscriptions'
order by con.contype, con.conname;

-- 3) 인덱스 (user_id 유니크 인덱스 존재 여부가 핵심)
select indexname as "인덱스명", indexdef as "정의"
from pg_indexes
where schemaname = 'public' and tablename = 'subscriptions'
order by indexname;

-- 4) RLS 정책
select policyname as "정책명", cmd as "대상", qual as "using", with_check as "with_check"
from pg_policies
where schemaname = 'public' and tablename = 'subscriptions'
order by policyname;

select relrowsecurity as "RLS_활성화"
from pg_class where oid = 'public.subscriptions'::regclass;

-- 5) 실제 데이터 분포 (개인정보 노출 최소화를 위해 집계만)
select count(*) as "전체행수" from public.subscriptions;

select status as "status", provider as "provider", count(*) as "건수"
from public.subscriptions
group by status, provider
order by count(*) desc;

-- 6) 한 사용자가 여러 구독 행을 갖는지 (user_id 유니크 적용 가능 여부 판단)
select count(*) as "user_id_중복_사용자수"
from (
    select user_id from public.subscriptions
    group by user_id having count(*) > 1
) t;

-- 7) 우리 웹 결제 코드가 요구하는 컬럼 중 누락된 것 찾기
with required(column_name) as (
    values ('id'), ('user_id'), ('billing_key'), ('plan'), ('status'),
           ('next_billing_date'), ('service_end_date'), ('canceled_at'),
           ('started_at'), ('card_brand'), ('card_number_masked'), ('updated_at')
)
select r.column_name as "필요컬럼",
       case when c.column_name is null then '❌ 누락' else '✅ 존재' end as "상태",
       c.data_type as "타입", c.is_nullable as "null허용"
from required r
left join information_schema.columns c
       on c.table_schema = 'public'
      and c.table_name  = 'subscriptions'
      and c.column_name = r.column_name
order by (c.column_name is null) desc, r.column_name;
