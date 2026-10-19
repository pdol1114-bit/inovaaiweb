/**
 * 월 단위 결제일 계산.
 *
 * - 기준일(anchor)은 첫 결제 시각이다 (web_subscriptions.started_at).
 * - n번째 결제일은 항상 기준일에서 n개월을 더해 계산한다. 직전 결제일에서 더하지
 *   않으므로 1/31 가입 → 2/28(윤년 2/29) → 3/31 처럼 원래 일자로 돌아온다.
 * - 그 달에 해당 일자가 없으면 말일로 당긴다.
 * - 날짜(일자)는 한국 시간 기준이다. UTC 로 계산하면 KST 00:00~08:59 가입자의
 *   일자가 하루 어긋난다. KST 는 서머타임이 없어 +9시간 고정 오프셋을 쓴다.
 * - 시각(시:분:초)은 기준일의 KST 시각을 그대로 유지한다.
 *
 * 순수 함수만 둔다 (서버·클라이언트 양쪽에서 import 가능, 외부 의존 없음).
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function daysInMonthUTC(year: number, monthIndex: number): number {
    return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** 기준일에서 months 개월 뒤의 결제 시각. 월말 보정 포함. */
export function addBillingMonths(anchor: Date, months: number): Date {
    if (!Number.isInteger(months)) throw new Error("months must be an integer");
    if (Number.isNaN(anchor.getTime())) throw new Error("invalid anchor date");

    // KST 벽시계 값을 UTC 필드로 읽기 위해 오프셋만큼 민다.
    const k = new Date(anchor.getTime() + KST_OFFSET_MS);
    const anchorDay = k.getUTCDate();

    const totalMonths = k.getUTCFullYear() * 12 + k.getUTCMonth() + months;
    const year = Math.floor(totalMonths / 12);
    const monthIndex = totalMonths - year * 12;
    const day = Math.min(anchorDay, daysInMonthUTC(year, monthIndex));

    const kstWallClock = Date.UTC(
        year,
        monthIndex,
        day,
        k.getUTCHours(),
        k.getUTCMinutes(),
        k.getUTCSeconds(),
        k.getUTCMilliseconds()
    );
    return new Date(kstWallClock - KST_OFFSET_MS);
}

/** 기준일 기준 결제 회차 중 `after` 보다 엄격히 뒤인 첫 결제일. */
export function nextBillingDateAfter(anchor: Date, after: Date): Date {
    const k = new Date(anchor.getTime() + KST_OFFSET_MS);
    const a = new Date(after.getTime() + KST_OFFSET_MS);
    const monthsBetween =
        (a.getUTCFullYear() - k.getUTCFullYear()) * 12 + (a.getUTCMonth() - k.getUTCMonth());

    // 추정치 직전부터 올라가며 찾는다 (최대 몇 번만 돈다).
    for (let n = Math.max(1, monthsBetween - 1); ; n++) {
        const candidate = addBillingMonths(anchor, n);
        if (candidate.getTime() > after.getTime()) return candidate;
    }
}

/** 첫 결제(기준일 = 결제 시각)의 이용 기간. period_end 가 다음 결제일이다. */
export function firstBillingPeriod(paidAt: Date): { periodStart: Date; periodEnd: Date } {
    return { periodStart: paidAt, periodEnd: addBillingMonths(paidAt, 1) };
}

/** date 의 KST 날짜에 addDays 를 더한 날의 KST 00:00:00.000 */
export function kstStartOfDay(date: Date, addDays = 0): Date {
    const k = new Date(date.getTime() + KST_OFFSET_MS);
    const kstMidnight = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() + addDays);
    return new Date(kstMidnight - KST_OFFSET_MS);
}

/** date 의 KST 날짜에 addDays 를 더한 날의 KST 23:59:59.999 */
export function kstEndOfDay(date: Date, addDays = 0): Date {
    return new Date(kstStartOfDay(date, addDays + 1).getTime() - 1);
}
