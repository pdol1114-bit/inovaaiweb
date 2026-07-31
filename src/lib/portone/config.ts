export const PORTONE_STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? "";
export const PORTONE_CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ?? "";

export const isPortOneConfigured = () =>
    PORTONE_STORE_ID.length > 0 && PORTONE_CHANNEL_KEY.length > 0;

// PortOne test channels are issued with a `channel-key-test-` style prefix; this is
// only used to surface a console warning so a test channel is never mistaken for live.
export const isPortOneTestMode = () => PORTONE_CHANNEL_KEY.includes("test");
