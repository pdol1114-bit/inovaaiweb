"use client";

import { useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import {
    PORTONE_STORE_ID,
    PORTONE_CHANNEL_KEY,
    isPortOneConfigured,
    isPortOneTestMode,
} from "@/lib/portone/config";

export function SubscribeButton() {
    const t = useTranslations("Payment");
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);

    const handleSubscribe = async () => {
        setError(null);

        if (!isPortOneConfigured()) {
            setError(t("errors.notConfigured"));
            return;
        }

        setIsPending(true);
        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/auth");
                return;
            }

            if (isPortOneTestMode()) {
                console.warn("[PortOne] TEST MODE — billing key issuance is not a real payment");
            }

            const response = await PortOne.requestIssueBillingKey({
                storeId: PORTONE_STORE_ID,
                channelKey: PORTONE_CHANNEL_KEY,
                billingKeyMethod: "CARD",
                issueId: crypto.randomUUID(),
                issueName: t("planName"),
                customer: {
                    customerId: user.id,
                    email: user.email,
                },
                redirectUrl: `${window.location.origin}${window.location.pathname}`,
            });

            // On the redirect flow the browser navigates away and never reaches here.
            if (!response) return;

            // PortOne V2 는 실패해도 throw 하지 않고 code/message 를 담은 객체를 반환한다.
            // PG 에러 원문은 개발자 콘솔로만 보내고, 화면에는 일반 문구를 노출한다.
            if (response.code != null) {
                console.error("[PAY FAIL]", response.code, response.message);
                setError(t("errors.issueFailed"));
                return;
            }

            const res = await fetch("/api/billing/register-key", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ billing_key: response.billingKey }),
            });

            if (!res.ok) {
                setError(t("errors.saveFailed"));
                return;
            }

            setIsRegistered(true);
        } catch (e) {
            console.error("[PortOne] billing key issuance failed", e);
            setError(t("errors.unexpected"));
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="space-y-3">
            <Button
                onClick={handleSubscribe}
                disabled={isPending || isRegistered}
                className="w-full h-18 py-8 text-2xl font-black rounded-[32px] shadow-xl shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white border-0 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 group"
            >
                {isPending ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                ) : isRegistered ? (
                    t("cardRegistered")
                ) : (
                    <>
                        {t("payNow")}
                        <ArrowRight className="ml-3 h-7 w-7 group-hover:translate-x-2 transition-transform" />
                    </>
                )}
            </Button>

            {error && (
                <p role="alert" className="text-sm font-medium text-red-600 text-center">
                    {error}
                </p>
            )}
        </div>
    );
}
