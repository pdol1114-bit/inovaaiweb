// Offline only: transpile the actual route; replace DB, PG and response adapters.
// node scripts/verify-mail-health.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import vm from "node:vm";
import ts from "typescript";

let passed = 0;
const row = (status, last_error, next_attempt_at) => ({ status, last_error, next_attempt_at });
const waiting = [
    row("failed", "HTTP_401:unauthorized", "2099-01-01"),
    row("failed", "HTTP_403:validation_error", "2020-01-01"),
    row("failed", "HTTP_401:unauthorized", null),
    row("failed", "HTTP_500:server_error", "2020-01-01"),
    row("sent", "HTTP_403:validation_error", "2020-01-01"),
    row("sending", "HTTP_403:validation_error", "2020-01-01"),
    row("pending", null, null),
];

function harness(options = {}) {
    const env = {
        RESEND_API_KEY: "re_" + "offline_fixture",
        PORTONE_WEBHOOK_SECRET: "whsec_" + Buffer.from("offline_fixture").toString("base64"),
        BILLING_CRON_SECRET: "x".repeat(64),
        MAIL_MODE: "allowlist",
        ...options.env,
    };
    const rows = [...(options.rows ?? waiting)];
    let now = 1_000_000;
    let reads = 0;
    let pgReads = 0;
    const logs = [];
    class Clock extends Date {
        static now() { return now; }
    }
    const admin = {
        from(table) {
            reads++;
            assert.ok(["web_notifications", "web_subscriptions", "web_payments"].includes(table));
            const filters = [];
            return {
                select(columns, settings) {
                    if (table === "web_notifications") {
                        assert.equal(columns, "id");
                        assert.equal(settings.count, "exact");
                        assert.equal(settings.head, true);
                    }
                    return this;
                },
                limit(n) { assert.equal(n, 0); return this; },
                eq(key, value) { filters.push(r => r[key] === value); return this; },
                not(key, operator, value) {
                    assert.equal(operator, "is");
                    assert.equal(value, null);
                    filters.push(r => r[key] != null);
                    return this;
                },
                or(expression) {
                    const prefixes = expression.split(",").map(part => {
                        const match = /^last_error\.like\.(.+)%$/.exec(part);
                        assert.ok(match);
                        return match[1];
                    });
                    filters.push(r => prefixes.some(prefix => r.last_error?.startsWith(prefix)));
                    return this;
                },
                async then(yes, no) {
                    try {
                        if (table === "web_notifications") {
                            if (options.countThrows) throw new Error("offline query failure");
                            return yes({
                                error: options.countError ? { code: "42703" } : null,
                                count: rows.filter(r => filters.every(f => f(r))).length,
                            });
                        }
                        return yes({ error: options.tableError === table ? { message: "offline table failure" } : null });
                    } catch (error) { return no(error); }
                },
            };
        },
    };
    const adapters = {
        "server-only": {},
        "next/server": { NextResponse: Response },
        "@/utils/supabase/admin": { createAdminClient: () => admin },
        "@/lib/portone/server": {
            getPortOneClient: () => options.noPg ? null : {},
            findPayment: async () => {
                pgReads++;
                if (options.pgError) throw new Error("offline PG failure");
                return null;
            },
        },
    };
    const cache = new Map();
    function load(file) {
        if (cache.has(file)) return cache.get(file).exports;
        const loadedModule = { exports: {} };
        cache.set(file, loadedModule);
        const js = ts.transpileModule(readFileSync(file, "utf8"), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
            fileName: file,
        }).outputText;
        const require = name => {
            if (name in adapters) return adapters[name];
            const target = name.startsWith("@/") ? resolve("src", name.slice(2)) : resolve(dirname(file), name);
            assert.ok(name.startsWith("@/") || name.startsWith("."), `Unexpected dependency: ${name}`);
            return load(target + ".ts");
        };
        vm.runInNewContext(js, {
            module: loadedModule, exports: loadedModule.exports, require, process: { env }, Date: Clock, atob,
            console: { error: (...args) => logs.push(args), info() {}, warn() {} },
        }, { filename: file });
        return loadedModule.exports;
    }
    const route = load(resolve("src/app/api/health/billing/route.ts"));
    return {
        rows, logs,
        advance(ms) { now += ms; },
        reads: () => reads,
        pgReads: () => pgReads,
        async get() {
            const response = await route.GET();
            assert.equal(response.headers.get("cache-control"), "no-store");
            const body = await response.json();
            assert.equal(Object.keys(body.checks).length, 6);
            assert.ok(Object.values(body.checks).every(v => typeof v === "boolean"));
            return { response, body };
        },
    };
}

async function test(label, fn) {
    await fn();
    passed++;
    console.log(`ok ${passed} ${label}`);
}

await test("count only waiting 401/403 rows; six checks and HTTP 200", async () => {
    const { response, body } = await harness().get();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.mailConfigBlocked, 2);
});
await test("empty queue displays zero", async () => {
    assert.equal((await harness({ rows: [] }).get()).body.mailConfigBlocked, 0);
});
for (const failure of ["countError", "countThrows"]) {
    await test(`${failure}: display null; health checks remain true`, async () => {
        const h = harness({ [failure]: true });
        const { response, body } = await h.get();
        assert.equal(response.status, 200);
        assert.equal(body.mailConfigBlocked, null);
        assert.equal(body.ok, true);
        assert.equal(h.logs.length, 1);
    });
}
await test("60 second cache covers count and external probes", async () => {
    const h = harness();
    await h.get();
    h.rows.push(row("failed", "HTTP_403:forbidden", "2099-01-01"));
    assert.equal((await h.get()).body.mailConfigBlocked, 2);
    assert.equal(h.reads(), 3);
    assert.equal(h.pgReads(), 1);
    h.advance(60_001);
    assert.equal((await h.get()).body.mailConfigBlocked, 3);
    assert.equal(h.reads(), 6);
    assert.equal(h.pgReads(), 2);
});
for (const mode of ["off", "allowlist", "live", "invalid"]) {
    await test(`mailMode ${mode} is display only`, async () => {
        const { body } = await harness({ env: { MAIL_MODE: mode } }).get();
        assert.equal(body.ok, true);
        assert.equal(body.mailMode, mode === "invalid" ? "off" : mode);
    });
}
for (const value of [undefined, "incorrect_prefix", "re_fixture\n"]) {
    await test("invalid mail key still fails existing health check", async () => {
        const { response, body } = await harness({ env: { RESEND_API_KEY: value } }).get();
        assert.equal(response.status, 503);
        assert.equal(body.checks.resendApiKey, false);
        assert.equal(body.mailConfigBlocked, 2);
    });
}
for (const table of ["web_subscriptions", "web_payments"]) {
    await test(`${table} error still returns HTTP 503`, async () => {
        const { response } = await harness({ tableError: table }).get();
        assert.equal(response.status, 503);
    });
}
for (const failure of ["pgError", "noPg"]) {
    await test(`${failure} still fails existing health check`, async () => {
        const { response, body } = await harness({ [failure]: true }).get();
        assert.equal(response.status, 503);
        assert.equal(body.checks.portoneApi, false);
    });
}
console.log(`Passed ${passed} offline health scenarios; no network or production credentials used.`);
