import { randomUUID } from 'node:crypto';
import type { JobPatch, JobRow, JobStore, Quota } from '../../src/lib/fem/job-service';

/** 시험 전용 저장소. 운영은 Supabase(fem_reserve_job) — 그 SQL은 tests/fem/sql 에서 따로 시험한다. */
export class MemoryStore implements JobStore {
  rows = new Map<string, JobRow & { requestKey: string }>();
  constructor(private limit = 40) {}

  quota(userId: string): Quota {
    const used = [...this.rows.values()].filter((r) => r.userId === userId && r.countsTowardQuota).length;
    return { used, limit: this.limit, remaining: Math.max(0, this.limit - used) };
  }

  async reserve(p: Parameters<JobStore['reserve']>[0]) {
    const existing = [...this.rows.values()].find((r) => r.userId === p.userId && r.requestKey === p.requestKey);
    if (existing) return { kind: 'existing' as const, row: existing, quota: this.quota(p.userId) };
    if (this.quota(p.userId).remaining <= 0) return { kind: 'quota_exceeded' as const, quota: this.quota(p.userId) };
    const row = { id: randomUUID(), userId: p.userId, status: 'awaiting_upload' as const, result: null, errorCode: null,
                  metrics: null, fileName: p.fileName, countsTowardQuota: true, requestKey: p.requestKey };
    this.rows.set(row.id, row);
    return { kind: 'created' as const, row, quota: this.quota(p.userId) };
  }

  async get(userId: string, id: string) {
    const r = this.rows.get(id);
    return r && r.userId === userId ? r : null;
  }

  async update(userId: string, id: string, patch: JobPatch) {
    const r = this.rows.get(id);
    if (r && r.userId === userId) Object.assign(r, patch);
  }
}
