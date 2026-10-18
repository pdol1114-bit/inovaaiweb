-- 포트원 웹훅 멱등성 기록 + 이중 청구 방지 인덱스 갱신.
--
-- 1) web_webhook_events
--    처리를 마친 웹훅의 ID(webhook-id 헤더)를 기록한다. 같은 ID가 다시 오면
--    (포트원 재전송) 처리 없이 200 을 돌려준다. 기록은 처리 성공 "후"에 남긴다.
--    처리 전에 '처리 중' 행을 먼저 넣으면 서버가 중간에 죽었을 때 그 웹훅의
--    재전송이 모두 무시되기 때문이다. 처리 로직 자체가 멱등이라 동시 중복 처리도 안전하다.
--    쓰기·읽기 모두 서버 권한 클라이언트(service role)만 한다. RLS 는 켜고 정책은 두지 않는다.
--
-- 2) web_payments_one_active_charge_per_period 재생성
--    부분 취소(partial_cancelled)된 결제도 그 회차의 결제로 남아야 한다.
--    기존 조건(pending, paid)이면 부분 취소 후 같은 회차를 다시 청구할 수 있게 된다.
--
-- 의존: 0006_web_payments.sql. push 전에 적용할 것.

begin;

create table if not exists public.web_webhook_events (
    webhook_id text primary key,
    event_type text not null,
    payment_id text,
    result text not null,
    detail text,
    received_at timestamptz not null default now(),
    constraint web_webhook_events_result_check
        check (result in ('processed', 'ignored', 'needs_review'))
);

comment on table public.web_webhook_events is
    '처리 완료한 포트원 웹훅 기록 (멱등성). webhook_id = webhook-id 헤더.';
comment on column public.web_webhook_events.result is
    'processed: 반영(또는 이미 반영돼 할 일 없음) / ignored: 우리 결제 아님·미확정 상태 / needs_review: 수동 확인 필요';

create index if not exists web_webhook_events_payment_id_idx
    on public.web_webhook_events (payment_id);

alter table public.web_webhook_events enable row level security;
-- 정책 없음: anon/authenticated 접근 불가, service role 만 사용.

drop index if exists public.web_payments_one_active_charge_per_period;
create unique index web_payments_one_active_charge_per_period
    on public.web_payments (subscription_id, period_start)
    where status in ('pending', 'paid', 'partial_cancelled');

commit;
