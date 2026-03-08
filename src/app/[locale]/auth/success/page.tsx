import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/routing";

export default async function LoginSuccessPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("Auth");

    return (
        <div className="flex flex-col min-h-[calc(100vh-64px)] items-center justify-center p-4 bg-gradient-to-b from-background to-blue-50/30">
            {/* Background Decorative Elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-100/40 rounded-full blur-[100px] -z-10 animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-100/40 rounded-full blur-[100px] -z-10 animate-pulse" style={{ animationDelay: "1s" }}></div>

            <main className="w-full max-w-md animate-fade-in">
                <div className="glass-panel p-10 rounded-[2.5rem] border-white/20 bg-white/40 shadow-2xl text-center space-y-8 relative overflow-hidden">
                    {/* Hero Icon */}
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full"></div>
                        <div className="relative w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/30">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <div className="absolute -top-1 -right-1">
                            <Sparkles className="h-6 w-6 text-blue-400 animate-bounce" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                            {t("successTitle")}
                        </h1>
                        <p className="text-gray-600 leading-relaxed text-lg">
                            {t("successDesc")}
                        </p>
                    </div>

                    <div className="pt-4">
                        <Link href="/payment">
                            <Button className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-blue-500/25 bg-blue-600 hover:bg-blue-700 transition-all group">
                                {t("goToPayment")}
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>

                    {/* Progress Indicator (Decorative) */}
                    <div className="flex justify-center gap-2 pt-4">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600"></div>
                        <div className="h-1.5 w-8 rounded-full bg-blue-600"></div>
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-100"></div>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-400 mt-8">
                    INOVA.AI - AI Driven Excellence
                </p>
            </main>
        </div>
    );
}
