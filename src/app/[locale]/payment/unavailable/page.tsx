import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { BusinessInfo } from "@/components/layout/BusinessInfo";
import { createClient } from "@/utils/supabase/server";
import { getSubscriptionForUser } from "@/lib/subscription";
import { FEM_PRO_PLAN } from "@/lib/billing/constants";
import { decideNewSale } from "@/lib/billing/sales";

export const metadata: Metadata = { robots: { index: false } };

/**
 * 결제를 진행할 수 없는 플랜의 안내 화면. 결제 페이지(`../page.tsx`)가 여기로 보낸다.
 *
 * 이 경로는 결제 버튼·결제 SDK 를 import 하지 않는다 — 여기서는 결제를 시작할 방법이 없다.
 *  - `plan=fem_pro` : FEM AI Pro 결제 준비 중(FEM 계정용 결제 연결 전). 이미 FEM 구독이 있는 계정에는 구독 관리 경로를 안내한다.
 *  - 그 밖의 값     : 알 수 없는 요금제.
 */
export default async function PaymentUnavailablePage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ plan?: string | string[] }>;
}) {
    const { locale } = await params;
    const { plan: rawPlan } = await searchParams;
    setRequestLocale(locale);
    const t = await getTranslations("Payment");

    const sale = decideNewSale(rawPlan);
    // 판매 중인 플랜(또는 plan 없음)으로 이 주소에 온 경우에는 보여 줄 안내가 없다.
    if (sale.kind === "on_sale") {
        redirect({ href: "/payment", locale });
        return null;
    }
    const isFemNotice = sale.kind === "not_on_sale";

    let manageExisting = false;
    if (isFemNotice) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        manageExisting = user ? (await getSubscriptionForUser(supabase, user.id, FEM_PRO_PLAN)) !== null : false;
    }

    return (
        <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#f8fafc] items-center justify-center px-4 py-24">
            <main role="status" className="w-full max-w-xl rounded-[32px] border border-slate-100 bg-white p-10 text-center space-y-6 shadow-sm">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    {isFemNotice ? t("fem.preparingTitle") : t("unknownPlanTitle")}
                </h1>
                <p className="text-slate-600 leading-relaxed">
                    {isFemNotice ? t("fem.preparingDesc") : t("unknownPlanDesc")}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    {manageExisting && (
                        <Link href="/account/subscription" className="inline-flex items-center justify-center h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors">
                            {t("manageSubscription")}
                        </Link>
                    )}
                    <Link href={isFemNotice ? "/fem-ai" : "/pricing"} className="inline-flex items-center justify-center h-12 px-8 rounded-2xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
                        {isFemNotice ? t("fem.backToFem") : t("backToPricing")}
                    </Link>
                </div>
                <BusinessInfo className="space-y-1 text-[10px] text-slate-400 font-medium leading-relaxed text-center border-t border-slate-100 pt-6" />
            </main>
        </div>
    );
}
