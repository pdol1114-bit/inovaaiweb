export const PORTONE_STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? "";
export const PORTONE_CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ?? "";

export const isPortOneConfigured = () =>
    PORTONE_STORE_ID.length > 0 && PORTONE_CHANNEL_KEY.length > 0;

/**
 * 테스트 연동 모드 여부.
 *
 * PortOne V2의 채널 키는 `channel-key-{UUID}` 고정 형식이라 문자열만으로는
 * 테스트/실결제를 구분할 수 없다(콘솔의 연동 모드로만 결정됨). 그래서 모드는
 * 채널 키에서 추론하지 않고 환경변수로 명시한다.
 *
 * 미설정 시 실결제로 간주한다 — 값을 빠뜨렸을 때 실결제 채널을 "TEST"로
 * 잘못 표시하는 쪽이 그 반대보다 위험하기 때문이다.
 */
export const isPortOneTestMode = () => process.env.NEXT_PUBLIC_PORTONE_MODE === "test";
