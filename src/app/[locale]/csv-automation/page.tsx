import { Button } from "@/components/ui/button";
import { FileText, Zap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function CSVAutomationPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("CSVAutomation");
    const common = await getTranslations("Common");

    return (
        <div className="flex flex-col min-h-screen relative">
            {/* Coming Soon Overlay */}
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/5 backdrop-blur-[2px] pointer-events-none">
                <div className="relative">
                    <div className="bg-white/95 text-red-600 rounded-3xl px-16 py-10 rotate-[-10deg] flex flex-col items-center gap-2 shadow-[0_20px_50px_rgba(220,38,38,0.15)] border-[12px] border-red-600/80">
                        <span className="text-red-600 text-5xl md:text-7xl font-black tracking-tighter uppercase whitespace-nowrap">{common("comingSoon")}</span>
                    </div>
                </div>
            </div>
            {/* Hero Section */}
            <section className="relative pt-32 pb-24 overflow-hidden bg-white">
                <div className="absolute top-0 left-0 -ml-24 -mt-24 w-96 h-96 bg-blue-50 rounded-full blur-[100px] opacity-60 z-0"></div>
                <div className="container relative z-10 mx-auto px-4 text-center">
                    <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-600 mb-6 animate-fade-in shadow-sm">
                        <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
                        {t("badge")}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-gray-900 animate-fade-in">
                        {t("heroTitle")}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 animate-fade-in opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                        {t("heroDesc")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in opacity-0" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
                        <Button size="lg" className="rounded-full bg-primary text-white hover:bg-primary/90 px-8 h-12 text-base shadow-lg shadow-blue-200/50" asChild>
                            <Link href={`/${locale}/auth?service=csv-automation`}>{t("getStarted")}</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 px-8 h-12 text-base" asChild>
                            <Link href={`/${locale}/auth?service=csv-automation`}>{t("adminLogin")}</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* CSV Features */}
            <section className="py-24 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                <FileText className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">{t("feature1Title")}</h3>
                            <p className="text-gray-600">
                                {t("feature1Desc")}
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">{t("feature2Title")}</h3>
                            <p className="text-gray-600">
                                {t("feature2Desc")}
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                <Zap className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">{t("feature3Title")}</h3>
                            <p className="text-gray-600">
                                {t("feature3Desc")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
