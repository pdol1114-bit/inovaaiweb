"use client";

import { useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { Button } from "@/components/ui/button";
import {
    PORTONE_STORE_ID,
    PORTONE_CHANNEL_KEY,
    isPortOneConfigured,
    isPortOneTestMode,
} from "@/lib/portone/config";

const TEST_AMOUNT = 1000;

export default function TestPaymentPage() {
    const [isPending, setIsPending] = useState(false);
    const [result, setResult] = useState<unknown>(null);
    const [error, setError] = useState<string | null>(null);

    const handlePay = async () => {
        setError(null);
        setResult(null);

        if (!isPortOneConfigured()) {
            setError("NEXT_PUBLIC_PORTONE_STORE_ID / NEXT_PUBLIC_PORTONE_CHANNEL_KEY 미설정");
            return;
        }

        setIsPending(true);
        try {
            const response = await PortOne.requestPayment({
                storeId: PORTONE_STORE_ID,
                channelKey: PORTONE_CHANNEL_KEY,
                paymentId: `test-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
                orderName: "KCP 테스트 결제",
                totalAmount: TEST_AMOUNT,
                currency: "KRW",
                payMethod: "CARD",
                redirectUrl: `${window.location.origin}${window.location.pathname}`,
            });

            // 리디렉션 방식에서는 브라우저가 이동하므로 여기까지 오지 않는다.
            if (!response) return;

            setResult(response);
            if (response.code != null) {
                setError(response.message ?? "결제 실패");
            }
        } catch (e) {
            console.error("[test-payment] requestPayment failed", e);
            setError(e instanceof Error ? e.message : "알 수 없는 오류");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <main className="container mx-auto max-w-xl px-4 py-16 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">PortOne 결제창 테스트</h1>
                <p className="mt-1 text-sm text-slate-500">
                    연동 확인용 페이지입니다. 실제 서비스 화면이 아닙니다.
                </p>
            </div>

            <dl className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
                <div className="flex gap-2">
                    <dt className="font-semibold">storeId</dt>
                    <dd className="font-mono break-all">{PORTONE_STORE_ID || "(미설정)"}</dd>
                </div>
                <div className="flex gap-2">
                    <dt className="font-semibold">channelKey</dt>
                    <dd className="font-mono break-all">{PORTONE_CHANNEL_KEY || "(미설정)"}</dd>
                </div>
                <div className="flex gap-2">
                    <dt className="font-semibold">mode</dt>
                    <dd>{isPortOneTestMode() ? "TEST" : "LIVE — 실제 결제됨"}</dd>
                </div>
                <div className="flex gap-2">
                    <dt className="font-semibold">amount</dt>
                    <dd>{TEST_AMOUNT.toLocaleString()}원</dd>
                </div>
            </dl>

            <Button onClick={handlePay} isLoading={isPending} size="lg" className="w-full">
                결제창 호출
            </Button>

            {error && (
                <p role="alert" className="text-sm font-medium text-red-600">
                    {error}
                </p>
            )}

            {result != null && (
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
                    {JSON.stringify(result, null, 2)}
                </pre>
            )}
        </main>
    );
}
