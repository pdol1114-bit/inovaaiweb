import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, HelpCircle } from "lucide-react";
import { Link } from "@/i18n/routing";

export default async function LoginErrorPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("Auth");

    return (
        <div className="flex flex-col min-h-[calc(100vh-64px)] items-center justify-center p-4 bg-gradient-to-b from-background to-rose-50/20">
            {/* Background Decorative Elements */}
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-rose-100/30 rounded-full blur-[100px] -z-10"></div>
            <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-orange-50 rounded-full blur-[100px] -z-10"></div>

            <main className="w-full max-w-md animate-fade-in">
                <div className="glass-panel p-10 rounded-[2.5rem] border-white/20 bg-white/40 shadow-2xl text-center space-y-8 relative overflow-hidden">
                    {/* Hero Icon */}
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full"></div>
                        <div className="relative w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center text-white mx-auto shadow-lg shadow-rose-500/30">
                            <AlertCircle className="h-10 w-10" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                            {t("errorTitle")}
                        </h1>
                        <p className="text-gray-600 leading-relaxed">
                            {t("errorDesc")}
                        </p>
                    </div>

                    <div className="pt-4 space-y-3">
                        <Link href="/auth">
                            <Button className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-rose-500/10 bg-gray-900 hover:bg-gray-800 transition-all group text-white">
                                <RotateCcw className="mr-2 h-5 w-5 group-hover:-rotate-45 transition-transform" />
                                {t("backToLogin")}
                            </Button>
                        </Link>

                        <Button variant="ghost" className="w-full h-12 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100/50">
                            <HelpCircle className="mr-2 h-4 w-4" />
                            고객 지원 센터 문의
                        </Button>
                    </div>

                    {/* Support Info */}
                    <div className="pt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            문제가 지속되면 시스템 담당자에게 문의해 주세요.
                        </p>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-400 mt-8">
                    INOVA.AI - AI Driven Excellence
                </p>
            </main>
        </div>
    );
}
