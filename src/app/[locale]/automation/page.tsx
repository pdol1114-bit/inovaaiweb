import { Button } from "@/components/ui/button";
import { ArrowRight, Settings, Cpu, LineChart, Smartphone, ShieldCheck, CloudRain } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function WorkflowAutomationPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("Automation");

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative pt-32 pb-24 overflow-hidden bg-white">
                <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-blue-50 rounded-full blur-[100px] opacity-60 z-0"></div>
                <div className="container relative z-10 mx-auto px-4 text-center">
                    <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-600 mb-6 animate-fade-in shadow-sm">
                        <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
                        {t("heroBadge")}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-gray-900 animate-fade-in">
                        {t.rich("heroTitle", {
                            br: () => <br className="hidden md:block" />
                        })}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 animate-fade-in opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                        {t("heroDescription")}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in opacity-0" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
                        <Button size="lg" className="rounded-full bg-primary text-white hover:bg-primary/90 px-8 h-12 text-base shadow-lg shadow-blue-200/50" asChild>
                            <Link href="mailto:support@inovaai.ai">{t("ctaButton")}</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Automation Features */}
            <section className="py-24 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                <Cpu className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">{t("feature1Title")}</h3>
                            <p className="text-gray-600">
                                {t("feature1Desc")}
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                <Settings className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">{t("feature2Title")}</h3>
                            <p className="text-gray-600">
                                {t("feature2Desc")}
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                <LineChart className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">{t("feature3Title")}</h3>
                            <p className="text-gray-600">
                                {t("feature3Desc")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Projects in Progress */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-12 text-gray-900">
                        {t("projectsTitle")}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div className="relative p-8 rounded-3xl bg-white border border-gray-200 shadow-md hover:shadow-xl transition-all">
                            <span className="absolute top-6 right-6 inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                                <span className="flex h-2 w-2 rounded-full bg-amber-400 mr-1.5 animate-pulse"></span>
                                {t("swingMateBadge")}
                            </span>
                            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 mb-6">
                                <Smartphone className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">{t("swingMateTitle")}</h3>
                            <p className="text-gray-600 mb-5">
                                {t("swingMateDesc")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{t("swingMateTag1")}</span>
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{t("swingMateTag2")}</span>
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{t("swingMateTag3")}</span>
                            </div>
                        </div>

                        <div className="relative p-8 rounded-3xl bg-white border border-gray-200 shadow-md hover:shadow-xl transition-all">
                            <span className="absolute top-6 right-6 inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                                <span className="flex h-2 w-2 rounded-full bg-amber-400 mr-1.5 animate-pulse"></span>
                                {t("csoBadge")}
                            </span>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">{t("csoTitle")}</h3>
                            <p className="text-gray-600 mb-5">
                                {t("csoDesc")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{t("csoTag1")}</span>
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{t("csoTag2")}</span>
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{t("csoTag3")}</span>
                            </div>
                        </div>

                        <div className="relative p-8 rounded-3xl bg-white border border-gray-200 shadow-md hover:shadow-xl transition-all">
                            <span className="absolute top-6 right-6 inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-1.5"></span>
                                {t("fieldWeatherBadge")}
                            </span>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6">
                                <CloudRain className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">{t("fieldWeatherTitle")}</h3>
                            <p className="text-gray-600 mb-5">
                                {t("fieldWeatherDesc")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{t("fieldWeatherTag1")}</span>
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{t("fieldWeatherTag2")}</span>
                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{t("fieldWeatherTag3")}</span>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-6">
                                <a
                                    href="https://apps.apple.com/kr/app/id6836007912"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
                                >
                                    {t("fieldWeatherAppStore")}
                                    <ArrowRight className="ml-1.5 h-4 w-4" />
                                </a>
                                <a
                                    href="https://play.google.com/store/apps/details?id=com.inovaai.fieldweather"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
                                >
                                    {t("fieldWeatherGooglePlay")}
                                    <ArrowRight className="ml-1.5 h-4 w-4" />
                                </a>
                            </div>
                            <div className="flex gap-6 mt-6">
                                <div className="flex flex-col items-center gap-2">
                                    <Image
                                        src="/images/fieldweather/qr-app-store.png"
                                        alt={`${t("fieldWeatherAppStore")} QR`}
                                        width={112}
                                        height={112}
                                        className="rounded-xl border border-gray-200 bg-white p-1.5"
                                    />
                                    <span className="text-xs font-medium text-gray-500">{t("fieldWeatherAppStore")}</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <Image
                                        src="/images/fieldweather/qr-google-play.png"
                                        alt={`${t("fieldWeatherGooglePlay")} QR`}
                                        width={112}
                                        height={112}
                                        className="rounded-xl border border-gray-200 bg-white p-1.5"
                                    />
                                    <span className="text-xs font-medium text-gray-500">{t("fieldWeatherGooglePlay")}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
