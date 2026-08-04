-- ⚠️⚠️ 실행 보류 — 승인 전까지 Supabase에서 실행하지 말 것 ⚠️⚠️
--
-- 목적
--   0002 마이그레이션이 웹 전용 테이블을 만드는 줄 알고 public.subscriptions 에
--   컬럼 5개와 인덱스 1개를 추가했다. 그런데 이 테이블은 Sniff 앱의 구독 게이트가
--   이미 쓰고 있던 테이블이었다. 웹 구독은 0003 의 web_subscriptions 로 분리했으므로
--   앱 테이블에 남은 오염을 되돌린다.
--
-- ⚠️ 실행 전 반드시 확인할 것
--   아래 컬럼들을 **앱 백엔드(다른 저장소)가 이미 참조하고 있지 않은지** 확인해야 한다.
--   0002 적용 이후 앱 쪽에서 이 컬럼을 읽거나 쓰기 시작했다면 drop 시 앱이 깨진다.
--   특히 canceled_at / service_end_date 는 앱 구독 해지 흐름에서 쓰기 쉬운 이름이다.
--
--   확인 방법: 앱 백엔드 레포에서 아래 이름들을 grep
--     canceled_at, service_end_date, started_at, card_brand, card_number_masked
--   하나라도 쓰이고 있으면 해당 줄을 주석 처리하고 나머지만 실행할 것.
--
-- 참고
--   drop column 은 되돌릴 수 없다(값도 함께 사라진다). 실행 전 백업 권장.
--   0002 는 이 컬럼들을 기존 2개 행에도 채웠는데, started_at 은 실제 가입일이 아니라
--   0002 실행 시각으로 채워진 값이라 의미가 없다.

alter table public.subscriptions
    drop column if exists canceled_at,
    drop column if exists service_end_date,
    drop column if exists started_at,
    drop column if exists card_brand,
    drop column if exists card_number_masked;

drop index if exists public.subscriptions_cancel_scheduled_idx;

-- status CHECK 제약(subscriptions_status_check)은 이미 수동으로 드롭 완료됐다.
-- 혹시 남아 있다면 아래도 함께 실행할 것.
-- alter table public.subscriptions drop constraint if exists subscriptions_status_check;
