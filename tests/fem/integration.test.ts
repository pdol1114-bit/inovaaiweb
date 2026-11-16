/**
 * 웹 서버 로직 ↔ 실제 워커(실제 엔진) 통합 시험. 워커가 떠 있어야 한다:
 *   FEM_TEST_WORKER_URL, FEM_TEST_WORKER_KEY, FEM_TEST_SAMPLES(비기밀 합성 샘플 폴더)
 * 저장소는 시험용 메모리 구현이다(운영 DB를 건드리지 않는다). 환경변수가 없으면 건너뛴다.
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createWorkerClient } from '../../src/lib/fem/worker-client';
import { getArtifact, getJobView, getPreview, proxyUpload, startJob, submitJob, type Deps, type JobView } from '../../src/lib/fem/job-service';
import type { Strategy } from '../../src/lib/fem/preflight';
import { MemoryStore } from './memory-store';

const URL_ = process.env.FEM_TEST_WORKER_URL, KEY = process.env.FEM_TEST_WORKER_KEY, SAMPLES = process.env.FEM_TEST_SAMPLES;
const enabled = Boolean(URL_ && KEY && SAMPLES);
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');

function deps(store = new MemoryStore()): Deps & { store: MemoryStore } {
  return { store, worker: createWorkerClient({ baseUrl: URL_!, apiKey: KEY! }) };
}

async function run(d: Deps, user: string, sample: string, strategy: Strategy, size: number, requestKey = randomUUID(),
                   content?: Buffer, name = sample) {
  const data = content ?? readFileSync(join(SAMPLES!, sample));
  const sub = await submitJob(d, { userId: user, requestKey, fileName: name, fileFormat: 'STEP', fileSize: data.length,
                                   settings: { size, unit: 'mm', strategy, order: 'linear' } });
  if (!sub.ok) return { sub };
  if (sub.upload) {
    assert.equal(sub.upload.mode, 'proxy');                 // local worker: no direct URL
    const up = await proxyUpload(d, user, sub.id, data.buffer.slice(data.byteOffset, data.byteOffset + data.length) as ArrayBuffer, data.length);
    assert.ok(up.ok);
  }
  const started = await startJob(d, user, sub.id);
  return { sub, started };
}

async function waitDone(d: Deps, user: string, id: string): Promise<JobView> {
  for (let i = 0; i < 600; i++) {
    const v = await getJobView(d, user, id);
    assert.ok(v.ok);
    if (['completed', 'failed', 'canceled'].includes(v.job.status)) return v.job;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('job did not finish');
}

test('hex: submit -> upload -> start -> real mesh -> report, files and preview', { skip: !enabled }, async () => {
  const d = deps();
  const { sub, started } = await run(d, A, 'hollow_cylinder.step', 'hex', 3);
  assert.ok(sub.ok && started?.ok);
  const job = await waitDone(d, A, sub.id);
  assert.equal(job.status, 'completed');
  assert.equal(job.result, 'success');
  assert.equal(job.settingsApplied?.mode, 'hex_priority');
  assert.ok(job.metrics && job.metrics.elements! > 0 && job.metrics.hex === job.metrics.elements && job.metrics.tet === 0);
  assert.equal(job.metrics.maxAspectRatio, null);
  assert.ok(job.metrics.maxEdgeRatio! >= 1);
  assert.equal(job.qualityThresholds?.hex_scaled_jacobian_min, 0.5);
  assert.match(job.solverValidation ?? '', /Abaqus/);
  for (const fmt of ['inp', 'msh'] as const) {
    const a = await getArtifact(d, A, sub.id, fmt);
    assert.ok(a.ok && a.kind === 'stream');
    const bytes = new Uint8Array(await a.response.arrayBuffer());
    assert.equal(bytes.length, job.artifacts![fmt].bytes);
    assert.equal(sha(bytes), job.artifacts![fmt].sha256);     // what the browser gets == what the engine reported
    assert.equal(a.sha256, job.artifacts![fmt].sha256);
  }
  const inp = await getArtifact(d, A, sub.id, 'inp');
  assert.ok(inp.ok && inp.kind === 'stream');
  assert.match(await inp.response.text(), /\*ELEMENT, TYPE=C3D8/i);
  const pv = await getPreview(d, A, sub.id);
  assert.ok(pv.ok && pv.kind === 'stream');
  const viewer = await pv.response.json();
  assert.ok(viewer.positions.length % 3 === 0 && viewer.triangles.length % 3 === 0 && viewer.triangles.length > 0);
  assert.equal(viewer.tri_quality.length, viewer.triangles.length / 3);
  assert.ok(Math.max(...viewer.triangles) < viewer.positions.length / 3);
  assert.deepEqual([d.store.rows.get(sub.id)!.status, d.store.rows.get(sub.id)!.countsTowardQuota], ['completed', true]);
});

test('tet: Tet Only is really tet_only, and a warning stays a warning', { skip: !enabled }, async () => {
  const d = deps();
  const { sub } = await run(d, A, 'tet_torus.step', 'tet', 3);
  assert.ok(sub.ok);
  const job = await waitDone(d, A, sub.id);
  assert.equal(job.status, 'completed');
  assert.equal(job.settingsApplied?.mode, 'tet_only');
  assert.ok(job.metrics!.tet === job.metrics!.elements && job.metrics!.hex === 0 && job.metrics!.wedge === 0);
  assert.equal(job.result, 'warning');
  assert.ok(job.warnings.length >= 1);
  const inp = await getArtifact(d, A, sub.id, 'inp');
  assert.ok(inp.ok && inp.kind === 'stream');
  const text = await inp.response.text();
  assert.match(text, /TYPE=C3D4/i);
  assert.doesNotMatch(text, /TYPE=C3D(8|6|10)/i);
});

test('boundary mismatch: code, cause and hint reach the web layer; nothing can be downloaded', { skip: !enabled }, async () => {
  const d = deps();
  const { sub } = await run(d, A, 'tet_thin_plate_two_holes.step', 'tet', 6);
  assert.ok(sub.ok);
  const job = await waitDone(d, A, sub.id);
  assert.equal(job.status, 'failed');
  assert.equal(job.errorCode, 'BOUNDARY_MISMATCH');
  const e = job.errors[0];
  assert.equal(e.code, 'BOUNDARY_MISMATCH');
  assert.match(e.hint ?? '', /목표 요소 크기를 줄여/);
  assert.match(e.hint ?? '', /보장하지는/);
  assert.equal(typeof e.cause?.faces_off_cad, 'number');
  assert.equal(job.artifacts, null);
  for (const fmt of ['inp', 'msh'] as const) {
    const a = await getArtifact(d, A, sub.id, fmt);
    assert.ok(!a.ok && a.error === 'JOB_NOT_COMPLETED' && a.http === 409);
  }
  const pv = await getPreview(d, A, sub.id);
  assert.ok(!pv.ok && pv.http === 409);
  assert.equal(d.store.rows.get(sub.id)!.countsTowardQuota, true);   // the engine ran and gave a verdict
});

test('unsupported shape is a meshing failure with the engine code, not a delivery failure', { skip: !enabled }, async () => {
  const d = deps();
  const { sub } = await run(d, A, 'tet_torus.step', 'hex', 3);
  assert.ok(sub.ok);
  const job = await waitDone(d, A, sub.id);
  assert.deepEqual([job.status, job.errorCode, job.sync], ['failed', 'UNSUPPORTED_SHAPE', 'ok']);
});

test('a retried submit with the same request key creates and runs nothing new', { skip: !enabled }, async () => {
  const d = deps();
  const key = randomUUID();
  const first = await run(d, A, 'box.step', 'hex', 5, key);
  assert.ok(first.sub.ok);
  const again = await submitJob(d, { userId: A, requestKey: key, fileName: 'box.step', fileFormat: 'STEP',
    fileSize: readFileSync(join(SAMPLES!, 'box.step')).length, settings: { size: 5, unit: 'mm', strategy: 'hex', order: 'linear' } });
  assert.ok(again.ok && again.id === first.sub.id && again.duplicate && again.upload === null);
  const restart = await startJob(d, A, first.sub.id);
  assert.ok(restart.ok);
  const job = await waitDone(d, A, first.sub.id);
  assert.equal(job.status, 'completed');
  assert.equal(d.store.rows.size, 1);
  assert.equal(d.store.quota(A).used, 1);
});

test('a file that is not CAD is refused at start, before the engine, and is not counted', { skip: !enabled }, async () => {
  const d = deps();
  const { sub, started } = await run(d, A, 'x.step', 'hex', 5, randomUUID(), Buffer.from('not a cad file at all'));
  assert.ok(sub.ok);
  assert.ok(started && !started.ok && started.error === 'SUBMIT_REJECTED' && started.detail?.code === 'UNRECOGNIZED_CONTENT');
  const row = d.store.rows.get(sub.id)!;
  assert.deepEqual([row.status, row.countsTowardQuota], ['failed', false]);
});

test("another user cannot see, start, download or preview someone else's job", { skip: !enabled }, async () => {
  const store = new MemoryStore();
  const d = deps(store);
  const { sub } = await run(d, A, 'box.step', 'hex', 5);
  assert.ok(sub.ok);
  await waitDone(d, A, sub.id);
  for (const r of [await getJobView(d, B, sub.id), await startJob(d, B, sub.id), await getArtifact(d, B, sub.id, 'inp'),
                   await getPreview(d, B, sub.id)]) {
    assert.ok(!r.ok && r.http === 404 && r.error === 'NOT_FOUND');
  }
  // even if the web DB row were wrongly attributed to B, the worker itself refuses B
  store.rows.get(sub.id)!.userId = B;
  const leaked = await getArtifact(d, B, sub.id, 'inp');
  assert.ok(!leaked.ok && leaked.http === 410);
  const view = await getJobView(d, B, sub.id);
  assert.ok(view.ok && view.job.sync === 'expired' && view.job.artifacts === null);
});

test('deleted or expired results are reported as expired, not as a failure of the mesh', { skip: !enabled }, async () => {
  const d = deps();
  const { sub } = await run(d, A, 'box.step', 'hex', 5);
  assert.ok(sub.ok);
  assert.equal((await waitDone(d, A, sub.id)).status, 'completed');
  const eng = `eng_${sub.id.replace(/-/g, '')}`;
  const del = await fetch(`${URL_}/v1/mesh/jobs/${eng}`, { method: 'DELETE', headers: { Authorization: `Bearer ${KEY}`, 'X-Fem-User-Id': A } });
  assert.equal(del.status, 204);
  const v = await getJobView(d, A, sub.id);
  assert.ok(v.ok && v.job.sync === 'expired' && v.job.status === 'completed' && v.job.metrics !== null);
  const a = await getArtifact(d, A, sub.id, 'inp');
  assert.ok(!a.ok && a.error === 'RESULT_EXPIRED' && a.http === 410);
});

test('worker down: submit is a delivery failure; an existing job shows "status unavailable"', { skip: !enabled }, async () => {
  const store = new MemoryStore();
  const good = deps(store);
  const { sub } = await run(good, A, 'box.step', 'hex', 5);
  assert.ok(sub.ok);
  await waitDone(good, A, sub.id);
  const down: Deps = { store, worker: createWorkerClient({ baseUrl: 'http://127.0.0.1:9', apiKey: KEY!, timeoutMs: 2000 }) };
  const v = await getJobView(down, A, sub.id);
  assert.ok(v.ok && v.job.sync === 'unavailable' && v.job.status === 'completed');
  const a = await getArtifact(down, A, sub.id, 'inp');
  assert.ok(!a.ok && a.error === 'WORKER_UNREACHABLE' && a.http === 502);
  const s = await submitJob(down, { userId: A, requestKey: randomUUID(), fileName: 'b.step', fileFormat: 'STEP', fileSize: 10,
                                    settings: { size: 5, unit: 'mm', strategy: 'hex', order: 'linear' } });
  assert.ok(!s.ok && s.error === 'DELIVERY_FAILED');
  assert.equal(store.quota(A).used, 1);
});

test('a wrong worker key is refused by the worker', { skip: !enabled }, async () => {
  const bad: Deps = { store: new MemoryStore(), worker: createWorkerClient({ baseUrl: URL_!, apiKey: 'wrong-key' }) };
  const s = await submitJob(bad, { userId: A, requestKey: randomUUID(), fileName: 'b.step', fileFormat: 'STEP', fileSize: 10,
                                   settings: { size: 5, unit: 'mm', strategy: 'hex', order: 'linear' } });
  assert.ok(!s.ok && s.error === 'SUBMIT_REJECTED' && s.detail?.code === 'UNAUTHORIZED');
});
