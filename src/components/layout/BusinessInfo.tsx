"use client";

import { useLocale, useTranslations } from "next-intl";
import {
    BUSINESS_ADDRESS,
    BUSINESS_REGISTRATION_NUMBER,
    COMPANY_NAME,
    CUSTOMER_PHONE,
    LANDLINE,
    REPRESENTATIVE,
    SUPPORT_EMAIL,
    TELECOM_SALES_NUMBER,
    getFtcBizCommUrl,
} from "@/lib/business-info";

type Locale = keyof typeof COMPANY_NAME;

/**
 * 전자상거래법·PG 심사 요건상 상시 노출해야 하는 사업자정보 블록.
 * 푸터와 결제 페이지가 이 컴포넌트를 공유하므로 값은 한 곳(business-info.ts)에만 존재한다.
 */
export function BusinessInfo({ className }: { className?: string }) {
    const t = useTranslations("BusinessInfo");
    const locale = useLocale() as Locale;

    const rows: { label: string; value: string }[] = [
        { label: t("companyName"), value: COMPANY_NAME[locale] },
        { label: t("representative"), value: REPRESENTATIVE[locale] },
        { label: t("businessNumber"), value: BUSINESS_REGISTRATION_NUMBER },
        { label: t("address"), value: BUSINESS_ADDRESS[locale] },
    ];

    // 070 유선번호가 아직 없으면 줄 자체를 렌더링하지 않는다.
    if (LANDLINE) {
        rows.push({ label: t("landline"), value: LANDLINE });
    }

    rows.push(
        { label: t("customerPhone"), value: CUSTOMER_PHONE },
        { label: t("email"), value: SUPPORT_EMAIL }
    );

    return (
        <ul className={className}>
            {rows.map((row) => (
                <li key={row.label}>
                    {row.label} {row.value}
                </li>
            ))}
            <li>
                <a
                    href={getFtcBizCommUrl(BUSINESS_REGISTRATION_NUMBER)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors underline-offset-2 hover:underline"
                >
                    {t("telecomSalesNumber")} {TELECOM_SALES_NUMBER[locale]}
                </a>
            </li>
        </ul>
    );
}
