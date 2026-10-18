-- web_subscriptions 의 사용자 직접 쓰기(insert/update) 차단.
--
-- 0003 은 본인 행 insert/update 를 허용했다. 브라우저의 anon 키로 status·
-- next_billing_date·billing_key 를 임의로 쓸 수 있어 결제 우회 경로가 된다.
-- 이후 모든 쓰기는 서버 권한 클라이언트(src/utils/supabase/admin.ts, service role)로만 한다.
-- select(본인 행) 정책은 유지한다.
--
-- ⚠️ 적용 순서 — 반드시 지킬 것
--   1) SUPABASE_SERVICE_ROLE_KEY 시크릿 등록
--   2) 쓰기 경로를 admin 클라이언트로 옮긴 커밋(c1989b2)이 프로덕션에 롤아웃된 것을 확인
--   3) 카드 등록·해지·해지취소가 정상 동작하는 것을 확인
--   4) 그 다음에 이 파일을 적용
--   먼저 적용하면 구 코드의 세션 클라이언트 쓰기가 전부 RLS 에 막혀 카드 등록·해지가 실패한다.
--
-- 되돌리기: 0003 의 두 create policy 문을 다시 실행하면 된다.

begin;

drop policy if exists "Users can insert own web subscription" on public.web_subscriptions;
drop policy if exists "Users can update own web subscription" on public.web_subscriptions;

commit;

-- 확인용 (남아 있어야 할 정책은 select 1개)
-- select policyname, cmd from pg_policies
-- where schemaname = 'public' and tablename = 'web_subscriptions';
