"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Subscription } from "@/lib/subscription";

function formatDate(value: string | null, locale: string): string {
    if (!value) return "-";
    return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }).format(new Date(value));
}

export function SubscriptionManager({
    subscription,
    locale,
}: {
    subscription: Subscription | null;
    locale: string;
}) {
    const t = useTranslations("Subscription");
    const router = useRouter();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const call = async (endpoint: string) => {
        setError(null);
        setIsPending(true);
        try {
            const res = await fetch(endpoint, { method: "POST" });
            if (!res.ok) {
                setError(t("errors.failed"));
                return;
            }
            setIsConfirmOpen(false);
            router.refresh();
        } catch {
            setError(t("errors.failed"));
        } finally {
            setIsPending(false);
        }
    };

    if (!subscription || subscription.status === "canceled") {
        const isEnded = subscription?.status === "canceled";
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6">
                <p className="text-gray-600">{isEnded ? t("ended") : t("noSubscription")}</p>
                <Link
                    href="/payment"
                    className="inline-flex items-center justify-center h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
                >
                    {isEnded ? t("resubscribe") : t("goToPayment")}
                </Link>
            </div>
        );
    }

    const isCancelScheduled = subscription.status === "cancel_scheduled";
    const endDate = formatDate(
        isCancelScheduled ? subscription.service_end_date : subscription.next_billing_date,
        locale
    );

    const rows: { label: string; value: string }[] = [
        { label: t("plan"), value: `${t("planName")} · ${t("planPrice")}` },
        {
            label: isCancelScheduled ? t("serviceEndDate") : t("nextBillingDate"),
            value: endDate,
        },
        { label: t("startedAt"), value: formatDate(subscription.started_at, locale) },
    ];

    if (subscription.card_brand || subscription.card_number_masked) {
        rows.push({
            label: t("card"),
            value: [subscription.card_brand, subscription.card_number_masked]
                .filter(Boolean)
                .join(" "),
        });
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900">{t("planName")}</h2>
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isCancelScheduled
                                ? "bg-amber-50 text-amber-700"
                                : "bg-green-50 text-green-700"
                        }`}
                    >
                        {isCancelScheduled ? t("statusCancelScheduled") : t("statusActive")}
                    </span>
                </div>

                <dl className="divide-y divide-gray-100">
                    {rows.map((row) => (
                        <div key={row.label} className="py-3 flex justify-between gap-4 text-sm">
                            <dt className="text-gray-500">{row.label}</dt>
                            <dd className="text-gray-900 font-medium text-right">{row.value}</dd>
                        </div>
                    ))}
                </dl>

                {isCancelScheduled ? (
                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex items-center justify-between gap-4 flex-wrap">
                        <p className="text-sm text-amber-900">
                            {t("cancelScheduledNotice", { date: endDate })}
                        </p>
                        <Button
                            onClick={() => call("/api/billing/resume-subscription")}
                            disabled={isPending}
                            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("resume")}
                        </Button>
                    </div>
                ) : (
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setIsConfirmOpen(true)}
                            className="text-sm text-gray-600 underline underline-offset-4 hover:text-red-600 transition-colors"
                        >
                            {t("cancelSubscription")}
                        </button>
                    </div>
                )}

                {error && (
                    <p role="alert" className="text-sm font-medium text-red-600">
                        {error}
                    </p>
                )}
            </div>

            {isConfirmOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cancel-dialog-title"
                >
                    <div className="bg-white rounded-2xl max-w-md w-full p-8 space-y-6 shadow-xl">
                        <h3 id="cancel-dialog-title" className="text-xl font-bold text-gray-900">
                            {t("confirmTitle")}
                        </h3>
                        <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                            <p>{t("confirmBody", { date: endDate })}</p>
                            <p>{t("confirmNoRefund")}</p>
                            <p>{t("confirmResumable")}</p>
                        </div>
                        {/* 두 버튼을 같은 비중으로 노출한다 (다크패턴 방지) */}
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setIsConfirmOpen(false)}
                                disabled={isPending}
                                className="flex-1 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 border-0"
                            >
                                {t("confirmBack")}
                            </Button>
                            <Button
                                onClick={() => call("/api/billing/cancel-subscription")}
                                disabled={isPending}
                                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white border-0"
                            >
                                {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    t("confirmCancel")
                                )}
                            </Button>
                        </div>
                        {error && (
                            <p role="alert" className="text-sm font-medium text-red-600">
                                {error}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
