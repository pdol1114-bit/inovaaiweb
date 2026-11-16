/** 워커 없이 도는 시험(가짜 fetch). 실제 메싱 결과가 아니다. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { inspectSelection, MAX_CAD_BYTES, parseEngineSettings, validSettings } from '../../src/lib/fem/preflight';
import { expectedEngineJobId, parseWorkerJob, WorkerResponseError } from '../../src/lib/fem/worker-contract';
import { createWorkerClient, WorkerRejected, WorkerUnreachable } from '../../src/lib/fem/worker-client';
import { countsTowardQuota, getJobView, submitJob } from '../../src/lib/fem/job-service';
import { getFemSubscription, isFemSubscriptionActive, femAccessMode, hasFemAccess } from '../../src/lib/fem/membership';
import { FEM_AUTH_COOKIE, femSupabaseConfig } from '../../src/utils/supabase/fem-config';
import { MemoryStore } from './memory-store';

const USER = '11111111-1111-4111-8111-111111111111';
const SETTINGS = { size: 5, unit: 'mm', strategy: 'hex', order: 'linear' } as const;

function workerJob(jobId: string, over: Record<string, unknown> = {}) {
  return { engineJobId: expectedEngineJobId(jobId), jobId, status: 'queued', result: null, stage: null, metrics: null,
    warnings: [], errorCode: null, errorMessage: null, errors: [],
    settingsApplied: { mode: 'hex_priority', targetSize: 5, sizeUnit: 'mm', elementOrder: 'linear', notApplied: [] },
    qualityThresholds: null, artifacts: null, preview: { available: false, reason: 'not_completed' },
    solverValidation: null, engineVersion: null, startedAt: null, finishedAt: null, expiresAt: null, ...over };
}
const fakeFetch = (fn: (url: string, init: RequestInit) => Response | Promise<Response>) =>
  (async (url: RequestInfo | URL, init?: RequestInit) => fn(String(url), init ?? {})) as typeof fetch;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const submitArgs = () => ({ userId: USER, requestKey: randomUUID(), fileName: 'p.step', fileFormat: 'STEP', fileSize: 100, settings: SETTINGS });

test('upload limit is the engine byte limit: 50 MiB = 52,428,800 bytes', () => {
  assert.equal(MAX_CAD_BYTES, 52_428_800);
  assert.ok(inspectSelection([{ name: 'a.step', size: 52_428_800 }]).file);
  assert.equal(inspectSelection([{ name: 'a.step', size: 52_428_801 }]).error, 'fileLarge');
  assert.equal(inspectSelection([{ name: 'a.iges', size: 10 }]).error, 'fileType');
  assert.equal(inspectSelection([{ name: 'step', size: 10 }]).error, 'fileType');
  assert.equal(inspectSelection([{ name: 'a.stp', size: 0 }]).error, 'fileEmpty');
});

test('only hex/tet, linear and mm are accepted; nothing is substituted', () => {
  assert.deepEqual(parseEngineSettings({ size: '2.5', strategy: 'tet' }), { size: 2.5, unit: 'mm', strategy: 'tet', order: 'linear' });
  for (const bad of [{ size: 5, strategy: 'mixed' }, { size: 5, strategy: 'hex', order: 'quadratic' },
                     { size: 5, strategy: 'hex', unit: 'cm' }, { size: 5, strategy: 'hex', unit: 'm' },
                     { size: 0, strategy: 'hex' }, { size: 'x', strategy: 'hex' }, { strategy: 'hex' }, null, 'hex']) {
    assert.equal(parseEngineSettings(bad), null);
  }
  assert.equal(validSettings({ size: '5', strategy: 'hex' }), true);
  assert.equal(validSettings({ size: '5', strategy: 'mixed' as never }), false);
});

test('worker responses are validated: job id, status, completed needs verdict + hashes', () => {
  const id = randomUUID();
  assert.equal(parseWorkerJob(workerJob(id), id).status, 'queued');
  assert.throws(() => parseWorkerJob(workerJob(id, { engineJobId: expectedEngineJobId(randomUUID()) }), id), WorkerResponseError);
  assert.throws(() => parseWorkerJob(workerJob(id, { engineJobId: '../../x' }), id), WorkerResponseError);
  assert.throws(() => parseWorkerJob(workerJob(id, { status: 'done' }), id), WorkerResponseError);
  assert.throws(() => parseWorkerJob(workerJob(id, { status: 'completed' }), id), WorkerResponseError);
  assert.throws(() => parseWorkerJob(workerJob(id, { status: 'completed', result: 'success', artifacts: { inp: { name: 'a', bytes: 1, sha256: 'zz' } } }), id), WorkerResponseError);
  assert.throws(() => parseWorkerJob(workerJob(id, { metrics: { elements: 'many' } }), id), WorkerResponseError);
  const m = parseWorkerJob(workerJob(id, { metrics: { elements: 10, maxAspectRatio: 99 } }), id).metrics!;
  assert.equal(m.maxAspectRatio, null);          // never trusted from the wire: the engine has no such metric
  assert.equal(m.hex, null);                      // missing stays null, not 0
});

test('engine errors keep code, cause and hint', () => {
  const id = randomUUID();
  const err = { code: 'BOUNDARY_MISMATCH', message: 'm', hint: 'h', cause: { faces_off_cad: 50 } };
  const j = parseWorkerJob(workerJob(id, { status: 'failed', result: 'failed', errorCode: 'BOUNDARY_MISMATCH', errors: [err] }), id);
  assert.deepEqual(j.errors, [err]);
});

test('the worker key is required and is sent only as a header', async () => {
  assert.throws(() => createWorkerClient({ baseUrl: 'http://w', apiKey: '' }));
  const id = randomUUID();
  let seen: { url: string; auth: string | null; user: string | null } | null = null;
  const c = createWorkerClient({ baseUrl: 'http://w/', apiKey: 'K', fetch: fakeFetch((url, init) => {
    const h = new Headers(init.headers);
    seen = { url, auth: h.get('authorization'), user: h.get('x-fem-user-id') };
    return json(workerJob(id));
  }) });
  await c.getJob(id, USER);
  assert.deepEqual(seen, { url: `http://w/v1/mesh/jobs/${expectedEngineJobId(id)}`, auth: 'Bearer K', user: USER });
});

test('communication failure, rejection and meshing failure are three different things', async () => {
  const id = randomUUID();
  const down = createWorkerClient({ baseUrl: 'http://w', apiKey: 'K', fetch: fakeFetch(() => { throw new TypeError('fetch failed'); }) });
  await assert.rejects(down.getJob(id, USER), WorkerUnreachable);
  const five = createWorkerClient({ baseUrl: 'http://w', apiKey: 'K', fetch: fakeFetch(() => json({}, 503)) });
  await assert.rejects(five.getJob(id, USER), WorkerUnreachable);
  const garbage = createWorkerClient({ baseUrl: 'http://w', apiKey: 'K', fetch: fakeFetch(() => new Response('<html>', { status: 200 })) });
  await assert.rejects(garbage.getJob(id, USER), WorkerUnreachable);
  const wrongId = createWorkerClient({ baseUrl: 'http://w', apiKey: 'K', fetch: fakeFetch(() => json(workerJob(randomUUID()))) });
  await assert.rejects(wrongId.getJob(id, USER), WorkerUnreachable);
  const rejecting = createWorkerClient({ baseUrl: 'http://w', apiKey: 'K',
    fetch: fakeFetch(() => json({ error: { code: 'UNSUPPORTED_UNIT', message: 'secret detail' } }, 422)) });
  await assert.rejects(rejecting.getJob(id, USER), (e: unknown) =>
    e instanceof WorkerRejected && e.code === 'UNSUPPORTED_UNIT' && !JSON.stringify(e.detail).includes('secret'));
  const failed = createWorkerClient({ baseUrl: 'http://w', apiKey: 'K',
    fetch: fakeFetch(() => json(workerJob(id, { status: 'failed', result: 'failed', errorCode: 'INVALID_ELEMENTS' }))) });
  assert.equal((await failed.getJob(id, USER)).status, 'failed');       // a real meshing failure is a normal response
});

test('delivery failure and rejection close the job without using the monthly count', async () => {
  const store = new MemoryStore();
  const down = createWorkerClient({ baseUrl: 'http://w', apiKey: 'K', fetch: fakeFetch(() => { throw new TypeError('x'); }) });
  const a = await submitJob({ store, worker: down }, submitArgs());
  assert.deepEqual([a.ok, !a.ok && a.error, !a.ok && a.http], [false, 'DELIVERY_FAILED', 502]);
  const rejecting = createWorkerClient({ baseUrl: 'http://w', apiKey: 'K',
    fetch: fakeFetch(() => json({ error: { code: 'UNSUPPORTED_STRATEGY', message: 'x' } }, 422)) });
  const b = await submitJob({ store, worker: rejecting }, submitArgs());
  assert.ok(!b.ok && b.error === 'SUBMIT_REJECTED' && b.detail?.code === 'UNSUPPORTED_STRATEGY');
  assert.deepEqual([...store.rows.values()].map((r) => [r.status, r.countsTowardQuota]), [['canceled', false], ['canceled', false]]);
  assert.equal(store.quota(USER).used, 0);
});

test('a closed request key cannot be reused to skip the quota check', async () => {
  const store = new MemoryStore();
  const down = createWorkerClient({ baseUrl: 'http://w', apiKey: 'K', fetch: fakeFetch(() => { throw new TypeError('x'); }) });
  const args = submitArgs();
  await submitJob({ store, worker: down }, args);
  const again = await submitJob({ store, worker: down }, args);
  assert.ok(!again.ok && again.error === 'REQUEST_ALREADY_CLOSED');
  assert.equal(store.rows.size, 1);
});

test('quota: the limit holds, and the worker is not even called when it is reached', async () => {
  const store = new MemoryStore(2);
  let calls = 0;
  const ok = createWorkerClient({ baseUrl: 'http://w', apiKey: 'K', fetch: fakeFetch((_u, init) => {
    calls++;
    const id = JSON.parse(String(init.body)).job_id;
    return json({ ...workerJob(id, { status: 'awaiting_upload' }), upload: { mode: 'worker', method: 'PUT', path: '/x', maxBytes: 1, expiresAt: 1 } }, 201);
  }) });
  const results = await Promise.all(Array.from({ length: 6 }, () => submitJob({ store, worker: ok }, submitArgs())));
  assert.equal(results.filter((r) => r.ok).length, 2);
  assert.ok(results.filter((r) => !r.ok).every((r) => !r.ok && r.error === 'QUOTA_EXCEEDED' && r.http === 429));
  assert.equal(calls, 2);
});

test('what counts toward the monthly quota', () => {
  const c = (status: string, result: string | null, errorCode: string | null) =>
    countsTowardQuota({ status: status as never, result: result as never, errorCode });
  assert.equal(c('queued', null, null), true);                       // reserved while in progress
  assert.equal(c('completed', 'success', null), true);
  assert.equal(c('completed', 'warning', null), true);
  assert.equal(c('failed', 'failed', 'BOUNDARY_MISMATCH'), true);    // the engine ran and gave a verdict
  assert.equal(c('failed', null, 'TIMEOUT'), true);
  assert.equal(c('failed', null, 'WORKER_FAILED'), false);
  assert.equal(c('failed', null, 'EXECUTION_LOST'), false);
  assert.equal(c('failed', null, 'UNRECOGNIZED_CONTENT'), false);    // refused before the engine ran
  assert.equal(c('canceled', null, 'UPLOAD_NOT_COMPLETED'), false);
});

test('a failed status check is reported, not hidden behind the previous state', async () => {
  const store = new MemoryStore();
  const args = submitArgs();
  const r = await store.reserve(args);
  assert.ok(r.kind === 'created');
  await store.update(USER, r.row.id, { status: 'running' });
  const down = createWorkerClient({ baseUrl: 'http://w', apiKey: 'K', fetch: fakeFetch(() => { throw new TypeError('x'); }) });
  const v = await getJobView({ store, worker: down }, USER, r.row.id);
  assert.ok(v.ok && v.job.sync === 'unavailable' && v.job.status === 'running');
  const gone = createWorkerClient({ baseUrl: 'http://w', apiKey: 'K', fetch: fakeFetch(() => json({ error: { code: 'NOT_FOUND', message: '' } }, 404)) });
  const g = await getJobView({ store, worker: gone }, USER, r.row.id);
  assert.ok(g.ok && g.job.status === 'failed' && g.job.errorCode === 'WORKER_JOB_MISSING');
  assert.equal(store.quota(USER).used, 0);
  assert.ok(!(await getJobView({ store, worker: gone }, '22222222-2222-4222-8222-222222222222', r.row.id)).ok);
});

test('FEM members live in their own Supabase project: no config, a bad URL or the main project URL all mean "not configured"', () => {
  const main = 'https://main-ref.supabase.co', fem = 'https://fem-ref.supabase.co';
  assert.equal(femSupabaseConfig({}), null);
  assert.equal(femSupabaseConfig({ NEXT_PUBLIC_FEM_SUPABASE_URL: fem }), null);
  assert.equal(femSupabaseConfig({ NEXT_PUBLIC_FEM_SUPABASE_URL: 'not a url', NEXT_PUBLIC_FEM_SUPABASE_ANON_KEY: 'k' }), null);
  // never fall back to the main (Sniff) project, even if someone points the FEM variables at it
  assert.equal(femSupabaseConfig({ NEXT_PUBLIC_FEM_SUPABASE_URL: main + '/', NEXT_PUBLIC_FEM_SUPABASE_ANON_KEY: 'k', NEXT_PUBLIC_SUPABASE_URL: main }), null);
  assert.deepEqual(femSupabaseConfig({ NEXT_PUBLIC_FEM_SUPABASE_URL: fem, NEXT_PUBLIC_FEM_SUPABASE_ANON_KEY: 'k', NEXT_PUBLIC_SUPABASE_URL: main }), { url: fem, anonKey: 'k' });
  assert.equal(FEM_AUTH_COOKIE, 'sb-fem-auth-token');   // fixed, so it cannot collide with the main project's cookie
});

test('FEM subscription: only a FEM row on the FEM account counts; missing rows and lookup failures block', async () => {
  const now = new Date('2026-11-16T00:00:00Z');
  const row = (status: string, end: string | null = null, plan = 'fem_pro') => ({ plan, status, service_end_date: end });
  assert.equal(isFemSubscriptionActive(null, now), false);                       // signing up grants nothing
  assert.equal(isFemSubscriptionActive(row('active'), now), true);
  assert.equal(isFemSubscriptionActive(row('active', null, 'sniff_premium'), now), false);
  assert.equal(isFemSubscriptionActive(row('cancel_scheduled', '2026-12-01T00:00:00Z'), now), true);
  assert.equal(isFemSubscriptionActive(row('cancel_scheduled', '2026-11-15T00:00:00Z'), now), false);
  assert.equal(isFemSubscriptionActive(row('cancel_scheduled', null), now), false);
  assert.equal(isFemSubscriptionActive(row('cancel_scheduled', 'garbage'), now), false);
  for (const s of ['past_due', 'canceled', 'trialing', '']) assert.equal(isFemSubscriptionActive(row(s), now), false, s);
  const reader = (result: { data: unknown; error: unknown }, seen: string[] = []) => ({
    from: (t: string) => ({ select: () => ({ eq: (c: string, v: string) => { seen.push(t, c, v); return { maybeSingle: async () => result }; } }) }),
  });
  const seen: string[] = [];
  assert.deepEqual(await getFemSubscription(reader({ data: row('active'), error: null }, seen), 'u1'), row('active'));
  assert.deepEqual(seen, ['fem_subscriptions', 'user_id', 'u1']);                // the FEM table, limited to this user
  assert.equal(await getFemSubscription(reader({ data: null, error: null }), 'u1'), null);
  assert.equal(await getFemSubscription(reader({ data: row('active'), error: { code: 'X' } }), 'u1'), null);
});

test('beta entitlement is separate from paid status and requires explicit server configuration', () => {
  assert.equal(femAccessMode('free_beta'), 'free_beta');
  for (const value of [undefined, '', 'true', 'FREE_BETA', 'unknown']) {
    assert.equal(femAccessMode(value), 'subscription');
  }
  assert.equal(isFemSubscriptionActive(null), false);
  assert.equal(hasFemAccess(null, 'subscription'), false);
  assert.equal(hasFemAccess(null, 'free_beta'), true);
});

test('private worker receives IAM identity separately from its API key; identity failure closes access', async () => {
  const id = randomUUID(); let calls = 0;
  const transport = fakeFetch((_url, init) => {
    calls++; const h = new Headers(init.headers);
    assert.equal(h.get('authorization'), 'Bearer api-test');
    assert.equal(h.get('x-serverless-authorization'), 'Bearer identity-test');
    return json(workerJob(id));
  });
  await createWorkerClient({ baseUrl: 'https://worker', apiKey: 'api-test', identityToken: async () => 'identity-test', fetch: transport }).getJob(id, USER);
  assert.equal(calls, 1);
  await assert.rejects(createWorkerClient({ baseUrl: 'https://worker', apiKey: 'api-test', identityToken: async () => { throw Error('no identity'); }, fetch: transport }).getJob(id, USER), WorkerUnreachable);
  assert.equal(calls, 1);
});
