/**
 * FEM 신규 판매 차단 + 기존 결제 경로 회귀 시험 (격리된 로컬 환경 전용 — 운영 Supabase·실제 PG 에 쓰지 말 것).
 *
 * 필요한 것
 *   - 일회용 로컬 Supabase (supabase/migrations 적용)
 *   - 그 Supabase 를 보도록 빌드하고 모의 PG 와 함께 띄운 웹 서버:
 *       NODE_OPTIONS="--require tests/billing/mock-pg-preload.cjs" next start
 *   - 환경변수: BILLING_E2E_WEB_URL, _SUPABASE_URL, _ANON_KEY, _SERVICE_KEY, _PG_LOG, _PG_STATE, _CRON_SECRET, _WEBHOOK_SECRET
 *               BILLING_E2E_SCHEMA = prod_plus_0012 (0001~0010 + 0012: 운영에 적용하려는 형태)
 *                                  | with_0011 (기본. 0001~0012 전부) | prod_like (0001~0010 만 — web_payments.plan 없음)
 *               BILLING_E2E_DB_CONTAINER (선택) = 로컬 DB 컨테이너 이름. 있으면 "결제 승인 후 구독 저장 실패" 상황을 만들어 복구를 시험한다.
 *   환경변수가 없으면 전부 건너뛴다.
 *
 * 시험 계정은 로컬 인증 서버의 관리자 API 로 만든다(서비스에는 비밀번호 가입이 없다). 실제 결제창·빌링키 발급·청구는 없다.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const E = process.env;
const WEB = E.BILLING_E2E_WEB_URL, SB = E.BILLING_E2E_SUPABASE_URL, ANON = E.BILLING_E2E_ANON_KEY, SERVICE = E.BILLING_E2E_SERVICE_KEY,
  PG_LOG = E.BILLING_E2E_PG_LOG, PG_STATE = E.BILLING_E2E_PG_STATE, CRON = E.BILLING_E2E_CRON_SECRET, WHSEC = E.BILLING_E2E_WEBHOOK_SECRET;
const SCHEMA = E.BILLING_E2E_SCHEMA ?? 'with_0011', DB_CONTAINER = E.BILLING_E2E_DB_CONTAINER;
const canPay = SCHEMA !== 'prod_like';
const enabled = Boolean(WEB && SB && ANON && SERVICE && PG_LOG && PG_STATE && CRON && WHSEC);
if (enabled && !/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(SB)) throw new Error('refusing to run against a non-local Supabase');
const skip = { skip: !enabled };
const admin = enabled ? createClient(SB, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const users = {};

const pgCalls = () => { try { return readFileSync(PG_LOG, 'utf8').split('\n').filter(Boolean); } catch { return []; } };
const pgState = () => { try { return JSON.parse(readFileSync(PG_STATE, 'utf8')); } catch { return {}; } };
const setPg = (fn) => { const s = pgState(); s.billingKeys ??= {}; s.payments ??= {}; fn(s); writeFileSync(PG_STATE, JSON.stringify(s)); };

async function makeSession(name) {
  const email = `${name}-${randomUUID().slice(0, 8)}@billing-test.invalid`, password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(error, null);
  const jar = new Map();
  const client = createServerClient(SB, ANON, { cookies: {
    getAll: () => [...jar].map(([n, value]) => ({ name: n, value })),
    setAll: (list) => list.forEach(({ name: n, value }) => (value ? jar.set(n, value) : jar.delete(n))),
  } });
  assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);
  return { id: data.user.id, cookie: () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
}
const call = (path, { user, cookie, ...init } = {}) => fetch(`${WEB}${path}`, { redirect: 'manual', ...init,
  headers: { ...(init.headers ?? {}), ...(user || cookie ? { Cookie: cookie ?? user.cookie() } : {}) } });
const post = (o) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
const registerKey = (user, payload) => call('/api/billing/register-key', { user, ...post(payload) }).then(async (r) => { const j = await r.json(); return [r.status, j.error ?? j.status]; });
const count = async (table, userId, extra = {}) => {
  let q = admin.from(table).select('*', { count: 'exact', head: true }).eq('user_id', userId);
  for (const [k, v] of Object.entries(extra)) q = q.eq(k, v);
  const { count: n, error } = await q;
  assert.equal(error, null);
  return n;
};
const sub = async (userId, plan) => (await admin.from('web_subscriptions').select('status, plan, billing_key, next_billing_date').eq('user_id', userId).eq('plan', plan).maybeSingle()).data;
const future = (days) => new Date(Date.now() + days * 864e5).toISOString();

// 포트원 웹훅(Standard Webhooks 서명)을 시험용 시크릿으로 만들어 보낸다.
const whKey = () => Buffer.from(WHSEC.replace(/^whsec_/, ''), 'base64');
const send = async (type, paymentId, { id = `wh_${randomUUID()}`, tamper = false } = {}) => {
  const bodyText = JSON.stringify({ type, timestamp: new Date().toISOString(), data: { paymentId, transactionId: 'mock-tx', storeId: 'mock-store' } });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', whKey()).update(`${id}.${ts}.${bodyText}`).digest('base64');
  const r = await fetch(`${WEB}/api/webhook/portone`, { method: 'POST', body: tamper ? bodyText.replace('mock-tx', 'mock-ty') : bodyText,
    headers: { 'Content-Type': 'application/json', 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': `v1,${sig}` } });
  return [r.status, id];
};
const webhookEvent = async (id) => (await admin.from('web_webhook_events').select('result, detail').eq('webhook_id', id).maybeSingle()).data;

const cron = async () => { const r = await call('/api/cron/billing', { method: 'POST', headers: { Authorization: `Bearer ${CRON}` } }); return [r.status, await r.json()]; };
const chargedFor = (id, status = 'PAID') => Object.values(pgState().payments ?? {}).filter((p) => p.customer.id === id && p.status === status);
const chargeCalls = () => pgCalls().filter((c) => c === 'POST /payments/<id>/billing-key').length;
const psql = (sql) => execFileSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt', '-c', sql], { encoding: 'utf8' }).trim();
/** 기준일에서 정확히 한 달 뒤가 이번 회차 결제일인, 지금 청구 대상인 구독을 만든다. */
async function dueSubscription(user, billingKey, plan = 'sniff_premium') {
  const dueDate = new Date(Date.now() - 3600e3), startDate = new Date(dueDate);
  startDate.setUTCMonth(startDate.getUTCMonth() - 1);
  assert.equal((await admin.from('web_subscriptions').insert({ user_id: user.id, plan, status: 'active', started_at: startDate.toISOString(), next_billing_date: dueDate.toISOString(), billing_key: billingKey })).error, null);
  setPg((s) => { s.billingKeys[billingKey] = { customerId: user.id }; });
  return dueDate.toISOString();
}

const TEXT = {
  ko: { payNow: '지금 구독하기', femPreparing: 'FEM AI Pro 결제 준비 중', unknownPlan: '요금제를 확인할 수 없습니다', heroPreparing: 'FEM Pro 결제 준비 중', pricingPreparing: '결제 준비 중',
    pricingScope: ['STEP / STP / BREP 입력 (최대 50 MiB, mm 단위)', 'Hex 우선 · Tet Only (1차 요소)'],
    accountPreparing: 'FEM AI Pro는 결제 준비 중이라 지금은 새로 구독할 수 없습니다.', repayUnavailable: 'FEM AI Pro는 결제 준비 중이라 새 카드 결제를 받을 수 없습니다. 구독 해지는 아래에서 할 수 있습니다.' },
  en: { payNow: 'Subscribe Now', femPreparing: 'FEM AI Pro payment coming soon', unknownPlan: 'Plan not found', heroPreparing: 'FEM Pro payment coming soon', pricingPreparing: 'Payment coming soon',
    pricingScope: ['STEP / STP / BREP input (up to 50 MiB, mm units)', 'Hex-priority · Tet Only (linear elements)'],
    accountPreparing: 'FEM AI Pro payment is being prepared, so new subscriptions are not available yet.', repayUnavailable: 'FEM AI Pro payment is being prepared, so payment with a new card is not available. You can cancel the subscription below.' },
};
// 페이지에는 번역 묶음 전체가 데이터로도 실려 있다. "문구가 들어 있는지"가 아니라 "요소로 그려졌는지"(>문구<)를 본다.
const shown = (html, text) => html.includes(`>${text}<`);
const FEM_BUY_HREF = /href="[^"]*plan=fem_pro/;
const sdkChunks = async (html) => {
  const hits = [];
  for (const c of new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"'\\ ]+\.js/g)].map((m) => m[0]))) {
    if ((await (await fetch(`${WEB}${c}`)).text()).includes('requestIssueBillingKey')) hits.push(c);
  }
  return hits;
};

test('setup: accounts and existing contracts', skip, async () => {
  users.N = await makeSession('n');                       // no subscription
  users.F = await makeSession('f');                       // existing FEM contract (active)
  users.S = await makeSession('s');                       // existing Sniff contract (active)
  users.X = await makeSession('x');                       // ended FEM contract
  users.D = await makeSession('d');                       // FEM contract in arrears (past_due)
  const rows = [
    { user_id: users.F.id, plan: 'fem_pro', status: 'active', next_billing_date: future(20) },
    { user_id: users.S.id, plan: 'sniff_premium', status: 'active', next_billing_date: future(20) },
    { user_id: users.X.id, plan: 'fem_pro', status: 'canceled' },
    { user_id: users.D.id, plan: 'fem_pro', status: 'past_due', next_billing_date: future(-1), grace_ends_at: future(2), failed_attempts: 1, billing_key: 'bk-d' },
  ];
  for (const row of rows) assert.equal((await admin.from('web_subscriptions').insert(row)).error, null);
  setPg((s) => { s.billingKeys['bk-d'] = { customerId: users.D.id }; });
});

test('1+2. pages: no FEM purchase entry in either locale; FEM and unknown plans never load the payment SDK (direct URL and mobile-return URL)', skip, async () => {
  for (const locale of ['ko', 'en']) {
    const T = TEXT[locale];
    // the payment page sends plans that are not on sale to an SDK-free notice route: follow one redirect and check where it went
    const get = async (path, cookie) => {
      let r = await call(`/${locale}${path}`, { cookie });
      if ([302, 303, 307, 308].includes(r.status)) {
        const loc = new URL(r.headers.get('location'), WEB);
        assert.ok(path.startsWith('/payment?'), `${path}: unexpected redirect`);
        assert.equal(loc.pathname, `/${locale}/payment/unavailable`, path);
        assert.deepEqual([...loc.searchParams.keys()], ['plan'], `${path}: nothing else is carried over`);
        r = await call(loc.pathname + loc.search, { cookie });
      }
      assert.equal(r.status, 200, path);
      return r.text();
    };
    const manageButton = (html) => (html.split('role="status"')[1] ?? '').split('</main>')[0].includes(`href="/${locale}/account/subscription"`);

    for (const [path, cookie] of [['/payment'], ['/payment?plan=fem_pro', users.N.cookie()], ['/payment?plan=fem_pro'],
      ['/payment?plan=fem_pro&transactionType=ISSUE_BILLING_KEY&billingKey=bk-direct', users.N.cookie()],
      ['/payment?plan=fem_pro&transactionType=ISSUE_BILLING_KEY&billingKey=bk-direct&code=x&message=y']]) {
      if (path === '/payment') continue;
      const html = await get(path, cookie);
      assert.ok(shown(html, T.femPreparing) && !shown(html, T.payNow), `${path}: notice, no pay button`);
      assert.deepEqual(await sdkChunks(html), [], `${path}: payment SDK not loaded`);
      assert.ok(!manageButton(html), `${path}: no manage button for a non-subscriber`);
    }
    for (const u of [users.F, users.X, users.D]) assert.ok(manageButton(await get('/payment?plan=fem_pro', u.cookie())), 'existing FEM contract -> manage link');
    for (const q of ['plan=foo', 'plan=FEM_PRO', 'plan=', 'plan=fem_pro&plan=sniff_premium', 'plan=sniff_premium&plan=sniff_premium', 'plan=sniff_premium%20',
      'plan=foo&transactionType=ISSUE_BILLING_KEY&billingKey=bk-direct']) {
      const html = await get(`/payment?${q}`, users.N.cookie());
      assert.ok(shown(html, T.unknownPlan) && !shown(html, T.payNow) && !shown(html, T.femPreparing), q);
      assert.deepEqual(await sdkChunks(html), [], q);
    }
    for (const q of ['', '?plan=sniff_premium']) {       // the notice route with a plan that IS on sale goes back to the purchase page
      const r = await call(`/${locale}/payment/unavailable${q}`);
      assert.ok([302, 303, 307, 308].includes(r.status));
      assert.equal(new URL(r.headers.get('location'), WEB).pathname, `/${locale}/payment`);
    }
    const pages = { '/fem-ai': [null, users.N.cookie(), users.F.cookie()], '/pricing': [null], '/auth/success': [null, users.N.cookie()], '/auth': [null],
      '/account/subscription': [users.F.cookie(), users.S.cookie(), users.X.cookie(), users.D.cookie(), users.N.cookie()], '': [null], '/sniff': [null], '/payment': [null] };
    for (const [path, cookies] of Object.entries(pages)) for (const cookie of cookies) {
      assert.ok(!FEM_BUY_HREF.test(await get(path, cookie)), `${path}: no FEM purchase link`);
    }
    assert.ok(shown(await get('/fem-ai'), T.heroPreparing));
    const pricing = await get('/pricing');
    assert.ok(shown(pricing, T.pricingPreparing));
    for (const line of T.pricingScope) assert.ok(shown(pricing, line), line);          // FEM scope as the engine supports it
    assert.ok(!/<li>[^<]*(100 MiB|혼합|mixed|2차|quadratic)[^<]*<\/li>/.test(pricing), 'old FEM scope text is gone');
    for (const u of [users.X, users.N]) assert.ok(shown(await get('/account/subscription', u.cookie()), T.accountPreparing));
    assert.ok(shown(await get('/account/subscription', users.D.cookie()), T.repayUnavailable));
    assert.ok(!(await get('/account/subscription', users.X.cookie())).includes(`href="/${locale}/payment"`), 'no "subscribe again" for an ended FEM contract');
  }
});

test('5. pages: the Sniff purchase screen, its links and the payment SDK are unchanged', skip, async () => {
  for (const locale of ['ko', 'en']) {
    const T = TEXT[locale];
    for (const [path, cookie] of [['/payment'], ['/payment?plan=sniff_premium'], ['/payment', users.N.cookie()], ['/payment?transactionType=ISSUE_BILLING_KEY&billingKey=bk-x', users.N.cookie()]]) {
      const r = await call(`/${locale}${path}`, { cookie });
      assert.equal(r.status, 200, path);
      const html = await r.text();
      assert.ok(shown(html, T.payNow) && !shown(html, T.femPreparing) && !shown(html, T.unknownPlan), path);
      assert.ok((await sdkChunks(html)).length > 0, `${path}: payment SDK loaded`);
    }
    const text = async (path, cookie) => (await call(`/${locale}${path}`, { cookie })).text();
    assert.ok((await text('/pricing')).includes(`href="/${locale}/payment"`));
    assert.ok((await text('/account/subscription', users.N.cookie())).includes(`href="/${locale}/payment"`));
    assert.ok((await text('/auth/success')).includes(`href="/${locale}/payment"`));
    assert.equal((await call(`/${locale}/auth`)).status, 200);
  }
});

test('3+4. API: FEM and unknown plans are refused before the PG and before any DB write, and are never turned into a Sniff purchase', skip, async () => {
  const before = pgCalls().length, u = users.N;
  setPg((s) => { s.billingKeys['bk-n'] = { customerId: u.id }; });      // a perfectly valid key: the refusal must not depend on the key
  assert.deepEqual(await registerKey(u, { billing_key: 'bk-n', plan: 'fem_pro' }), [403, 'PLAN_NOT_ON_SALE']);
  assert.deepEqual(await registerKey(u, { billing_key: 'bk-n', plan: 'fem_pro', user_id: users.S.id, amount: 1, service: 'sniff' }), [403, 'PLAN_NOT_ON_SALE']);
  for (const plan of ['foo', '', 'FEM_PRO', 'sniff_premium ', 123, true, ['fem_pro'], ['sniff_premium'], {}, '__proto__']) {
    assert.deepEqual(await registerKey(u, { billing_key: 'bk-n', plan }), [400, 'INVALID_PLAN'], JSON.stringify(plan));
  }
  for (const who of [users.F, users.X, users.D]) assert.deepEqual(await registerKey(who, { billing_key: 'bk-n', plan: 'fem_pro' }), [403, 'PLAN_NOT_ON_SALE']);
  assert.deepEqual(await registerKey(null, { billing_key: 'bk-n', plan: 'fem_pro' }), [401, 'UNAUTHORIZED']);
  assert.equal(pgCalls().length, before, 'the PG was not called for any refused request');
  assert.ok(pgState().billingKeys['bk-n'], 'the key was not touched');
  for (const table of ['web_payments', 'web_subscriptions']) assert.equal(await count(table, u.id), 0, table);
  for (const who of [users.F, users.X, users.D]) {
    assert.equal(await count('web_payments', who.id), 0);
    assert.equal(await count('web_subscriptions', who.id), 1);
  }
  assert.equal((await sub(users.D.id, 'fem_pro')).status, 'past_due');
});

test('6. Sniff first payment with the mock PG', skip, async () => {
  const u = users.N, before = pgCalls().length;
  // someone else's key is refused before any charge
  setPg((s) => { s.billingKeys['bk-other'] = { customerId: users.S.id }; s.billingKeys['bk-n'] = { customerId: u.id }; });   // bk-n: this user's own valid key
  assert.deepEqual(await registerKey(u, { billing_key: 'bk-other' }), [403, 'BILLING_KEY_OWNER_MISMATCH']);
  assert.deepEqual(await registerKey(u, { billing_key: 'bk-missing', plan: 'sniff_premium' }), [400, 'INVALID_BILLING_KEY']);
  assert.ok(!pgCalls().slice(before).some((c) => c.startsWith('POST')), 'no charge was requested');

  const result = await registerKey(u, { billing_key: 'bk-n' });
  const charges = () => pgCalls().slice(before).filter((c) => c === 'POST /payments/<id>/billing-key').length;
  if (SCHEMA === 'prod_like') {
    // 운영과 같은 스키마(0011 미적용): 코드가 web_payments.plan 에 쓰려다 결제 호출 전에 실패한다. 청구는 없다.
    assert.deepEqual(result, [500, 'PRECHARGE_FAILED']);
    assert.equal(charges(), 0);
    assert.equal(await count('web_subscriptions', u.id), 0);
    assert.equal(await count('web_payments', u.id), 0);
    return;
  }
  assert.deepEqual(result, [200, 'paid']);
  assert.equal(charges(), 1);
  // the same request sent again (same key): refused, not charged, and the card registration in use is not removed
  assert.deepEqual(await registerKey(u, { billing_key: 'bk-n' }), [409, 'ALREADY_SUBSCRIBED']);
  assert.equal(charges(), 1);
  assert.ok(pgState().billingKeys['bk-n']);
  const paid = Object.values(pgState().payments).filter((p) => p.customer.id === u.id);
  assert.deepEqual(paid.map((p) => [p.status, p.amount.total, p.currency, p.billingKey, /^spi[0-9a-f]{32}$/.test(p.id)]), [['PAID', 3300, 'KRW', 'bk-n', true]]);
  assert.equal(await count('web_payments', u.id, { status: 'paid' }), 1);
  assert.equal(await count('web_payments', u.id), 1);
  const s = await sub(u.id, 'sniff_premium');
  assert.deepEqual([s.status, s.billing_key], ['active', 'bk-n']);
  const days = (new Date(s.next_billing_date) - Date.now()) / 864e5;
  assert.ok(days > 27 && days < 32, `next billing in about a month (${days})`);
  assert.equal(await count('web_subscriptions', u.id), 1);
  // a second attempt does not charge again
  setPg((st) => { st.billingKeys['bk-n2'] = { customerId: u.id }; });
  assert.deepEqual(await registerKey(u, { billing_key: 'bk-n2' }), [409, 'ALREADY_SUBSCRIBED']);
  assert.equal(charges(), 1);
  assert.equal(await count('web_payments', u.id), 1);
});

test('7a. recurring billing batch: a due Sniff subscription is charged once, an existing FEM contract is still processed as before', skip, async () => {
  assert.equal((await call('/api/cron/billing', { method: 'POST' })).status, 401);
  assert.equal((await call('/api/cron/billing', { method: 'POST', headers: { Authorization: 'Bearer wrong' } })).status, 401);
  users.R = await makeSession('r');
  users.G = await makeSession('g');
  // 기준일(started_at)에서 정확히 한 달 뒤가 이번 회차 결제일(due)인 구독: 다음 회차는 기준일 + 두 달이다.
  const dueDate = new Date(Date.now() - 3600e3), startDate = new Date(dueDate);
  startDate.setUTCMonth(startDate.getUTCMonth() - 1);
  const due = dueDate.toISOString(), started = startDate.toISOString();
  assert.equal((await admin.from('web_subscriptions').insert({ user_id: users.R.id, plan: 'sniff_premium', status: 'active', started_at: started, next_billing_date: due, billing_key: 'bk-r' })).error, null);
  assert.equal((await admin.from('web_subscriptions').insert({ user_id: users.G.id, plan: 'fem_pro', status: 'active', started_at: started, next_billing_date: due, billing_key: 'bk-g' })).error, null);
  setPg((s) => { s.billingKeys['bk-r'] = { customerId: users.R.id }; s.billingKeys['bk-g'] = { customerId: users.G.id }; });
  const run = async () => { const r = await call('/api/cron/billing', { method: 'POST', headers: { Authorization: `Bearer ${CRON}` } }); return [r.status, await r.json()]; };
  const charged = (id) => Object.values(pgState().payments).filter((p) => p.customer.id === id);

  const [status] = await run();
  assert.equal(status, 200);
  if (SCHEMA === 'prod_like') {
    // 운영과 같은 스키마: 회차 잠금 행을 만들지 못해(web_payments.plan 없음) 청구가 일어나지 않는다. 구독은 그대로 남는다.
    assert.deepEqual([charged(users.R.id).length, charged(users.G.id).length], [0, 0]);
    assert.equal(await count('web_payments', users.R.id), 0);
    assert.equal(new Date((await sub(users.R.id, 'sniff_premium')).next_billing_date).toISOString(), due);
    return;
  }
  assert.deepEqual(charged(users.R.id).map((p) => [p.status, p.amount.total, p.billingKey, /^spr[0-9a-f]{32}$/.test(p.id)]), [['PAID', 3300, 'bk-r', true]]);
  assert.deepEqual(charged(users.G.id).map((p) => [p.status, p.amount.total, p.billingKey]), [['PAID', 55000, 'bk-g']]);   // existing FEM contract: unchanged behaviour
  for (const [u, plan] of [[users.R, 'sniff_premium'], [users.G, 'fem_pro']]) {
    assert.equal(await count('web_payments', u.id, { status: 'paid', kind: 'recurring' }), 1);
    const s = await sub(u.id, plan);
    assert.equal(s.status, 'active');
    assert.ok(new Date(s.next_billing_date) > new Date(Date.now() + 20 * 864e5), 'moved to the next period');
  }
  await run();                                             // running the batch again does not charge the same period twice
  assert.deepEqual([charged(users.R.id).length, charged(users.G.id).length], [1, 1]);
  assert.equal(await count('web_payments', users.R.id), 1);
  // contracts that are not due were not charged
  for (const u of [users.F, users.S]) assert.equal(charged(u.id).length, 0);
});

test('7b. webhook: signature required, unknown payments ignored, repeats are harmless, a full cancellation ends the subscription', skip, async () => {
  assert.equal((await fetch(`${WEB}/api/webhook/portone`, { method: 'POST', body: '{}' })).status, 400);
  assert.equal((await send('Transaction.Paid', 'spi00000000000000000000000000000000', { tamper: true }))[0], 400);
  const [s1, id1] = await send('Transaction.Paid', 'spi00000000000000000000000000000000');
  assert.equal(s1, 200);
  assert.deepEqual(await webhookEvent(id1), { result: 'ignored', detail: 'UNKNOWN_PAYMENT' });
  if (SCHEMA === 'prod_like') return;                      // no paid payment exists on this schema (see 6 and 7a)

  const { data: row } = await admin.from('web_payments').select('payment_id').eq('user_id', users.N.id).single();
  const [s2, id2] = await send('Transaction.Paid', row.payment_id);
  assert.equal(s2, 200);
  assert.deepEqual(await webhookEvent(id2), { result: 'processed', detail: 'ALREADY_PAID' });
  assert.equal((await send('Transaction.Paid', row.payment_id, { id: id2 }))[0], 200);    // same webhook-id again
  assert.equal(await count('web_payments', users.N.id), 1);
  assert.equal((await sub(users.N.id, 'sniff_premium')).status, 'active');

  // the PG now reports the payment as fully cancelled (refund done outside this system): the row and the subscription follow
  const before = pgCalls().length;
  setPg((s) => { s.payments[row.payment_id].status = 'CANCELLED'; s.payments[row.payment_id].cancelledAt = new Date().toISOString(); });
  const [s3, id3] = await send('Transaction.Cancelled', row.payment_id);
  assert.equal(s3, 200);
  assert.equal((await webhookEvent(id3)).result, 'processed');
  assert.equal(await count('web_payments', users.N.id, { status: 'cancelled' }), 1);
  const ended = await sub(users.N.id, 'sniff_premium');
  assert.deepEqual([ended.status, ended.billing_key, ended.next_billing_date], ['canceled', null, null]);
  assert.ok(pgCalls().slice(before).includes('DELETE /billing-keys/<key>'));
  assert.ok(!pgCalls().slice(before).some((c) => c.startsWith('POST')), 'a webhook never charges');
});

test('schema: the compatibility migration keeps "one subscription per user" and adds the conflict target the code needs', { skip: !enabled || !DB_CONTAINER }, async () => {
  const idx = psql("select string_agg(indexname, ',' order by indexname) from pg_indexes where schemaname='public' and tablename='web_subscriptions' and indexdef ilike '%unique%' and indexname <> 'web_subscriptions_pkey'");
  assert.ok(idx.includes('web_subscriptions_user_id_plan_key') || SCHEMA === 'prod_like', idx);
  assert.equal(psql("select count(*) from information_schema.tables where table_schema='public' and table_name='fem_jobs'"), SCHEMA === 'with_0011' ? '1' : '0');
  if (SCHEMA !== 'prod_plus_0012') return;
  assert.equal(idx, 'web_subscriptions_user_id_key,web_subscriptions_user_id_plan_key');
  assert.equal(psql("select column_default || '|' || is_nullable from information_schema.columns where table_schema='public' and table_name='web_payments' and column_name='plan'"), "'sniff_premium'::text|NO");
  // a second plan for the same user is still refused by the database
  const r = await admin.from('web_subscriptions').insert({ user_id: users.S.id, plan: 'fem_pro', status: 'active' });
  assert.equal(r.error?.code, '23505');
});

test('first payment: a declined card creates nothing and the next attempt is charged exactly once', { skip: !enabled || !canPay }, async () => {
  const u = users.V = await makeSession('v');
  setPg((s) => { s.billingKeys['bk-v1'] = { customerId: u.id }; s.billingKeys['bk-v2'] = { customerId: u.id }; s.declineCount = 1; });
  assert.deepEqual(await registerKey(u, { billing_key: 'bk-v1' }), [402, 'PAYMENT_FAILED']);
  assert.equal(await count('web_subscriptions', u.id), 0);
  assert.equal(await count('web_payments', u.id, { status: 'failed' }), 1);
  assert.equal(pgState().billingKeys['bk-v1'], undefined, 'the unused card registration was removed');
  assert.deepEqual(await registerKey(u, { billing_key: 'bk-v2' }), [200, 'paid']);
  assert.deepEqual(chargedFor(u.id).map((p) => p.amount.total), [3300]);
  assert.equal((await sub(u.id, 'sniff_premium')).status, 'active');
});

test('first payment: six simultaneous requests charge once and create one subscription', { skip: !enabled || !canPay }, async () => {
  const u = users.C = await makeSession('c');
  setPg((s) => { s.billingKeys['bk-c'] = { customerId: u.id }; });
  const results = await Promise.all(Array.from({ length: 6 }, () => registerKey(u, { billing_key: 'bk-c' })));
  assert.equal(results.filter(([st]) => st === 200).length, 1, JSON.stringify(results));
  for (const [st, err] of results.filter(([st]) => st !== 200)) assert.ok(st === 409 && ['IN_PROGRESS', 'ALREADY_SUBSCRIBED'].includes(err), `${st} ${err}`);
  assert.equal(chargedFor(u.id).length, 1);
  assert.equal(await count('web_payments', u.id), 1);
  assert.equal(await count('web_subscriptions', u.id), 1);
  const s = await sub(u.id, 'sniff_premium');
  assert.deepEqual([s.status, s.billing_key], ['active', 'bk-c']);
  assert.ok(pgState().billingKeys['bk-c'], 'the card registration in use was not removed by the losing requests');
});

test('recurring: four simultaneous batch runs charge a due subscription once', { skip: !enabled || !canPay }, async () => {
  const u = users.R2 = await makeSession('r2');
  await dueSubscription(u, 'bk-r2');
  const runs = await Promise.all(Array.from({ length: 4 }, () => cron()));
  for (const [st] of runs) assert.equal(st, 200);
  assert.equal(chargedFor(u.id).length, 1);
  assert.equal(await count('web_payments', u.id, { status: 'paid' }), 1);
  assert.equal(await count('web_payments', u.id, { status: 'pending' }), 0);
});

test('recurring: decline -> past_due (kept, not re-charged the same day) -> retry succeeds -> active on the original schedule', { skip: !enabled || !canPay }, async () => {
  const u = users.P1 = await makeSession('p1');
  const due = await dueSubscription(u, 'bk-p1');
  const row = async () => (await admin.from('web_subscriptions').select('status, failed_attempts, next_retry_at, grace_ends_at, next_billing_date, billing_key').eq('user_id', u.id).single()).data;
  setPg((s) => { s.declineCount = 1; });
  await cron();
  let s = await row();
  assert.deepEqual([s.status, s.failed_attempts, s.billing_key, new Date(s.next_billing_date).toISOString()], ['past_due', 1, 'bk-p1', due]);
  assert.ok(new Date(s.next_retry_at) > new Date() && new Date(s.grace_ends_at) > new Date(s.next_retry_at));
  assert.equal(await count('web_payments', u.id, { status: 'failed' }), 1);
  assert.equal(await count('web_notifications', u.id), 1);      // the notice is queued (mail sending is off in this test)
  const before = chargeCalls();
  await cron();                                                  // same day: no second attempt
  assert.equal(chargeCalls(), before);
  assert.equal((await admin.from('web_subscriptions').update({ next_retry_at: new Date(Date.now() - 1000).toISOString() }).eq('user_id', u.id)).error, null);   // "the retry day has come"
  await cron();
  s = await row();
  assert.deepEqual([s.status, s.failed_attempts, s.next_retry_at, s.grace_ends_at], ['active', 0, null, null]);
  assert.ok(new Date(s.next_billing_date) > new Date(Date.now() + 20 * 864e5));
  assert.deepEqual(chargedFor(u.id).map((p) => p.amount.total), [3300]);
  assert.equal(await count('web_payments', u.id, { status: 'paid' }), 1);
});

test('recurring: three declines end the subscription and remove the card registration; nothing is charged', { skip: !enabled || !canPay }, async () => {
  const u = users.P2 = await makeSession('p2');
  await dueSubscription(u, 'bk-p2');
  for (let i = 0; i < 3; i++) {
    setPg((s) => { s.declineCount = 1; });
    if (i > 0) assert.equal((await admin.from('web_subscriptions').update({ next_retry_at: new Date(Date.now() - 1000).toISOString() }).eq('user_id', u.id)).error, null);
    await cron();
    assert.equal(pgState().declineCount, 0, `attempt ${i + 1} reached the PG`);
  }
  const s = await sub(u.id, 'sniff_premium');
  assert.deepEqual([s.status, s.billing_key, s.next_billing_date], ['canceled', null, null]);
  assert.equal(pgState().billingKeys['bk-p2'], undefined);
  assert.equal(await count('web_payments', u.id, { status: 'failed' }), 3);
  assert.equal(chargedFor(u.id).length, 0);
});

test('recovery: the charge went through but the subscription could not be saved -> no second charge, and a webhook or the daily batch completes it', { skip: !enabled || !canPay || !DB_CONTAINER }, async () => {
  // Make the "save subscription" step fail AFTER the charge, the way it would on a database that has the plan column but not the unique index.
  const dropped = psql("select indexdef from pg_indexes where schemaname='public' and indexname='web_subscriptions_user_id_plan_key'");
  assert.ok(dropped.startsWith('CREATE UNIQUE INDEX'));
  const z = users.Z = await makeSession('z'), z2 = users.Z2 = await makeSession('z2');
  setPg((s) => { for (const [k, u] of [['bk-z', z], ['bk-z-2', z], ['bk-z2', z2]]) s.billingKeys[k] = { customerId: u.id }; });
  psql('drop index public.web_subscriptions_user_id_plan_key');
  try {
    for (const [u, key] of [[z, 'bk-z'], [z2, 'bk-z2']]) {
      assert.deepEqual(await registerKey(u, { billing_key: key }), [202, 'processing']);      // charged, result "being confirmed"
      assert.equal(chargedFor(u.id).length, 1);
      assert.equal(await count('web_payments', u.id, { status: 'pending' }), 1);
      assert.equal(await count('web_subscriptions', u.id), 0);
      assert.ok(pgState().billingKeys[key], 'the card registration is kept');
    }
    // the customer tries again right away, with the same card and with a newly registered one: no second charge
    assert.deepEqual(await registerKey(z, { billing_key: 'bk-z' }), [409, 'IN_PROGRESS']);
    assert.deepEqual(await registerKey(z, { billing_key: 'bk-z-2' }), [409, 'IN_PROGRESS']);
    assert.equal(chargedFor(z.id).length, 1);
    // while the database is still broken, a webhook cannot complete it: it answers 500 so that the PG sends it again
    const pid = (await admin.from('web_payments').select('payment_id').eq('user_id', z.id).single()).data.payment_id;
    assert.equal((await send('Transaction.Paid', pid))[0], 500);
    assert.equal(await count('web_payments', z.id, { status: 'pending' }), 1);
  } finally {
    psql(dropped);                                                                             // database fixed
  }
  // 1) webhook re-delivery completes the first one
  const pid = (await admin.from('web_payments').select('payment_id').eq('user_id', z.id).single()).data.payment_id;
  const [st, id] = await send('Transaction.Paid', pid);
  assert.equal(st, 200);
  assert.deepEqual(await webhookEvent(id), { result: 'processed', detail: 'PENDING_TO_PAID' });
  // 2) the daily batch completes the other one once its pending row is older than five minutes
  assert.equal((await admin.from('web_payments').update({ created_at: new Date(Date.now() - 10 * 60e3).toISOString() }).eq('user_id', z2.id)).error, null);
  await cron();
  for (const [u, key] of [[z, 'bk-z'], [z2, 'bk-z2']]) {
    const s = await sub(u.id, 'sniff_premium');
    assert.deepEqual([s.status, s.billing_key], ['active', key]);
    assert.equal(await count('web_payments', u.id, { status: 'paid' }), 1);
    assert.equal(await count('web_payments', u.id), 1);
    assert.equal(chargedFor(u.id).length, 1, 'charged exactly once in total');
  }
  assert.equal((await send('Transaction.Paid', pid))[0], 200);                                  // a late duplicate changes nothing
  assert.equal(await count('web_subscriptions', z.id), 1);
});

test('8. existing contracts stay manageable: cancel and undo-cancel for FEM and Sniff; a FEM contract in arrears can still be cancelled', skip, async () => {
  const before = pgCalls().filter((c) => c.startsWith('POST')).length;
  const act = (user, path, plan) => call(path, { user, ...post({ plan }) }).then((r) => r.status);
  for (const [u, plan] of [[users.F, 'fem_pro'], [users.S, 'sniff_premium']]) {
    assert.equal(await act(u, '/api/billing/cancel-subscription', plan), 200, plan);
    assert.equal((await sub(u.id, plan)).status, 'cancel_scheduled');
    assert.equal(await act(u, '/api/billing/resume-subscription', plan), 200, plan);
    assert.equal((await sub(u.id, plan)).status, 'active');
  }
  assert.equal(await act(users.D, '/api/billing/cancel-subscription', 'fem_pro'), 200);
  const d = await sub(users.D.id, 'fem_pro');
  assert.deepEqual([d.status, d.billing_key], ['canceled', null]);
  assert.equal(pgState().billingKeys['bk-d'], undefined);   // its card registration was removed at the mock PG
  assert.equal(pgCalls().filter((c) => c.startsWith('POST')).length, before, 'no charge');
});

// 판매 차단이 들어가지 않은 코드(원본·롤백 상태)에만 해당하는 확인. BILLING_E2E_UNBLOCKED_CODE=1 일 때만 돈다.
// DB 는 "한 사용자 한 구독"을 유지하므로, 차단 없는 코드가 Sniff 구독자에게 FEM 을 팔면 승인 뒤 구독 저장이 실패한다.
test('unblocked code only: selling FEM to a Sniff subscriber charges first and then cannot save the subscription', { skip: !enabled || !E.BILLING_E2E_UNBLOCKED_CODE || SCHEMA !== 'prod_plus_0012' }, async () => {
  const u = await makeSession('h');
  assert.equal((await admin.from('web_subscriptions').insert({ user_id: u.id, plan: 'sniff_premium', status: 'active', next_billing_date: future(20) })).error, null);
  setPg((s) => { s.billingKeys['bk-h'] = { customerId: u.id }; });
  assert.deepEqual(await registerKey(u, { billing_key: 'bk-h', plan: 'fem_pro' }), [202, 'processing']);
  assert.deepEqual(chargedFor(u.id).map((p) => p.amount.total), [55000]);
  assert.equal(await count('web_payments', u.id, { status: 'pending' }), 1);
  assert.equal(await count('web_subscriptions', u.id), 1);
  assert.equal(await sub(u.id, 'fem_pro'), null);
});
