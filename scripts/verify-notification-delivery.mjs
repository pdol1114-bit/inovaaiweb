// node scripts/verify-notification-delivery.mjs — all DB, Resend, PG and clocks are offline mocks.
import assert from "node:assert/strict";
import { createMailHarness } from "./lib/mail-test-harness.mjs";

const HOUR = 60 * 60e3;
const totals = { new: 0, regression: 0 };
async function test(group, label, run) {
    await run();
    totals[group]++;
    console.log(`ok ${group} ${label}`);
}

for (const status of [401, 403]) {
    await test("new", `${status} repeats six times without consuming attempts`, async () => {
        const h = createMailHarness();
        h.respond(status);
        for (let n = 0; n < 6; n++) {
            assert.equal(await h.deliver(), "config_blocked");
            assert.equal(h.rows[0].status, "pending");
            assert.equal(h.rows[0].attempts, 0);
            assert.equal(h.rows[0].sending_started_at, null);
            assert.equal(h.rows[0].last_error, `MAIL_CONFIG_HTTP_${status}`);
            assert.equal(Date.parse(h.rows[0].next_attempt_at), h.now() + HOUR);
            h.advance(HOUR);
        }
        assert.equal(h.requests.length, 6);
        assert.ok(h.requests.every(r => r.key === h.rows[0].id));
    });
    await test("new", `${status} at attempt four never becomes final failure`, async () => {
        const h = createMailHarness({ row: { attempts: 4 } });
        h.respond(status);
        for (let n = 0; n < 6; n++) {
            assert.equal(await h.deliver(), "config_blocked");
            assert.equal(h.rows[0].attempts, 4);
            assert.equal(h.rows[0].status, "pending");
            h.advance(HOUR);
        }
    });
    await test("new", `${status} cooldown excludes immediate delivery and cron selection`, async () => {
        const h = createMailHarness();
        h.respond(status);
        await h.deliver();
        for (const advance of [0, HOUR - 1]) {
            h.advance(advance);
            assert.equal(await h.deliver(), "skipped_not_due");
            const counts = await h.cron();
            assert.equal(Object.keys(counts).length, 0); // filtered by cron query, before delivery/auth
            assert.equal(h.authReads(), 1);
            assert.equal(h.requests.length, 1);
        }
        h.advance(1);
        const counts = await h.cron();
        assert.equal(counts.config_blocked, 1);
        assert.equal(h.requests.length, 2);
        assert.equal(h.rows[0].attempts, 0);
    });
    await test("new", `${status} configuration recovery sends and clears health backlog`, async () => {
        const h = createMailHarness({ row: { attempts: 4 } });
        h.respond(status);
        await h.deliver();
        let health = await h.health();
        assert.equal(health.mailConfigBlocked, 1);
        assert.equal(health.ok, true);
        assert.equal(Object.keys(health.checks).length, 6);
        h.advance(HOUR);
        h.respond(200);
        assert.equal((await h.cron()).sent, 1);
        assert.equal(h.rows[0].status, "sent");
        assert.equal(h.rows[0].attempts, 5);
        assert.equal(h.rows[0].provider_message_id, "provider-fixture");
        assert.equal(Date.parse(h.rows[0].sent_at), h.now());
        assert.equal(h.rows[0].last_error, null);
        assert.equal(h.rows[0].next_attempt_at, null);
        health = await h.health();
        assert.equal(health.mailConfigBlocked, 0);
        assert.equal(health.ok, true);
    });
}
await test("new", "stale reader cannot reclaim after configuration rollback", async () => {
    const h = createMailHarness();
    h.respond(401);
    let release;
    const held = new Promise(resolve => { release = resolve; });
    h.authHook(n => n === 2 ? held : Promise.resolve());
    const first = h.deliver();
    const second = h.deliver();
    assert.equal(await first, "config_blocked");
    release();
    assert.equal(await second, "skipped_claimed");
    assert.equal(h.requests.length, 1);
    assert.equal(h.rows[0].attempts, 0);
});
await test("new", "configuration logs contain only id and fixed code; response body is unread", async () => {
    for (const status of [401, 403]) {
        const h = createMailHarness();
        h.respond(status, `${h.recipient} ${h.env.RESEND_API_KEY}`);
        await h.dispatch.queueAndSend(h.admin, {
            userId: "fixture-user", kind: "payment_failed_first", payload: {}, dedupeKey: "fixture:queue",
        });
        assert.equal(h.bodyReads(), 0);
        assert.equal(h.logs.length, 1);
        assert.equal(h.logs[0], `[mail] id=notification-2 code=MAIL_CONFIG_HTTP_${status}`);
    }
});

for (const [status, name, delay] of [
    [409, "concurrent_idempotent_requests", HOUR],
    [409, "resource_locked", HOUR],
    [409, "invalid_idempotent_request", 25 * HOUR],
    [429, "rate_limit_exceeded", HOUR],
    [500, "server_error", HOUR],
]) {
    await test("regression", `${status} ${name} keeps bounded retry`, async () => {
        const h = createMailHarness();
        h.respond(status, name);
        assert.equal(await h.deliver(), "failed_retry");
        assert.equal(h.rows[0].status, "failed");
        assert.equal(h.rows[0].attempts, 1);
        assert.equal(h.rows[0].last_error, `HTTP_${status}:${name}`);
        assert.equal(Date.parse(h.rows[0].next_attempt_at), h.now() + delay);
        assert.equal(h.requests[0].key, h.rows[0].id);
    });
}
await test("regression", "422 is final with no retry time", async () => {
    const h = createMailHarness();
    h.respond(422);
    assert.equal(await h.deliver(), "failed_final");
    assert.equal(h.rows[0].attempts, 1);
    assert.equal(h.rows[0].next_attempt_at, null);
    assert.equal(await h.deliver(), "skipped_not_due");
});
await test("regression", "ten second timeout is retryable", async () => {
    const h = createMailHarness();
    h.timeout();
    const delivery = h.deliver();
    // Flush asynchronous DB/auth/claim steps until the mocked HTTP request begins.
    for (let n = 0; n < 100 && !h.requests.length; n++) await Promise.resolve();
    assert.equal(h.requests.length, 1);
    h.expireRequestTimers();
    assert.equal(await delivery, "failed_retry");
    assert.equal(h.rows[0].last_error, "TIMEOUT");
    assert.equal(Date.parse(h.rows[0].next_attempt_at), h.now() + HOUR);
});
await test("regression", "ten concurrent claims send exactly once", async () => {
    const h = createMailHarness();
    const results = await Promise.all(Array.from({ length: 10 }, () => h.deliver()));
    assert.equal(results.filter(r => r === "sent").length, 1);
    assert.equal(h.requests.length, 1);
    assert.equal(h.rows[0].attempts, 1);
    assert.equal(h.rows[0].status, "sent");
});
await test("regression", "allowlist outside recipient stays pending with zero attempts", async () => {
    const h = createMailHarness({ env: { MAIL_MODE: "allowlist", MAIL_ALLOWLIST: "" } });
    const before = structuredClone(h.rows[0]);
    assert.equal(await h.deliver(), "skipped_not_allowed");
    assert.equal((await h.cron()).skipped_not_allowed, 1);
    assert.deepEqual(h.rows[0], before);
    assert.equal(h.requests.length, 0);
});
await test("regression", "allowlist matching ignores address case", async () => {
    const h = createMailHarness({ env: { MAIL_MODE: "allowlist" } });
    h.env.MAIL_ALLOWLIST = h.recipient.toUpperCase();
    assert.equal(await h.deliver(), "sent");
});
await test("regression", "off mode does not claim or send", async () => {
    const h = createMailHarness({ env: { MAIL_MODE: "off" } });
    const before = structuredClone(h.rows[0]);
    assert.equal(await h.deliver(), "skipped_disabled");
    assert.equal((await h.cron()).disabled, 1);
    assert.deepEqual(h.rows[0], before);
    assert.equal(h.requests.length, 0);
});
await test("regression", "500 still ends after five attempts with original backoff", async () => {
    const h = createMailHarness();
    h.respond(500);
    for (let attempt = 1; attempt <= 5; attempt++) {
        assert.equal(await h.deliver(), attempt === 5 ? "failed_final" : "failed_retry");
        assert.equal(h.rows[0].attempts, attempt);
        if (attempt < 5) {
            const delay = (attempt < 3 ? 1 : 24) * HOUR;
            assert.equal(Date.parse(h.rows[0].next_attempt_at), h.now() + delay);
            h.advance(delay);
        }
    }
    assert.equal(h.rows[0].next_attempt_at, null);
});
await test("regression", "network failure remains retryable", async () => {
    const h = createMailHarness();
    h.networkError();
    assert.equal(await h.deliver(), "failed_retry");
    assert.equal(h.rows[0].last_error, "NETWORK_ERROR");
});
console.log(`Passed ${totals.new} new and ${totals.regression} regression mail scenarios. Offline only.`);
