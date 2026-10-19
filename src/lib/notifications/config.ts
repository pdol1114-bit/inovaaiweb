import "server-only";
import {
    BUSINESS_ADDRESS,
    BUSINESS_REGISTRATION_NUMBER,
    COMPANY_NAME,
    LANDLINE,
    REPRESENTATIVE,
    SUPPORT_EMAIL,
    TELECOM_SALES_NUMBER,
} from "@/lib/business-info";
import type { TemplateContext } from "@/lib/notifications/templates";

/**
 * 메일 발송 설정 (apphosting.yaml 의 RUNTIME 값. 값은 Kevin 이 확정).
 *
 *   RESEND_API_KEY      secret resend-api-key
 *   MAIL_FROM           예: "Sniff <no-reply@발신도메인>"  — 없으면 발송하지 않음
 *   MAIL_REPLY_TO       회신 주소 (선택)
 *   MAIL_SUPPORT_EMAIL  본문의 문의 주소 (없으면 사업자정보의 SUPPORT_EMAIL)
 *   MAIL_MODE           off(기본) | allowlist | live
 *   MAIL_ALLOWLIST      allowlist 모드에서 발송을 허용할 주소 (쉼표 구분)
 *
 * off 이거나 MAIL_FROM·API 키가 없으면 선점하지 않고 pending 으로 둔다.
 * allowlist 모드에서는 목록에 없는 수신자의 행을 건드리지 않는다 (운영 사용자 발송 불가).
 */

export type MailMode = "off" | "allowlist" | "live";

export type MailConfig = {
    mode: MailMode;
    /** 발송 가능 여부 (mode≠off, API 키·MAIL_FROM·사이트 주소 모두 있음) */
    enabled: boolean;
    apiKey: string | null;
    from: string | null;
    replyTo: string | null;
    allowlist: Set<string>;
    template: TemplateContext | null;
};

export function parseMailMode(value: string | undefined): MailMode {
    return value === "allowlist" || value === "live" ? value : "off";
}

export function getMailConfig(): MailConfig {
    const mode = parseMailMode(process.env.MAIL_MODE);
    const apiKey = process.env.RESEND_API_KEY?.trim() || null;
    const from = process.env.MAIL_FROM?.trim() || null;
    const replyTo = process.env.MAIL_REPLY_TO?.trim() || null;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || null;
    const allowlist = new Set(
        (process.env.MAIL_ALLOWLIST ?? "")
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
    );

    const template: TemplateContext | null = siteUrl
        ? {
              siteUrl,
              supportEmail: process.env.MAIL_SUPPORT_EMAIL?.trim() || SUPPORT_EMAIL,
              business: {
                  companyName: COMPANY_NAME.ko,
                  representative: REPRESENTATIVE.ko,
                  registrationNumber: BUSINESS_REGISTRATION_NUMBER,
                  telecomSalesNumber: TELECOM_SALES_NUMBER.ko,
                  address: BUSINESS_ADDRESS.ko,
                  landline: LANDLINE,
              },
          }
        : null;

    return {
        mode,
        enabled: mode !== "off" && !!apiKey && !!from && !!template,
        apiKey,
        from,
        replyTo,
        allowlist,
        template,
    };
}

/** 이 수신자에게 보내도 되는지 (allowlist 모드 판정) */
export function isRecipientAllowed(config: MailConfig, email: string): boolean {
    if (config.mode === "live") return true;
    if (config.mode === "allowlist") return config.allowlist.has(email.trim().toLowerCase());
    return false;
}
