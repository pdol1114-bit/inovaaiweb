import "server-only";

export type FemEngineJobStatus = "queued" | "running" | "completed" | "failed" | "canceled";

export type FemEngineMetrics = {
    elements: number | null;
    hex: number | null;
    wedge: number | null;
    tet: number | null;
    minScaledJacobian: number | null;
    maxAspectRatio: number | null;
    invalidElements: number | null;
};

export type FemEngineStatusResponse = {
    engineJobId: string;
    status: FemEngineJobStatus;
    stage?: string;
    metrics?: FemEngineMetrics | null;
    errorMessage?: string | null;
};

const ENGINE_TIMEOUT_MS = 30_000;

function engineBaseUrl(): string | null {
    const url = process.env.FEM_ENGINE_URL?.trim();
    return url ? url.replace(/\/+$/, "") : null;
}

function engineHeaders(): Record<string, string> {
    const key = process.env.FEM_ENGINE_API_KEY?.trim();
    return key ? { Authorization: `Bearer ${key}` } : {};
}

export function isFemEngineConfigured(): boolean {
    return engineBaseUrl() !== null;
}

export async function submitEngineMeshJob(params: {
    jobId: string;
    userId: string;
    file: File;
    settings: {
        size: number;
        unit: "mm" | "cm" | "m";
        strategy: "hex" | "mixed" | "tet";
        order: "linear" | "quadratic";
        jacobian: number;
        aspect: number;
    };
}): Promise<FemEngineStatusResponse> {
    const base = engineBaseUrl();
    if (!base) {
        throw new Error("ENGINE_NOT_CONFIGURED");
    }

    const form = new FormData();
    form.append("job_id", params.jobId);
    form.append("user_id", params.userId);
    form.append("settings", JSON.stringify(params.settings));
    form.append("file", params.file, params.file.name);

    const res = await fetch(`${base}/v1/mesh/jobs`, {
        method: "POST",
        headers: engineHeaders(),
        body: form,
        signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`ENGINE_SUBMIT_FAILED_${res.status}: ${text.slice(0, 200)}`);
    }

    return (await res.json()) as FemEngineStatusResponse;
}

export async function getEngineJobStatus(engineJobId: string): Promise<FemEngineStatusResponse> {
    const base = engineBaseUrl();
    if (!base) {
        throw new Error("ENGINE_NOT_CONFIGURED");
    }

    const res = await fetch(`${base}/v1/mesh/jobs/${encodeURIComponent(engineJobId)}`, {
        method: "GET",
        headers: engineHeaders(),
        signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS),
    });

    if (!res.ok) {
        throw new Error(`ENGINE_STATUS_FAILED_${res.status}`);
    }

    return (await res.json()) as FemEngineStatusResponse;
}

export async function fetchEngineArtifact(
    engineJobId: string,
    format: "inp" | "msh"
): Promise<Response> {
    const base = engineBaseUrl();
    if (!base) {
        throw new Error("ENGINE_NOT_CONFIGURED");
    }

    return fetch(
        `${base}/v1/mesh/jobs/${encodeURIComponent(engineJobId)}/artifacts/${format}`,
        {
            method: "GET",
            headers: engineHeaders(),
            signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS),
        }
    );
}

