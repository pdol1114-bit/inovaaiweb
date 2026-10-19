/** 로그용 수신 주소 마스킹: sniffreview2026@gmail.com → s***6@gmail.com */
export function maskEmail(email: string | null | undefined): string {
    if (!email) return "-";
    const at = email.lastIndexOf("@");
    if (at <= 0) return "***";
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    const masked = local.length <= 2 ? `${local[0]}***` : `${local[0]}***${local[local.length - 1]}`;
    return `${masked}@${domain}`;
}
