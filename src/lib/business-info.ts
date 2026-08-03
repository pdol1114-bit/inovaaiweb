export const BUSINESS_REGISTRATION_NUMBER = "479-81-03783";

export const TELECOM_SALES_NUMBER = {
    ko: "제2026-충북음성-0248호",
    en: "2026-Eumseong-0248",
} as const;

export const COMPANY_NAME = {
    ko: "주식회사 이노바에이아이",
    en: "InovaAI Co., Ltd.",
} as const;

export const REPRESENTATIVE = {
    ko: "성지세",
    en: "Jise Sung",
} as const;

export const BUSINESS_ADDRESS = {
    ko: "충청북도 음성군 맹동면 대하1길 4, 2층 204호",
    en: "Room 204, 2nd Floor, 4 Daeha 1-gil, Maengdong-myeon, Eumseong-gun, Chungcheongbuk-do, Korea",
} as const;

/**
 * PG 심사 요건상 사업자정보의 전화번호는 유선전화여야 한다 (휴대폰번호 불가).
 * 값이 비어 있으면 사업자정보 블록에서 해당 줄이 렌더링되지 않는다.
 *
 * TODO: 070 인터넷전화 개통 후 입력
 */
export const LANDLINE = "";

/** 고객문의용 휴대폰. 위 유선번호 요건과는 별개로 계속 노출한다. */
export const CUSTOMER_PHONE = "010-8069-1218";

export const SUPPORT_EMAIL = "support@inovaai.ai";

export function getFtcBizCommUrl(businessRegistrationNumber: string): string {
    const wrkrNo = businessRegistrationNumber.replace(/[^0-9]/g, "");
    return `http://www.ftc.go.kr/bizCommPop.do?wrkr_no=${wrkrNo}`;
}
