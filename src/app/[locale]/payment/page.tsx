import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { CheckCircle2, CreditCard, ShieldCheck, Zap, Star } from "lucide-react";
import Image from "next/image";
import { KBAuthMark } from "@/components/layout/KBAuthMark";
import { SubscribeButton } from "@/components/payment/SubscribeButton";
import { BusinessInfo } from "@/components/layout/BusinessInfo";

export default async function PaymentPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("Payment");

    const features = [
        t("features.aiAnalysis"),
        t("features.healthHistory"),
        t("features.expertSupport"),
        t("features.earlyDetection")
    ];

    return (
        <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#f8fafc] overflow-hidden relative">
            {/* Soft Premium Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-50/50 rounded-full blur-[120px]"></div>
            </div>

            <main className="flex-1 container mx-auto px-4 py-16 md:py-24 flex flex-col items-center relative z-10">
                <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">

                    {/* Left Side: Value Proposition */}
                    <div className="space-y-10 animate-fade-in text-slate-900">
                        <div className="space-y-4">
                            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-600/10 text-blue-600 text-sm font-semibold">
                                <Star className="h-4 w-4 fill-current" />
                                <span>{t("planName")}</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight text-slate-900">
                                {t("title")}
                            </h1>
                            <p className="text-xl text-slate-600 max-w-lg leading-relaxed">
                                {t("description")}
                            </p>
                        </div>

                        <ul className="space-y-6">
                            {features.map((feature, i) => (
                                <li key={i} className="flex items-center group">
                                    <div className="h-7 w-7 rounded-full bg-blue-600/10 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform shadow-sm">
                                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <span className="text-lg font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="pt-4 flex items-center gap-4 text-sm text-slate-400">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                <ShieldCheck className="h-4 w-4 text-blue-500" />
                                <span className="font-medium text-slate-500">{t("securePayment")}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Pricing Card (Clean Glassmorphism) */}
                    <div className="animate-scale-in relative group" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                        {/* Soft glow behind card */}
                        <div className="absolute inset-0 bg-blue-600/5 rounded-[48px] blur-[40px] -z-10 group-hover:bg-blue-600/10 transition-all duration-500"></div>
                        
                        <div className="glass-panel p-10 md:p-12 rounded-[48px] border-white bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] relative overflow-hidden flex flex-col border border-slate-100">
                            <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
                                <Zap className="h-24 w-24 text-blue-600 rotate-12" />
                            </div>

                            <div className="mb-12">
                                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">{t("planTitle")}</h2>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-6xl font-black tracking-tighter text-slate-900">{t("price")}</span>
                                    <span className="text-slate-400 font-bold text-lg">/ mo</span>
                                </div>
                                <p className="mt-3 text-sm text-slate-400 font-medium">{t("vatNote")}</p>
                            </div>

                            <div className="space-y-8 flex-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{t("paymentMethod")}</h3>
                                    <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">Card Only</div>
                                </div>
                                
                                <div className="grid grid-cols-1">
                                    <button className="flex items-center justify-between p-6 rounded-[32px] border-2 border-blue-600 bg-blue-50/30 text-slate-900 transition-all hover:bg-blue-50/50 group/btn">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover/btn:scale-105 transition-all">
                                                <CreditCard className="h-7 w-7 text-white" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-black text-xl">{t("card")}</div>
                                                <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                    PortOne Secure
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-7 h-7 rounded-full border-2 border-blue-600 flex items-center justify-center">
                                            <div className="w-3.5 h-3.5 rounded-full bg-blue-600 scale-100 transition-transform"></div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="mt-14 space-y-8">
                                <SubscribeButton />

                                <div className="flex justify-center">
                                    <KBAuthMark />
                                </div>

                                <div className="flex justify-center gap-4 text-[11px] text-slate-400">
                                    <Link href="/refund-policy" className="hover:text-blue-600 transition-colors underline underline-offset-2">
                                        {t("refundPolicyLink")}
                                    </Link>
                                    <Link href="/terms" className="hover:text-blue-600 transition-colors underline underline-offset-2">
                                        {t("termsLink")}
                                    </Link>
                                    <Link href="/privacy" className="hover:text-blue-600 transition-colors underline underline-offset-2">
                                        {t("privacyLink")}
                                    </Link>
                                </div>

                                {/* PG 심사 요건: 사업자정보는 메인 외 결제페이지에도 상시 노출 */}
                                <BusinessInfo className="space-y-1 text-[10px] text-slate-400 font-medium leading-relaxed text-center border-t border-slate-100 pt-6" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
