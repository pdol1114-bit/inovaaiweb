// 메일 템플릿 렌더링 확인 (의존성 없이 Node 로 실행)
//   node scripts/render-notifications.mts [출력 디렉터리]  (기본: OS 임시 폴더)
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { renderNotification } from "../src/lib/notifications/templates.ts";
import * as biz from "../src/lib/business-info.ts";

const out = process.argv[2] ?? join(tmpdir(), "sniff-render-notifications");
mkdirSync(out, { recursive: true });

const ctx = {
    siteUrl: "https://inovaai.ai",
    supportEmail: biz.SUPPORT_EMAIL,
    business: {
        companyName: biz.COMPANY_NAME.ko,
        representative: biz.REPRESENTATIVE.ko,
        registrationNumber: biz.BUSINESS_REGISTRATION_NUMBER,
        telecomSalesNumber: biz.TELECOM_SALES_NUMBER.ko,
        address: biz.BUSINESS_ADDRESS.ko,
        landline: biz.LANDLINE,
    },
};

const samples = {
    payment_failed_first: {
        subscription_id: "00000000-0000-0000-0000-000000000000",
        due_date: "2026-11-19T01:18:36+00:00",
        amount: 3300,
        card_brand: "신한카드",
        card_last4: "9780",
        retry_dates: ["2026-11-19T15:00:00.000Z", "2026-11-21T15:00:00.000Z"],
        grace_ends_at: "2026-11-22T14:59:59.999Z",
    },
    subscription_canceled_nonpayment: {
        subscription_id: "00000000-0000-0000-0000-000000000000",
        reason: "PAYMENT_FAILED_FINAL",
        due_date: "2026-11-19T01:18:36+00:00",
        amount: 3300,
        card_brand: "신한카드",
        card_last4: "9780",
        canceled_at: "2026-11-22T01:05:12.000Z",
        charge_attempts: 3,
        grace_ends_at: "2026-11-22T14:59:59.999Z",
    },
    subscription_canceled_nonpayment__grace: {
        subscription_id: "00000000-0000-0000-0000-000000000000",
        reason: "GRACE_EXPIRED",
        due_date: "2026-11-19T01:18:36+00:00",
        amount: 3300,
        card_brand: null,
        card_last4: null,
        canceled_at: "2026-11-23T01:00:00.000Z",
        charge_attempts: 2,
        grace_ends_at: "2026-11-22T14:59:59.999Z",
    },
} as const;

for (const [name, payload] of Object.entries(samples)) {
    const kind = name.split("__")[0];
    const a = renderNotification(kind, payload as Record<string, unknown>, ctx);
    const b = renderNotification(kind, payload as Record<string, unknown>, ctx);
    assert.ok(a, `render ${name}`);
    assert.deepEqual(a, b, `deterministic ${name}`);
    assert.ok(!a.html.includes("<script"), "no script");
    writeFileSync(`${out}/${name}.html`, a.html);
    writeFileSync(`${out}/${name}.txt`, `Subject: ${a.subject}\n\n${a.text}\n`);
    console.log(`ok  ${name}  (subject: ${a.subject})`);
}
assert.equal(renderNotification("unknown_kind", {}, ctx), null);
console.log("ok  unknown kind → null");
