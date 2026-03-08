import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, ShieldCheck, ArrowRight, Zap } from "lucide-react";
import Image from "next/image";

export default async function PaymentPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("Payment");

    return (
        <div className="flex flex-col min-h-[calc(100vh-64px)] bg-slate-50/50">
            {/* Background Decorative Elements */}
            <div className="absolute top-20 right-0 -mr-24 w-96 h-96 bg-blue-100/50 rounded-full blur-[120px] -z-10"></div>
            <div className="absolute bottom-0 left-0 -ml-24 w-96 h-96 bg-indigo-50 rounded-full blur-[120px] -z-10"></div>

            <main className="flex-1 container mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">

                    {/* Left Side: Order Summary */}
                    <div className="space-y-8 animate-fade-in">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-4">
                                {t("title")}
                            </h1>
                            <p className="text-lg text-gray-600">
                                {t("description")}
                            </p>
                        </div>

                        <div className="glass-panel p-8 rounded-3xl border-white bg-white/40 shadow-xl space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                <span className="text-gray-500 font-medium">{t("planTitle")}</span>
                                <div className="flex items-center text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full text-sm">
                                    <Zap className="h-3 w-3 mr-1 fill-current" />
                                    {t("planName")}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold text-gray-900">{t("price")}</span>
                                <div className="text-sm text-gray-500">VAT included</div>
                            </div>

                            <ul className="space-y-3 pt-2">
                                {[
                                    "Unlimited AI Analysis",
                                    "Pet Health History",
                                    "Expert Veterinary Support",
                                    "Early Disease Detection"
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center text-gray-600">
                                        <CheckCircle2 className="h-4 w-4 text-blue-500 mr-3 shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-100/50 p-4 rounded-2xl">
                            <ShieldCheck className="h-5 w-5 text-gray-400" />
                            {t("securePayment")}
                        </div>
                    </div>

                    {/* Right Side: Payment Methods */}
                    <div className="space-y-6 animate-fade-in" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
                        <div className="glass-panel p-8 rounded-3xl border-white bg-white/60 shadow-2xl relative overflow-hidden">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">{t("paymentMethod")}</h2>

                            <div className="space-y-4">
                                <button className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-blue-500 bg-blue-50/50 text-blue-600 transition-all">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mr-4">
                                            <CreditCard className="h-5 w-5" />
                                        </div>
                                        <span className="font-bold">{t("card")}</span>
                                    </div>
                                    <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                                    </div>
                                </button>

                                <button className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white text-gray-600 hover:border-gray-200 transition-all">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mr-4 text-gray-400">
                                            <ShieldCheck className="h-5 w-5" />
                                        </div>
                                        <span className="font-semibold">{t("bank")}</span>
                                    </div>
                                    <div className="w-5 h-5 rounded-full border border-gray-200"></div>
                                </button>
                            </div>

                            <div className="mt-8 space-y-4">
                                <Button className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-blue-500/25 bg-blue-600 hover:bg-blue-700 transition-all group">
                                    {t("payNow")}
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>

                                <p className="text-center text-xs text-gray-400">
                                    주식회사 이노바에이아이 (대표: 성지세, 강유석)
                                </p>
                            </div>
                        </div>

                        {/* Social Proof / Security Badge */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl border border-gray-100 bg-white/50 flex items-center justify-center grayscale opacity-50 relative h-12">
                                <Image
                                    src="/logos/inova-blue.png"
                                    alt="Inova Safe"
                                    fill
                                    className="object-contain p-2"
                                />
                            </div>
                            <div className="p-4 rounded-2xl border border-gray-100 bg-white/50 flex items-center justify-center grayscale opacity-50">
                                <span className="text-xs font-bold tracking-widest text-gray-400">SECURE PAY</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
