import "server-only";
import { createWorkerClient, WorkerUnreachable, type WorkerClient } from "./worker-client";

/**
 * FEM 워커 연결 설정. URL과 인증키가 **둘 다** 있어야 "설정됨"이다.
 * 키 없이 워커를 호출하는 경로는 없다(워커도 키 없는 요청을 모두 거절한다).
 * 설정됨 ≠ 연결됨 ≠ 검증됨 — `getEngineState()` 참고.
 */
export function getWorkerClient(): WorkerClient | null {
    const url = process.env.FEM_ENGINE_URL?.trim();
    const key = process.env.FEM_ENGINE_API_KEY?.trim();
    if (!url || !key) return null;
    return createWorkerClient({ baseUrl: url, apiKey: key,
        identityToken: process.env.FEM_ENGINE_IAM === 'true' ? () => workerIdentityToken(url) : undefined });
}

export type EngineState = {
    /** URL·인증키가 설정되어 있다. */
    configured: boolean;
    /** 워커가 방금 인증된 상태 확인에 응답했다. null = 확인하지 않음(미설정). */
    reachable: boolean | null;
    /** 그 워커에서 실제 엔진 작업이 완료된 기록이 있다. null = 알 수 없음. */
    verified: boolean | null;
};

let cached: { at: number; state: EngineState } | null = null;
const CACHE_MS = 30_000;

export async function getEngineState(): Promise<EngineState> {
    const client = getWorkerClient();
    if (!client) return { configured: false, reachable: null, verified: null };
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.state;
    let state: EngineState;
    try {
        const h = await client.health();
        state = { configured: true, reachable: true, verified: h.lastCompletedAt !== null };
    } catch (e) {
        if (!(e instanceof WorkerUnreachable) && !(e instanceof Error)) throw e;
        state = { configured: true, reachable: false, verified: null };
    }
    cached = { at: Date.now(), state };
    return state;
}

let identity: { audience: string; value: string; at: number } | null = null;
/** Cloud Run IAM token from this web server's own service account. Never sent to browsers/storage. */
async function workerIdentityToken(audience: string): Promise<string> {
    if (identity?.audience === audience && Date.now() - identity.at < 45 * 60_000) return identity.value;
    const res = await fetch(`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(audience)}&format=full`, {
        headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(3000), cache: 'no-store', redirect: 'error',
    });
    if (!res.ok) throw new Error('worker identity unavailable');
    const value = (await res.text()).trim();
    if (value.split('.').length !== 3) throw new Error('worker identity invalid');
    identity = { audience, value, at: Date.now() };
    return value;
}
