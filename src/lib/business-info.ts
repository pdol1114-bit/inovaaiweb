export const BUSINESS_REGISTRATION_NUMBER = "479-81-03783";

export const TELECOM_SALES_NUMBER = {
    ko: "제2026-충북음성-0248호",
    en: "2026-Eumseong-0248",
} as const;

export function getFtcBizCommUrl(businessRegistrationNumber: string): string {
    const wrkrNo = businessRegistrationNumber.replace(/[^0-9]/g, "");
    return `http://www.ftc.go.kr/bizCommPop.do?wrkr_no=${wrkrNo}`;
}
