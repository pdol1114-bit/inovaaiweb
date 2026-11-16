/**
 * 실제 세션으로 웹 API를 호출하는 시험 (격리된 로컬 환경 전용 — 운영 Supabase에 쓰지 말 것).
 *
 * FEM 회원은 FEM 전용 Supabase 프로젝트에 있다. 그래서 일회용 로컬 Supabase가 **두 개** 필요하다:
 *   기본(Sniff·결제) 프로젝트: supabase/migrations 0001~0010 + 0012(운영과 같은 형태. 0011 은 적용하지 않는다)      → FEM_E2E_MAIN_URL / _MAIN_ANON_KEY / _MAIN_SERVICE_KEY
 *   FEM 전용 프로젝트:         supabase-fem/migrations            → FEM_E2E_SUPABASE_URL / _ANON_KEY / _SERVICE_KEY
 * 그리고 두 프로젝트를 보도록 빌드·실행한 웹 서버(FEM_E2E_WEB_URL), 실제 엔진에 연결된 로컬 워커, 샘플(FEM_E2E_SAMPLES).
 * 환경변수가 없으면 건너뛴다.
 *
 * 시험 계정은 이메일·비밀번호로 만든다(로컬 인증 서버의 관리자 API). 서비스에는 비밀번호 가입 기능이 없다 —
 * 여기서 확인하는 것은 "유효한 Supabase 세션 쿠키"에 대한 서버의 판단이며, Google·Apple OAuth 왕복은 다루지 않는다.
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const WEB = process.env.FEM_E2E_WEB_URL, SB = process.env.FEM_E2E_SUPABASE_URL, ANON = process.env.FEM_E2E_ANON_KEY,
  SERVICE = process.env.FEM_E2E_SERVICE_KEY, SAMPLES = process.env.FEM_E2E_SAMPLES,
  MAIN = process.env.FEM_E2E_MAIN_URL, MAIN_ANON = process.env.FEM_E2E_MAIN_ANON_KEY, MAIN_SERVICE = process.env.FEM_E2E_MAIN_SERVICE_KEY;
const enabled = Boolean(WEB && SB && ANON && SERVICE && SAMPLES && MAIN && MAIN_ANON && MAIN_SERVICE);
const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)[:/]/;
if (enabled && !(LOCAL.test(SB) && LOCAL.test(MAIN))) throw new Error('refusing to run against a non-local Supabase');
if (enabled && new URL(SB).origin === new URL(MAIN).origin) throw new Error('the FEM project and the main project must be different');
const skip = { skip: !enabled };
const adminOf = (url, key) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = enabled ? adminOf(SB, SERVICE) : null;          // FEM project
const mainAdmin = enabled ? adminOf(MAIN, MAIN_SERVICE) : null; // main (Sniff) project
const sha = (b) => createHash('sha256').update(b).digest('hex');
const users = {};
const FEM_COOKIE = 'sb-fem-auth-token';

/** A signed-in session on one project. `fem` = FEM subscription row to create (status), or null for none. */
async function makeSession(name, { project, fem = null, mainPlans = [] }) {
  const [url, anon, adm] = project === 'fem' ? [SB, ANON, admin] : [MAIN, MAIN_ANON, mainAdmin];
  const email = `${name}-${randomUUID().slice(0, 8)}@fem-test.invalid`, password = randomUUID();
  const { data, error } = await adm.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(error, null);
  if (fem) {
    const r = await admin.from('fem_subscriptions').insert({ user_id: data.user.id, ...fem });
    assert.equal(r.error, null);
  }
  for (const plan of mainPlans) {
    const r = await mainAdmin.from('web_subscriptions').insert({ user_id: data.user.id, plan, status: 'active' });
    assert.equal(r.error, null);
  }
  const jar = new Map();
  const client = createServerClient(url, anon, {
    ...(project === 'fem' ? { cookieOptions: { name: FEM_COOKIE } } : {}),
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    } });
  const s = await client.auth.signInWithPassword({ email, password });
  assert.equal(s.error, null);
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  return { id: data.user.id, email, client, cookie, frozenCookie: cookie() };
}

const call = (path, { user, cookie, ...init } = {}) =>
  fetch(`${WEB}${path}`, { redirect: 'manual', ...init, headers: { ...(init.headers ?? {}), ...(user || cookie ? { Cookie: cookie ?? user.cookie() } : {}) } });
const body = (o) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
const create = (user, extra = {}, headers = {}) => {
  const data = readFileSync(join(SAMPLES, 'box.step'));
  const init = body({ requestKey: randomUUID(), fileName: 'box.step', fileSize: data.length, settings: { size: 5, strategy: 'hex' }, ...extra });
  return call('/api/fem/jobs', { user, ...init, headers: { ...init.headers, ...headers } }).then(async (r) => ({ r, j: await r.json(), data }));
};
const JOB_PATHS = (id) => [['GET', `/api/fem/jobs/${id}`], ['POST', `/api/fem/jobs/${id}/start`], ['PUT', `/api/fem/jobs/${id}/upload`],
  ['GET', `/api/fem/jobs/${id}/download?format=inp`], ['GET', `/api/fem/jobs/${id}/download?format=msh`], ['GET', `/api/fem/jobs/${id}/preview`]];
let jobA = null;

test('setup: FEM members A and B (subscribed), C (no subscription), D (canceled); Sniff accounts S (fem_pro subscription in the main project) and S1 (Sniff subscription)', skip, async () => {
  users.A = await makeSession('a', { project: 'fem', fem: { status: 'active' } });
  users.B = await makeSession('b', { project: 'fem', fem: { status: 'active' } });
  users.C = await makeSession('c', { project: 'fem' });
  users.D = await makeSession('d', { project: 'fem', fem: { status: 'canceled' } });
  // 기본 DB 는 한 사용자 한 구독이다(0012). 가장 강한 경우를 본다: 기본 DB 에 fem_pro 구독이 있는 Sniff 계정, 그리고 Sniff 구독 계정.
  users.S = await makeSession('s', { project: 'main', mainPlans: ['fem_pro'] });
  users.S1 = await makeSession('s1', { project: 'main', mainPlans: ['sniff_premium'] });
  assert.ok(users.A.frozenCookie.includes(`${FEM_COOKIE}`));
  assert.ok(!users.S.frozenCookie.includes(FEM_COOKIE));       // the two projects use different cookies
});

test('separate members: a Sniff account is not a FEM member, whatever it is subscribed to', skip, async () => {
  for (const u of [users.S, users.S1]) {
    const a = await (await call('/api/fem/jobs', { user: u })).json();
    assert.deepEqual([a.authConfigured, a.authenticated, a.account, a.subscribed, a.quota], [true, false, null, false, null]);
    assert.equal((await create(u)).r.status, 401);
  }
  for (const [method, path] of JOB_PATHS(randomUUID())) {
    const r = await call(path, { user: users.S, method, ...(method === 'PUT' ? { body: 'x', headers: { 'Content-Length': '1' } } : {}) });
    assert.equal(r.status, 401, `${method} ${path}`);
  }
  // the Sniff account does not exist in the FEM project, and the FEM members do not exist in the main project
  assert.notEqual((await admin.auth.admin.getUserById(users.S.id)).error, null);
  assert.notEqual((await mainAdmin.auth.admin.getUserById(users.A.id)).error, null);
  // both sessions in one browser: FEM sees the FEM account, and the Sniff session is still its own account
  const both = await (await call('/api/fem/jobs', { cookie: `${users.S.cookie()}; ${users.C.cookie()}` })).json();
  assert.deepEqual([both.authenticated, both.account, both.subscribed], [true, users.C.email, false]);
  assert.equal((await users.S.client.auth.getUser()).data.user.id, users.S.id);
});

test('1. not signed in: the page data says so, and every run / result path is refused', skip, async () => {
  const a = await (await call('/api/fem/jobs')).json();
  assert.deepEqual([a.authConfigured, a.authenticated, a.account, a.subscribed, a.quota], [true, false, null, false, null]);
  assert.equal((await create(null)).r.status, 401);
  for (const [method, path] of JOB_PATHS(randomUUID())) {
    const r = await call(path, { method, ...(method === 'PUT' ? { body: 'x', headers: { 'Content-Length': '1' } } : {}) });
    assert.equal(r.status, 401, `${method} ${path}`);
    assert.equal((await r.json()).error, 'UNAUTHORIZED');
  }
});

test('5. signed in to FEM but not a FEM subscriber: sign-in and subscription are separate; a canceled subscription does not count', skip, async () => {
  for (const u of [users.C, users.D]) {
    const a = await (await call('/api/fem/jobs', { user: u })).json();
    assert.deepEqual([a.authenticated, a.subscribed, a.quota], [true, false, null]);   // no quota is granted by signing in
    const { r, j } = await create(u);
    assert.deepEqual([r.status, j.error], [403, 'SUBSCRIPTION_REQUIRED']);
    assert.equal((await call(`/api/fem/jobs/${randomUUID()}`, { user: u })).status, 403);
  }
  const rows = await admin.from('fem_jobs').select('id').in('user_id', [users.C.id, users.D.id]);
  assert.equal(rows.data.length, 0);
});

test('3+7. a FEM member with a subscription runs a real job; a forged user id in body and headers is ignored', skip, async () => {
  const before = await (await call('/api/fem/jobs', { user: users.A })).json();
  assert.deepEqual([before.authenticated, before.account, before.subscribed, before.quota.used, before.quota.limit], [true, users.A.email, true, 0, 40]);
  const { r, j, data } = await create(users.A, { userId: users.B.id, user_id: users.B.id }, { 'X-Fem-User-Id': users.B.id, 'X-User-Id': users.B.id });
  assert.equal(r.status, 201);
  jobA = j.id;
  const row = await admin.from('fem_jobs').select('user_id, status, counts_toward_quota').eq('id', jobA).single();
  assert.equal(row.data.user_id, users.A.id);                       // owner = the session user, not the forged id
  assert.equal(j.upload.mode, 'proxy');
  const up = await call(j.upload.url, { user: users.A, method: 'PUT', body: data, headers: { 'Content-Type': 'application/octet-stream' } });
  assert.equal(up.status, 200);
  assert.equal((await call(`/api/fem/jobs/${jobA}/start`, { user: users.A, method: 'POST' })).status, 202);
  let view;
  for (let i = 0; i < 300; i++) {
    view = await (await call(`/api/fem/jobs/${jobA}`, { user: users.A })).json();
    if (['completed', 'failed', 'canceled'].includes(view.status)) break;
    await new Promise((res) => setTimeout(res, 200));
  }
  assert.deepEqual([view.status, view.result, view.sync], ['completed', 'success', 'ok']);
  assert.equal(view.metrics.hex, view.metrics.elements);
  const dl = await call(`/api/fem/jobs/${jobA}/download?format=inp`, { user: users.A });
  const bytes = Buffer.from(await dl.arrayBuffer());
  assert.equal(dl.status, 200);
  assert.equal(sha(bytes), view.artifacts.inp.sha256);
  assert.equal(dl.headers.get('x-content-sha256'), view.artifacts.inp.sha256);
  const pv = await call(`/api/fem/jobs/${jobA}/preview`, { user: users.A });
  assert.equal(pv.status, 200);
  assert.ok((await pv.json()).triangles.length > 0);
  const after = await (await call('/api/fem/jobs', { user: users.A })).json();
  assert.equal(after.quota.used, 1);
  const done = await admin.from('fem_jobs').select('status, result, counts_toward_quota, user_id').eq('id', jobA).single();
  assert.deepEqual(done.data, { status: 'completed', result: 'success', counts_toward_quota: true, user_id: users.A.id });
});

test("6. another signed-in subscriber cannot reach A's job, even with A's id in a header", skip, async () => {
  for (const [method, path] of JOB_PATHS(jobA)) {
    for (const headers of [{}, { 'X-Fem-User-Id': users.A.id }]) {
      const r = await call(path, { user: users.B, method, headers: { ...headers, ...(method === 'PUT' ? { 'Content-Length': '1' } : {}) },
                                   ...(method === 'PUT' ? { body: 'x' } : {}) });
      assert.equal(r.status, 404, `${method} ${path}`);
      assert.equal((await r.json()).error, 'NOT_FOUND');
    }
  }
  // indistinguishable from a job that does not exist
  const missing = await call(`/api/fem/jobs/${randomUUID()}`, { user: users.B });
  assert.deepEqual([missing.status, (await missing.json()).error], [404, 'NOT_FOUND']);
  const mine = await (await call('/api/fem/jobs', { user: users.B })).json();
  assert.equal(mine.quota.used, 0);
});

test('quota on the real database: 45 simultaneous submissions against 39 remaining -> exactly 39 accepted', skip, async () => {
  const results = await Promise.all(Array.from({ length: 45 }, () => create(users.A)));
  const ok = results.filter((x) => x.r.status === 201).length;
  const over = results.filter((x) => x.r.status === 429 && x.j.error === 'QUOTA_EXCEEDED').length;
  assert.deepEqual([ok, over], [39, 6]);
  const a = await (await call('/api/fem/jobs', { user: users.A })).json();
  assert.deepEqual([a.quota.used, a.quota.remaining], [40, 0]);
  const again = await create(users.A);
  assert.equal(again.r.status, 429);
});

test('4. after sign-out the old session cookies no longer work; a tampered cookie never works', skip, async () => {
  const old = users.A.frozenCookie;
  assert.equal((await call(`/api/fem/jobs/${jobA}`, { cookie: old })).status, 200);
  const out = await users.A.client.auth.signOut();
  assert.equal(out.error, null);
  assert.equal((await users.S.client.auth.getUser()).data.user.id, users.S.id);   // signing out of FEM leaves the Sniff session alone
  for (const [method, path] of JOB_PATHS(jobA)) {
    const r = await call(path, { cookie: old, method, ...(method === 'PUT' ? { body: 'x', headers: { 'Content-Length': '1' } } : {}) });
    assert.equal(r.status, 401, `${method} ${path} after sign-out`);
  }
  const a = await (await call('/api/fem/jobs', { cookie: old })).json();
  assert.equal(a.authenticated, false);
  const tampered = users.B.frozenCookie.replace(/.{12}$/, 'AAAAAAAAAAAA');
  assert.equal((await call(`/api/fem/jobs/${jobA}`, { cookie: tampered })).status, 401);
  assert.equal((await create(null)).r.status, 401);
});

test('2+8. sign-in pages and callbacks in both locales never leave the site; existing pages still render', skip, async () => {
  const sameHost = (r) => {
    assert.ok([302, 303, 307, 308].includes(r.status));
    const loc = new URL(r.headers.get('location'), WEB);
    // the server names its own host (the local server reports "localhost" for 127.0.0.1)
    assert.ok(['127.0.0.1', 'localhost'].includes(loc.hostname) && loc.port === new URL(WEB).port, String(loc));
    return loc;
  };
  for (const locale of ['ko', 'en']) {
    // FEM sign-in page: separate-account notice and both providers
    const page = await call(`/${locale}/fem-ai/auth`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes(locale === 'ko' ? '별도로 관리됩니다' : 'managed separately'));
    assert.ok(html.includes('Google') && html.includes('Apple'));
    for (const extra of ['', '&next=%40evil.example', '&next=https%3A%2F%2Fevil.example', '&redirect_to=%2F%2Fevil.example']) {
      // no valid OAuth code here, so the callback must end on the FEM sign-in page of this site
      const loc = sameHost(await call(`/${locale}/fem-ai/auth/callback?code=not-a-real-code${extra}`));
      assert.deepEqual([loc.pathname, loc.search], [`/${locale}/fem-ai/auth`, '?error=failed']);
    }
    assert.equal(sameHost(await call(`/${locale}/fem-ai/auth/callback`)).pathname, `/${locale}/fem-ai/auth`);
    // a failed FEM callback creates no FEM session
    assert.equal((await (await call('/api/fem/jobs')).json()).authenticated, false);
    // the existing (Sniff) sign-in page and callback: unchanged pages, and `next` can no longer send the browser elsewhere
    assert.equal((await call(`/${locale}/auth`)).status, 200);
    for (const next of ['@evil.example', '.evil.example', '//evil.example', 'https://evil.example', `/${locale}/fem-ai`]) {
      const loc = sameHost(await call(`/${locale}/auth/callback?code=not-a-real-code&next=${encodeURIComponent(next)}`));
      assert.equal(loc.pathname, `/${locale}/auth/error`);
    }
    for (const p of ['fem-ai', 'sniff', 'pricing']) assert.equal((await call(`/${locale}/${p}`)).status, 200, `/${locale}/${p}`);
    // pages rendered with a FEM session only, a Sniff session only, and both
    for (const cookie of [users.B.cookie(), users.S.cookie(), `${users.S.cookie()}; ${users.B.cookie()}`]) {
      for (const p of ['fem-ai', 'sniff', 'account/subscription']) {
        assert.ok((await call(`/${locale}/${p}`, { cookie })).status < 500, `/${locale}/${p}`);
      }
    }
  }
});

// FEM 신규 판매 차단·결제 회귀(모의 PG)는 tests/billing/sales-block-e2e.test.mjs 가 맡는다(운영 반영분과 같은 시험).
