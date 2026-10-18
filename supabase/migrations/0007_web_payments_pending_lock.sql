-- 첫 결제(카드 등록 즉시 청구) 동시 요청 잠금.
--
-- 사용자당 진행 중(pending) 결제를 1건으로 제한한다. register-key 는 포트원 결제를
-- 호출하기 전에 pending 행을 먼저 insert 하고, 이 인덱스에 걸리면(23505) 다른 요청이
-- 진행 중인 것으로 보고 409 를 반환한다. 더블클릭·모바일 복귀 새로고침 등으로
-- 같은 사용자의 결제가 동시에 두 번 나가는 것을 DB 수준에서 막는다.
--
-- 5분 넘게 pending 으로 남은 행(서버 중단 등)은 다음 요청 시 포트원 결제 조회로
-- paid/failed 로 정리된 뒤 잠금이 풀린다 (src/lib/billing/initial-charge.ts).
--
-- 의존: 0006_web_payments.sql. push 전에 0006 → 0007 순으로 적용할 것.

create unique index if not exists web_payments_one_pending_per_user
    on public.web_payments (user_id)
    where status = 'pending';
