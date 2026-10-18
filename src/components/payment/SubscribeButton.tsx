"use client";

import { useEffect, useRef, useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Clock, Loader2 } from "lucide-react";
import {
    PORTONE_STORE_ID,
    PORTONE_CHANNEL_KEY,
    isPortOneConfigured,
    isPortOneTestMode,
} from "@/lib/portone/config";
import {
    registerBillingKey,
    readBillingKeyRedirect,
    clearBillingKeyRedirectParams,
    type BillingKeyRedirect,
    type RegisterOutcome,
} from "@/components/payment/registerBillingKey";

type ErrorKey =
    | "notConfigured"
    | "issueFailed"
    | "unexpected"
    | "paymentFailed"
    | "alreadySubscribed"
    | "cancelScheduled"
    | "inProgress"
    | "invalidCard";

type Phase =
    | { kind: "idle" }
    | { kind: "issuing" } // 카드 등록창 진행 중
    | { kind: "charging" } // 빌링키 발급 완료, 첫 결제 진행 중
    | { kind: "paid"; nextBillingDate: string | null }
    | { kind: "processing" } // 결과 확인 중 (출금 여부 불명)
    | { kind: "error"; key: ErrorKey };

const ERROR_BY_OUTCOME: Partial<Record<RegisterOutcome["kind"], ErrorKey>> = {
    paymentFailed: "paymentFailed",
    alreadySubscribed: "alreadySubscribed",
    cancelScheduled: "cancelScheduled",
    inProgress: "inProgress",
    invalidCard: "invalidCard",
    error: "unexpected",
};

/** 구독 관리로 안내해야 하는 오류 (다시 결제할 대상이 아님) */
const MANAGE_ERRORS: ErrorKey[] = ["alreadySubscribed", "cancelScheduled"];

function formatBillingDate(value: string, locale: string): string {
    return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Seoul",
    }).format(new Date(value));
}

export function SubscribeButton() {
    const t = useTranslations("Payment");
    const locale = useLocale();
    const router = useRouter();
    const [phase, setPhase] = useState<Phase>({ kind: "idle" });
    const redirectHandled = useRef(false);

    // 데스크톱 응답과 모바일 복귀가 공유하는 결과 처리
    const applyOutcome = (outcome: RegisterOutcome) => {
        switch (outcome.kind) {
            case "paid":
                setPhase({ kind: "paid", nextBillingDate: outcome.nextBillingDate });
                return;
            case "processing":
                setPhase({ kind: "processing" });
                return;
            case "unauthorized":
                router.push("/auth");
                setPhase({ kind: "idle" });
                return;
            default:
                setPhase({ kind: "error", key: ERROR_BY_OUTCOME[outcome.kind] ?? "unexpected" });
        }
    };

    const chargeWithBillingKey = async (billingKey: string) => {
        setPhase({ kind: "charging" });
        try {
            applyOutcome(await registerBillingKey(billingKey));
        } catch {
            setPhase({ kind: "error", key: "unexpected" });
        }
    };

    const handleRedirect = async (redirect: BillingKeyRedirect) => {
        if (redirect.kind === "failure") {
            // PG 에러 원문은 개발자 콘솔로만 보낸다.
            console.error("[PAY FAIL]", redirect.code, redirect.message);
            setPhase({ kind: "error", key: "issueFailed" });
            return;
        }
        await chargeWithBillingKey(redirect.billingKey);
    };

    // 모바일: 결제창이 redirectUrl(이 페이지)로 돌려보내며 결과를 쿼리로 붙인다.
    // 데스크톱과 같은 registerBillingKey 흐름을 그대로 탄다.
    useEffect(() => {
        if (redirectHandled.current) return;
        redirectHandled.current = true;

        const redirect = readBillingKeyRedirect(window.location.search);
        if (!redirect) return;
        clearBillingKeyRedirectParams();
        // 주소창 쿼리는 외부 상태라 hydration 이후 effect 에서만 읽을 수 있다 (SSR 불일치 방지).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void handleRedirect(redirect);
        // 마운트 시 1회만 실행한다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubscribe = async () => {
        if (!isPortOneConfigured()) {
            setPhase({ kind: "error", key: "notConfigured" });
            return;
        }

        setPhase({ kind: "issuing" });
        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/auth");
                setPhase({ kind: "idle" });
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
                setPhase({ kind: "error", key: "issueFailed" });
                return;
            }

            await chargeWithBillingKey(response.billingKey);
        } catch (e) {
            console.error("[PortOne] billing key issuance failed", e);
            setPhase({ kind: "error", key: "unexpected" });
        }
    };

    if (phase.kind === "paid") {
        return (
            <div role="status" className="rounded-[32px] border border-green-100 bg-green-50 p-6 space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
                <p className="text-xl font-black text-slate-900">{t("status.paidTitle")}</p>
                <p className="text-sm font-medium text-slate-700">
                    {phase.nextBillingDate
                        ? t("status.paidBody", { date: formatBillingDate(phase.nextBillingDate, locale) })
                        : t("status.paidBodyNoDate")}
                </p>
                <Link
                    href="/account/subscription"
                    className="inline-flex items-center justify-center h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
                >
                    {t("status.goToManage")}
                </Link>
            </div>
        );
    }

    if (phase.kind === "processing") {
        return (
            <div role="status" className="rounded-[32px] border border-amber-100 bg-amber-50 p-6 space-y-4 text-center">
                <Clock className="mx-auto h-10 w-10 text-amber-600" />
                <p className="text-xl font-black text-slate-900">{t("status.processingTitle")}</p>
                <p className="text-sm font-medium text-slate-700">{t("status.processingBody")}</p>
                <Link
                    href="/account/subscription"
                    className="inline-flex items-center justify-center h-12 px-8 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors"
                >
                    {t("status.goToManage")}
                </Link>
            </div>
        );
    }

    const isBusy = phase.kind === "issuing" || phase.kind === "charging";
    const errorKey = phase.kind === "error" ? phase.key : null;

    return (
        <div className="space-y-3">
            <Button
                onClick={handleSubscribe}
                disabled={isBusy}
                className="w-full h-18 py-8 text-2xl font-black rounded-[32px] shadow-xl shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white border-0 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 group"
            >
                {isBusy ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                    <>
                        {t("payNow")}
                        <ArrowRight className="ml-3 h-7 w-7 group-hover:translate-x-2 transition-transform" />
                    </>
                )}
            </Button>

            {phase.kind === "charging" && (
                <p role="status" className="text-sm font-medium text-slate-700 text-center">
                    {t("status.charging")}
                </p>
            )}

            {errorKey && (
                <p role="alert" className="text-sm font-medium text-red-600 text-center">
                    {t(`errors.${errorKey}`)}
                    {MANAGE_ERRORS.includes(errorKey) && (
                        <>
                            {" "}
                            <Link href="/account/subscription" className="underline underline-offset-2 font-bold">
                                {t("status.goToManage")}
                            </Link>
                        </>
                    )}
                </p>
            )}
        </div>
    );
}
