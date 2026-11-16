#!/bin/sh
# FEM 전용 프로젝트 스키마(supabase-fem/migrations)를 일회용 로컬 Postgres(docker)에서 시험한다. 운영 DB에 접속하지 않는다.
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../../.." && pwd)"
NAME=fem-sql-test-$$
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=local-test-only postgres:16-alpine >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1' EXIT
for i in $(seq 1 60); do docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 0.5; done; sleep 1
P="docker exec -i $NAME psql -U postgres -v ON_ERROR_STOP=1 -qAt"
$P < "$HERE/setup.sql"
$P < "$ROOT/supabase-fem/migrations/0001_fem_core.sql"
$P < "$ROOT/supabase-fem/migrations/0001_fem_core.sql"     # 다시 적용해도 같아야 한다
U=11111111-1111-4111-8111-111111111111
call() { echo "select public.fem_reserve_job('$U', '$1', 'fem_pro', 'f.step', 'STEP', 10, '{}'::jsonb, date_trunc('month', now()), $2)->>'kind';"; }
# 60개의 동시 요청, 한도 40 -> 정확히 40개만 생성
for i in $(seq 1 60); do (call "$(uuidgen | tr A-Z a-z)" 40 | $P > "/tmp/$NAME.$i" 2>&1 &) ; done
sleep 6
echo "concurrent 60 @ limit 40: created=$(cat /tmp/$NAME.* | grep -c created) quota_exceeded=$(cat /tmp/$NAME.* | grep -c quota_exceeded) other=$(cat /tmp/$NAME.* | grep -vc 'created\|quota_exceeded' || true)"
rm -f /tmp/$NAME.*
echo "rows counted: $($P -c "select count(*) from fem_jobs where user_id='$U' and counts_toward_quota")"
# 같은 요청 키를 동시에 20번 -> 행 1개
$P -c "delete from fem_jobs where user_id='$U'"
K=$(uuidgen | tr A-Z a-z)
for i in $(seq 1 20); do (call "$K" 40 | $P > "/tmp/$NAME.k$i" 2>&1 &) ; done
sleep 4
echo "same key x20: created=$(cat /tmp/$NAME.k* | grep -c created) existing=$(cat /tmp/$NAME.k* | grep -c existing) rows=$($P -c "select count(*) from fem_jobs where user_id='$U'")"
rm -f /tmp/$NAME.k*
# 차감 제외로 바뀐 행은 자리를 돌려준다
$P -c "update fem_jobs set counts_toward_quota=false, status='canceled' where user_id='$U'"
echo "after release, limit 1: $(call "$(uuidgen | tr A-Z a-z)" 1 | $P) then $(call "$(uuidgen | tr A-Z a-z)" 1 | $P)"
# 한도에 걸려도 기존 키의 재시도는 기존 행을 돌려준다
echo "retry of an existing key at the limit: $(call "$K" 0 | $P)"
echo "status check accepts awaiting_upload: $($P -c "select count(*) from fem_jobs where status='awaiting_upload'")"
echo "browser roles cannot call it: anon=$($P -c "select has_function_privilege('anon', 'public.fem_reserve_job(uuid,uuid,text,text,text,bigint,jsonb,timestamptz,integer)', 'execute')") authenticated=$($P -c "select has_function_privilege('authenticated', 'public.fem_reserve_job(uuid,uuid,text,text,text,bigint,jsonb,timestamptz,integer)', 'execute')") service_role=$($P -c "select has_function_privilege('service_role', 'public.fem_reserve_job(uuid,uuid,text,text,text,bigint,jsonb,timestamptz,integer)', 'execute')")"
echo "bad arguments are refused: $($P -c "select public.fem_reserve_job(null, gen_random_uuid(), 'p','f','F',1,'{}', now(), 40)" 2>&1 | grep -c 'invalid arguments')"
$P -c "grant usage on schema public to anon, authenticated" ; $P -c "grant select on public.fem_subscriptions, public.fem_jobs to authenticated"
$P -c "insert into fem_subscriptions (user_id, status) values ('$U', 'active')"
AS() { echo "set role authenticated; set request.jwt.claim.sub = '$1'; $2"; }
echo "member reads only their own subscription: own=$(AS $U 'select count(*) from fem_subscriptions;' | $P | tail -1) other=$(AS 22222222-2222-4222-8222-222222222222 'select count(*) from fem_subscriptions;' | $P | tail -1)"
echo "member cannot grant themselves a subscription: $(AS 22222222-2222-4222-8222-222222222222 "insert into fem_subscriptions (user_id, status) values ('22222222-2222-4222-8222-222222222222', 'active');" | $P 2>&1 | grep -c 'permission denied')"
echo "member cannot change their subscription: $(AS $U "update fem_subscriptions set status='active';" | $P 2>&1 | grep -c 'permission denied')"
echo "member cannot insert or edit jobs: $(AS $U "insert into fem_jobs (user_id, file_name, file_format, file_size_bytes) values ('$U','f','F',1);" | $P 2>&1 | grep -c 'permission denied') $(AS $U "update fem_jobs set counts_toward_quota=false;" | $P 2>&1 | grep -c 'permission denied')"
echo "unknown subscription status is refused: $($P -c "update fem_subscriptions set status='free'" 2>&1 | grep -c 'fem_subscriptions_status_check')"
