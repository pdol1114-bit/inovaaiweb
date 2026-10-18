// 결제일 유틸 검증 스크립트. 의존성 없이 Node(타입 스트리핑)로 실행한다.
//   node scripts/verify-billing-period.mts
import assert from "node:assert/strict";
import { addBillingMonths, nextBillingDateAfter, firstBillingPeriod } from "../src/lib/billing/period.ts";

// KST 벽시계 문자열 → Date
const kst = (s: string) => new Date(`${s}+09:00`);
// Date → KST 벽시계 문자열 (YYYY-MM-DD HH:mm)
const fmt = (d: Date) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 16).replace("T", " ");

let passed = 0;
function check(name: string, anchor: string, months: number[], expected: string[]) {
    const a = kst(anchor);
    const got = months.map((n) => fmt(addBillingMonths(a, n)));
    assert.deepEqual(got, expected, name);
    console.log(`ok  ${name}\n    ${anchor} → ${got.join(" → ")}`);
    passed++;
}

check("1/31 가입 (평년)", "2027-01-31T10:00", [1, 2, 3, 4],
    ["2027-02-28 10:00", "2027-03-31 10:00", "2027-04-30 10:00", "2027-05-31 10:00"]);

check("1/31 가입 (윤년)", "2028-01-31T10:00", [1, 2],
    ["2028-02-29 10:00", "2028-03-31 10:00"]);

check("2/29 가입 (윤년)", "2028-02-29T10:00", [1, 11, 12, 48],
    ["2028-03-29 10:00", "2029-01-29 10:00", "2029-02-28 10:00", "2032-02-29 10:00"]);

check("3/31 가입", "2027-03-31T10:00", [1, 2, 11],
    ["2027-04-30 10:00", "2027-05-31 10:00", "2028-02-29 10:00"]);

check("12/31 가입 (연도 넘김)", "2026-12-31T10:00", [1, 2, 3, 12],
    ["2027-01-31 10:00", "2027-02-28 10:00", "2027-03-31 10:00", "2027-12-31 10:00"]);

// KST 새벽(UTC 로는 전날) 가입자: 일자가 KST 기준으로 유지돼야 한다.
check("KST 새벽 경계 (2/1 00:30 KST = 1/31 UTC)", "2027-02-01T00:30", [1, 2],
    ["2027-03-01 00:30", "2027-04-01 00:30"]);
check("KST 말일 새벽 (1/31 03:00 KST)", "2027-01-31T03:00", [1],
    ["2027-02-28 03:00"]);

// nextBillingDateAfter: 직전 결제일이 말일 보정됐어도 기준 일자로 복귀
{
    const anchor = kst("2027-01-31T10:00");
    assert.equal(fmt(nextBillingDateAfter(anchor, kst("2027-01-31T10:00"))), "2027-02-28 10:00");
    assert.equal(fmt(nextBillingDateAfter(anchor, kst("2027-02-28T10:00"))), "2027-03-31 10:00");
    assert.equal(fmt(nextBillingDateAfter(anchor, kst("2027-02-28T09:59"))), "2027-02-28 10:00");
    assert.equal(fmt(nextBillingDateAfter(anchor, kst("2028-01-15T00:00"))), "2028-01-31 10:00");
    console.log("ok  nextBillingDateAfter (말일 보정 후 복귀, 경계 시각)");
    passed++;
}

{
    const p = firstBillingPeriod(kst("2027-01-31T10:00"));
    assert.equal(fmt(p.periodStart), "2027-01-31 10:00");
    assert.equal(fmt(p.periodEnd), "2027-02-28 10:00");
    console.log("ok  firstBillingPeriod");
    passed++;
}

console.log(`\n${passed} checks passed`);
