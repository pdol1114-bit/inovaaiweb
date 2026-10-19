// Offline adapters for the actual mail modules and health route. No .env or network access.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import ts from "typescript";

export function createMailHarness(options = {}) {
    let now = Date.parse("2026-10-19T00:00:00.000Z");
    let responseStatus = 200;
    let responseName = "unknown";
    let networkError = false;
    let timeout = false;
    let bodyReads = 0;
    let authReads = 0;
    let authHook = async () => {};
    const recipient = ["fixture", "example.invalid"].join("@");
    const env = {
        MAIL_MODE: "live",
        MAIL_FROM: ["sender", "example.invalid"].join("@"),
        MAIL_ALLOWLIST: recipient,
        NEXT_PUBLIC_SITE_URL: "https://example.invalid",
        RESEND_API_KEY: "re_" + "offline_fixture",
        PORTONE_WEBHOOK_SECRET: "whsec_" + Buffer.from("fixture").toString("base64"),
        BILLING_CRON_SECRET: "x".repeat(64),
        ...options.env,
    };
    const rows = [{
        id: "notification-1", user_id: "fixture-user", kind: "payment_failed_first",
        payload: { amount: 3300, due_date: new Date(now).toISOString() },
        status: "pending", attempts: 0, last_error: null, next_attempt_at: null,
        sending_started_at: null, created_at: new Date(now).toISOString(),
        ...options.row,
    }];
    const requests = [];
    const logs = [];
    const queries = [];
    const timers = new Set();
    class Clock extends Date {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
    }

    function query(table) {
        assert.ok(["web_notifications", "web_subscriptions", "web_payments"].includes(table));
        const filters = [];
        let patch = null;
        let insertion = null;
        let countOnly = false;
        let single = false;
        let limit = Infinity;
        let sortKey = null;
        const q = {
            select(_columns, settings) { countOnly = settings?.head === true; return q; },
            update(value) { patch = value; return q; },
            upsert(value, settings) {
                assert.equal(settings.onConflict, "dedupe_key");
                assert.equal(settings.ignoreDuplicates, true);
                insertion = value;
                return q;
            },
            eq(key, value) { filters.push(r => r[key] === value); return q; },
            in(key, values) { filters.push(r => values.includes(r[key])); return q; },
            not(key, operator, value) {
                assert.equal(operator, "is");
                assert.equal(value, null);
                filters.push(r => r[key] != null);
                return q;
            },
            lt(key, value) { filters.push(r => r[key] != null && r[key] < value); return q; },
            lte(key, value) { filters.push(r => r[key] != null && r[key] <= value); return q; },
            or(expression) {
                const alternatives = expression.split(",").map(part => {
                    const match = /^(\w+)\.(is|lte)\.(.*)$/.exec(part);
                    assert.ok(match, "supported query predicate");
                    const [, key, operator, value] = match;
                    return operator === "is"
                        ? r => r[key] == null
                        : r => r[key] != null && r[key] <= value;
                });
                filters.push(r => alternatives.some(f => f(r)));
                return q;
            },
            order(key) { sortKey = key; return q; },
            limit(value) { limit = value; return q; },
            maybeSingle() { single = true; return q; },
            then(yes, no) {
                return Promise.resolve().then(() => {
                    queries.push({ table, update: !!patch, countOnly });
                    if (table !== "web_notifications") return { data: [], error: null };
                    if (insertion) {
                        if (rows.some(r => r.dedupe_key === insertion.dedupe_key)) return { data: [], error: null };
                        rows.push({ ...rows[0], ...insertion, id: `notification-${rows.length + 1}` });
                        return { data: [{ id: rows.at(-1).id }], error: null };
                    }
                    let selected = rows.filter(r => filters.every(f => f(r)));
                    if (sortKey) selected.sort((a, b) => String(a[sortKey]).localeCompare(String(b[sortKey])));
                    selected = selected.slice(0, limit);
                    if (patch) selected.forEach(r => Object.assign(r, patch));
                    const data = structuredClone(selected);
                    return { data: countOnly ? null : single ? data[0] ?? null : data, count: selected.length, error: null };
                }).then(yes, no);
            },
        };
        return q;
    }
    const admin = {
        from: query,
        auth: { admin: { async getUserById() {
            authReads++;
            await authHook(authReads);
            return { data: { user: { email: recipient } }, error: null };
        } } },
    };
    const adapters = {
        "server-only": {},
        "next/server": { NextResponse: Response },
        "@/utils/supabase/admin": { createAdminClient: () => admin },
        "@/lib/portone/server": { getPortOneClient: () => ({}), findPayment: async () => null },
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
            assert.ok(name.startsWith("@/") || name.startsWith("."), "unexpected dependency");
            return load((name.startsWith("@/") ? resolve("src", name.slice(2)) : resolve(dirname(file), name)) + ".ts");
        };
        vm.runInNewContext(js, {
            module: loadedModule, exports: loadedModule.exports, require, process: { env }, Date: Clock, atob,
            AbortController, Error,
            console: Object.fromEntries(["error", "info", "warn"].map(level => [level, (...args) => logs.push(args.join(" "))])),
            setTimeout(callback, delay) { const timer = { callback, delay }; timers.add(timer); return timer; },
            clearTimeout(timer) { timers.delete(timer); },
            async fetch(url, request) {
                assert.equal(url, "https://api.resend.com/emails");
                assert.equal(request.headers.Authorization, `Bearer ${env.RESEND_API_KEY}`);
                requests.push({ key: request.headers["Idempotency-Key"], body: JSON.parse(request.body) });
                if (networkError) throw new Error("offline network error");
                if (timeout) return new Promise((_, reject) => {
                    request.signal.addEventListener("abort", () => {
                        const error = new Error("offline timeout");
                        error.name = "AbortError";
                        reject(error);
                    }, { once: true });
                });
                return {
                    status: responseStatus, ok: responseStatus >= 200 && responseStatus < 300,
                    async json() { bodyReads++; return { id: "provider-fixture", name: responseName }; },
                };
            },
        }, { filename: file });
        return loadedModule.exports;
    }
    const dispatch = load(resolve("src/lib/notifications/dispatch.ts"));
    const health = load(resolve("src/app/api/health/billing/route.ts"));
    return {
        admin, dispatch, rows, requests, logs, queries, env, recipient,
        now: () => now,
        advance(ms) { now += ms; },
        bodyReads: () => bodyReads,
        authReads: () => authReads,
        authHook(fn) { authHook = fn; },
        respond(status, name = "unknown") { responseStatus = status; responseName = name; timeout = false; networkError = false; },
        timeout() { timeout = true; },
        networkError() { networkError = true; },
        expireRequestTimers() { for (const timer of timers) if (timer.delay === 10_000) timer.callback(); },
        deliver: () => dispatch.deliverNotification(admin, rows[0].id),
        cron: () => dispatch.processPendingNotifications(admin, () => false),
        async health() { return (await health.GET()).json(); },
    };
}
