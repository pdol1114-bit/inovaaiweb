-- 해지 정책: 당월 이용 후 종료. 해지를 신청해도 service_end_date 까지는 이용 가능하고,
-- 그 전까지는 해지를 취소(resume)할 수 있다.
--
-- status 전이: active -> cancel_scheduled -> canceled
--              cancel_scheduled -> active (해지 취소)

alter table public.subscriptions
    add column if not exists canceled_at timestamptz,
    add column if not exists service_end_date timestamptz,
    add column if not exists started_at timestamptz not null default now(),
    add column if not exists card_brand text,
    add column if not exists card_number_masked text;

-- status CHECK 제약은 제거했다.
--
-- 이 테이블은 웹 전용이 아니라 Sniff 앱의 구독 게이트가 이미 쓰고 있었고,
-- 앱이 'expired'·'trial' 등 다른 status를 쓰면 제약에 걸려 앱 구독 갱신·만료
-- 처리가 실패한다. 실제로 이 제약이 운영 DB에 적용됐다가 수동으로 드롭됐으므로,
-- 이 파일을 다시 실행해도 재발하지 않도록 여기서도 뺀다.
--
-- 웹 결제 코드는 status 값을 항상 명시하므로 제약 없이도 동작한다.
-- 앱과 웹의 status 집합을 정리한 뒤에 다시 도입할지 판단할 것.

-- 종료일이 지난 예약 건을 찾기 위한 인덱스 (접근 시점 체크에서 사용)
create index if not exists subscriptions_cancel_scheduled_idx
    on public.subscriptions (service_end_date)
    where status = 'cancel_scheduled';
