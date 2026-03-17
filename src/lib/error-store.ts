// Simple in-memory error store for debugging
// This allows us to see the last NextAuth error via GET /api/last-error
export const errorStore: { ts: string; code: string; message: string }[] = [];

export function captureAuthError(code: string, message: unknown) {
    errorStore.unshift({
        ts: new Date().toISOString(),
        code: String(code),
        message: JSON.stringify(message, null, 2),
    });
    // Keep only last 10 errors
    if (errorStore.length > 10) errorStore.pop();
}
