/**
 * 결제 안내 메일 템플릿 (한국어, 거래 안내 전용 — 마케팅 문구 금지).
 *
 * 결정적 렌더링: 같은 (kind, payload, ctx) 이면 항상 같은 결과. 현재 시각·난수 등
 * 가변값을 본문에 넣지 않는다 (Resend Idempotency-Key 재시도 시 본문이 바뀌면 409).
 * 외부 모듈을 import 하지 않는다 — 사업자정보·사이트 주소는 ctx 로 받는다.
 */

export type TemplateContext = {
    siteUrl: string;
    supportEmail: string;
    business: {
        companyName: string;
        representative: string;
        registrationNumber: string;
        telecomSalesNumber: string;
        address: string;
        landline: string;
    };
};

export type RenderedEmail = { subject: string; html: string; text: string };

type Payload = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function formatDate(iso: string | null): string {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Seoul",
    }).format(d);
}

function formatDateTime(iso: string | null): string {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Seoul",
    }).format(d);
}

function formatAmount(amount: number | null): string {
    return amount === null ? "-" : `₩${amount.toLocaleString("ko-KR")}`;
}

/** "등록하신 카드(신한카드 끝자리 9780)" — 카드 정보가 없으면 "등록하신 카드" */
function cardPhrase(p: Payload): string {
    const brand = str(p.card_brand);
    const last4 = str(p.card_last4);
    const detail = brand && last4 ? `${brand} 끝자리 ${last4}` : last4 ? `끝자리 ${last4}` : brand;
    return detail ? `등록하신 카드(${detail})` : "등록하신 카드";
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** 본문 블록: 문단(string) 또는 목록(string[]) */
type Block = string | string[];

function build(subject: string, blocks: Block[], ctx: TemplateContext): RenderedEmail {
    const b = ctx.business;
    const footerLines = [
        "본 메일은 결제 결과를 알려 드리는 거래 안내 메일입니다.",
        `${b.companyName} | 대표 ${b.representative} | 사업자등록번호 ${b.registrationNumber}`,
        `통신판매업신고 ${b.telecomSalesNumber}`,
        `${b.address} | ${b.landline}`,
    ];

    const text = [
        ...blocks.map((blk) => (Array.isArray(blk) ? blk.map((l) => `· ${l}`).join("\n") : blk)),
        `문의: ${ctx.supportEmail}`,
        ["──", ...footerLines].join("\n"),
    ].join("\n\n");

    const htmlBlocks = blocks
        .map((blk) =>
            Array.isArray(blk)
                ? `<ul style="margin:0 0 16px;padding-left:20px;">${blk
                      .map((l) => `<li style="margin:4px 0;">${linkify(escapeHtml(l))}</li>`)
                      .join("")}</ul>`
                : `<p style="margin:0 0 16px;">${linkify(escapeHtml(blk))}</p>`
        )
        .join("");

    const html =
        `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>` +
        `<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#0f172a;font-size:15px;line-height:1.6;">` +
        `<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px;">` +
        htmlBlocks +
        `<p style="margin:0 0 16px;">문의: <a href="mailto:${escapeHtml(ctx.supportEmail)}" style="color:#2563eb;">${escapeHtml(ctx.supportEmail)}</a></p>` +
        `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;">` +
        footerLines.map((l) => `<p style="margin:0 0 4px;font-size:12px;color:#64748b;">${escapeHtml(l)}</p>`).join("") +
        `</div></body></html>`;

    return { subject, html, text };
}

/** 이스케이프된 문자열 안의 https URL 을 링크로 */
function linkify(escaped: string): string {
    return escaped.replace(/https:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color:#2563eb;">${u}</a>`);
}

function renderPaymentFailedFirst(p: Payload, ctx: TemplateContext): RenderedEmail {
    const due = formatDate(str(p.due_date));
    const amount = formatAmount(num(p.amount));
    const retryDates = Array.isArray(p.retry_dates)
        ? (p.retry_dates as unknown[]).map((d) => formatDate(str(d))).join(", ")
        : "-";
    const grace = formatDate(str(p.grace_ends_at));

    return build(
        "[Sniff] Premium 정기결제가 완료되지 않았습니다",
        [
            "안녕하세요, Sniff입니다.",
            `${due}에 예정된 Sniff Premium 정기결제(${amount}, 부가세 포함)가 ${cardPhrase(p)}로 완료되지 않았습니다.`,
            [
                `${retryDates}에 같은 카드로 다시 결제를 시도합니다.`,
                `${grace}까지는 Sniff Premium을 계속 이용하실 수 있습니다.`,
                "카드 한도와 카드 상태(정지·만료 여부)를 확인해 주세요.",
            ],
            `다른 카드로 이용하시려면 ${ctx.siteUrl}/ko/payment 에서 새 카드로 구독하실 수 있습니다. 이 경우 이번 회차 요금은 청구되지 않습니다.`,
        ],
        ctx
    );
}

function renderCanceledNonpayment(p: Payload, ctx: TemplateContext): RenderedEmail {
    const due = formatDate(str(p.due_date));
    const amount = formatAmount(num(p.amount));
    const canceledAt = formatDateTime(str(p.canceled_at));
    const reason = str(p.reason);
    const attempts = num(p.charge_attempts);

    const detail =
        reason === "GRACE_EXPIRED"
            ? `결제 유예기간(${formatDate(str(p.grace_ends_at))}까지)이 지났습니다.`
            : `${due}부터 총 ${attempts ?? "-"}회 결제를 시도했습니다.`;

    return build(
        "[Sniff] 결제가 완료되지 않아 Premium 구독이 종료되었습니다",
        [
            "안녕하세요, Sniff입니다.",
            `${due}에 예정된 Sniff Premium 정기결제(${amount}, 부가세 포함)가 ${cardPhrase(p)}로 완료되지 않아 ${canceledAt} 기준으로 구독이 종료되었습니다.`,
            [
                detail,
                "결제되지 않은 회차의 요금은 청구되지 않습니다.",
                "등록하신 카드 정보(빌링키)는 삭제되었습니다.",
            ],
            `다시 이용하시려면 ${ctx.siteUrl}/ko/payment 에서 새 카드로 구독하실 수 있습니다.`,
        ],
        ctx
    );
}

export const NOTIFICATION_KINDS = ["payment_failed_first", "subscription_canceled_nonpayment"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** 알 수 없는 kind 면 null (발송하지 않고 영구 실패 처리) */
export function renderNotification(kind: string, payload: Payload, ctx: TemplateContext): RenderedEmail | null {
    switch (kind) {
        case "payment_failed_first":
            return renderPaymentFailedFirst(payload, ctx);
        case "subscription_canceled_nonpayment":
            return renderCanceledNonpayment(payload, ctx);
        default:
            return null;
    }
}
