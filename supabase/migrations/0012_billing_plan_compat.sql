-- 결제 코드가 쓰는 플랜 컬럼·유일 조건을 기존 스키마에 맞춘다 (최소 호환 변경).
--
-- 배경: 0011(다중 플랜 + FEM 작업 테이블)을 전제로 한 결제 코드가 배포됐지만 운영 DB 에는 0011 이 적용되지 않았다.
--       그 상태에서는
--         (1) 첫 결제·정기결제가 web_payments.plan 에 쓰려다 결제 호출 전에 실패하고,
--         (2) (1)만 고치면 결제 승인 뒤 구독 저장(upsert … on conflict (user_id, plan))이
--             "일치하는 유일 조건 없음"으로 실패한다 — 돈은 나갔는데 구독이 생기지 않는다.
--       그래서 두 가지를 반드시 함께 적용한다.
--
-- 이 파일은 0011 을 대신한다. **운영 DB 에 0011 을 적용하지 말 것**: 0011 은 "한 사용자 한 구독" 조건을 없애고
-- FEM 작업 테이블(fem_jobs)을 만든다. FEM 회원·작업·결제는 별도 프로젝트로 분리할 예정이라 이 DB 에 두지 않는다.
--
-- 변경 (추가만 한다. 기존 컬럼·제약·인덱스·정책·데이터는 건드리지 않는다)
--   1. web_payments.plan                     : 결제 대상 플랜. 기존 행은 'sniff_premium'.
--   2. web_subscriptions_user_id_plan_key    : (user_id, plan) 유일 인덱스. 구독 저장의 충돌 대상.
--
-- 유지: web_subscriptions_user_id_key (user_id 유일). 한 사용자가 구독을 하나만 갖는 기존 규칙은 그대로다.
--       (user_id) 유일이면 (user_id, plan) 도 항상 유일하므로 2번 인덱스는 어떤 기존 데이터에서도 만들어진다.
--
-- 0011 이 이미 적용된 DB(로컬 등)에 실행해도 오류 없이 지나가며 아무것도 바꾸지 않는다.
-- 그 DB 에는 (user_id) 유일 인덱스가 없지만 여기서 다시 만들지 않는다(기존 데이터와 충돌할 수 있다).

begin;

alter table public.web_payments
    add column if not exists plan text not null default 'sniff_premium';

comment on column public.web_payments.plan is
    '결제 대상 플랜. 금액 대조(웹훅·대사)에 쓴다. 신규 판매 가능 여부는 서버 코드(src/lib/billing/sales.ts)가 정한다.';

create unique index if not exists web_subscriptions_user_id_plan_key
    on public.web_subscriptions (user_id, plan);

commit;
