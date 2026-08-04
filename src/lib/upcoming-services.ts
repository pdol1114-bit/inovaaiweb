/**
 * 아직 출시 전이라 화면에 "COMING SOON" 오버레이가 걸려 있는 서비스들.
 *
 * KCP 카드사 심사에서 "사이트 100% 완성" 항목에 걸리지 않도록 심사 기간에는
 * 네비바·푸터 메뉴에서 감춘다. 라우트 자체는 살아 있어 URL 직접 접근은 가능하다.
 *
 * 심사가 끝나면 apphosting.yaml에서 NEXT_PUBLIC_SHOW_UPCOMING_SERVICES=true 로
 * 바꾸기만 하면 메뉴가 그대로 복구된다.
 */
export const UPCOMING_SERVICE_PATHS = [
    "/sniff-hospital",
    "/csv-automation",
    "/fem-ai",
] as const;

/**
 * 기본값(미설정)은 '숨김'이다. NEXT_PUBLIC_* 는 빌드타임에 인라인되므로,
 * 값을 비운 채 배포해도 안전한 쪽이 기본값이어야 한다.
 */
export const showUpcomingServices =
    process.env.NEXT_PUBLIC_SHOW_UPCOMING_SERVICES === "true";

export function isUpcomingService(href: string): boolean {
    return (UPCOMING_SERVICE_PATHS as readonly string[]).includes(href);
}

/** 메뉴에 노출할 서비스만 남긴다. */
export function filterVisibleServices<T extends { href: string }>(items: T[]): T[] {
    if (showUpcomingServices) return items;
    return items.filter((item) => !isUpcomingService(item.href));
}
