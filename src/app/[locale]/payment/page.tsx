import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, ShieldCheck, ArrowRight, Zap, Star } from "lucide-react";
import Image from "next/image";

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
        <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-900 overflow-hidden relative">
            {/* Premium Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-purple-600/10 rounded-full blur-[80px]"></div>
            </div>

            <main className="flex-1 container mx-auto px-4 py-16 md:py-24 flex flex-col items-center relative z-10">
                <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">

                    {/* Left Side: Value Proposition */}
                    <div className="space-y-10 animate-fade-in text-white">
                        <div className="space-y-4">
                            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                                <Star className="h-4 w-4 fill-current" />
                                <span>{t("planName")}</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                                {t("title")}
                            </h1>
                            <p className="text-xl text-slate-400 max-w-lg">
                                {t("description")}
                            </p>
                        </div>

                        <ul className="space-y-5">
                            {features.map((feature, i) => (
                                <li key={i} className="flex items-center group transition-all duration-300">
                                    <div className="h-6 w-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mr-4 group-hover:bg-blue-500/40 group-hover:scale-110 transition-all">
                                        <CheckCircle2 className="h-4 w-4 text-blue-400" />
                                    </div>
                                    <span className="text-lg text-slate-300 group-hover:text-white transition-colors">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="pt-4 flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                                <ShieldCheck className="h-4 w-4 text-green-500/70" />
                                <span>{t("securePayment")}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Pricing Card (Glassmorphism) */}
                    <div className="animate-scale-in relative group" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                        {/* Glow effect behind card */}
                        <div className="absolute inset-0 bg-blue-600/20 rounded-[40px] blur-[30px] -z-10 group-hover:bg-blue-600/30 transition-all duration-500"></div>
                        
                        <div className="glass-panel p-10 rounded-[40px] border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 right-0 p-8">
                                <Zap className="h-12 w-12 text-blue-500/20 rotate-12" />
                            </div>

                            <div className="mb-10 text-white">
                                <h2 className="text-xl font-medium text-slate-400 mb-2">{t("planTitle")}</h2>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black tracking-tight">{t("price")}</span>
                                    <span className="text-slate-500 font-medium">/ 1 month</span>
                                </div>
                                <p className="mt-2 text-sm text-slate-500 italic opacity-80">{t("vatNote")}</p>
                            </div>

                            <div className="space-y-6 flex-1">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">{t("paymentMethod")}</h3>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    <button className="flex items-center justify-between p-5 rounded-3xl border-2 border-blue-500 bg-blue-500/10 text-white transition-all hover:bg-blue-500/15 group/btn">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover/btn:scale-105 transition-all">
                                                <CreditCard className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-lg">{t("card")}</div>
                                                <div className="text-xs text-slate-400">Powered by PortOne</div>
                                            </div>
                                        </div>
                                        <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center">
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                        </div>
                                    </button>

                                    <button className="flex items-center justify-between p-5 rounded-3xl border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:border-white/20 transition-all opacity-60 cursor-not-allowed">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
                                                <ShieldCheck className="h-6 w-6 text-slate-600" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-semibold text-lg">{t("bank")}</div>
                                                <div className="text-xs text-slate-600">Checking...</div>
                                            </div>
                                        </div>
                                        <div className="w-6 h-6 rounded-full border border-slate-700"></div>
                                    </button>
                                </div>
                            </div>

                            <div className="mt-12 space-y-6">
                                <Button className="w-full h-16 text-xl font-black rounded-3xl shadow-[0_0_20px_rgba(59,130,246,0.5)] bg-blue-600 hover:bg-blue-500 text-white border-0 transition-all hover:scale-[1.02] active:scale-[0.98] group">
                                    {t("payNow")}
                                    <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                                </Button>

                                <div className="text-center">
                                    <p className="text-[10px] text-slate-500">
                                        주식회사 이노바에이아이 | 대표: 성지세, 강유석<br/>
                                        사업자등록번호: 479-81-03783
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
