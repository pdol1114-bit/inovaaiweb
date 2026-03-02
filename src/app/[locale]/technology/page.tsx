import { Badge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function TechnologyPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("Technology");

    return (
        <div className="flex flex-col min-h-screen">
            {/* Tech Hero */}
            <section className="py-20 bg-background text-center">
                <div className="container mx-auto px-4">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">{t("heroTitle")}</h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
                        {t("heroDesc")}
                    </p>
                </div>
            </section>

            {/* Tech Stack Grid */}
            <section className="py-20 bg-secondary/10">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Vision Model */}
                        <div className="p-8 rounded-2xl bg-card border border-white/5">
                            <h3 className="text-2xl font-bold mb-4 text-cyan-400">{t("cvTitle")}</h3>
                            <p className="text-muted-foreground mb-4">
                                {t("cvDesc")}
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                                <li>{t("cvFeature1")}</li>
                                <li>{t("cvFeature2")}</li>
                                <li>{t("cvFeature3")}</li>
                            </ul>
                        </div>

                        {/* LLM */}
                        <div className="p-8 rounded-2xl bg-card border border-white/5">
                            <h3 className="text-2xl font-bold mb-4 text-purple-400">{t("llmTitle")}</h3>
                            <p className="text-muted-foreground mb-4">
                                {t("llmDesc")}
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                                <li>{t("llmFeature1")}</li>
                                <li>{t("llmFeature2")}</li>
                                <li>{t("llmFeature3")}</li>
                            </ul>
                        </div>

                        {/* Backend */}
                        <div className="p-8 rounded-2xl bg-card border border-white/5">
                            <h3 className="text-2xl font-bold mb-4 text-emerald-400">{t("backendTitle")}</h3>
                            <p className="text-muted-foreground mb-4">
                                {t("backendDesc")}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300">FastAPI</span>
                                <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300">Python</span>
                                <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300">TorchServe</span>
                                <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300">React Native</span>
                            </div>
                        </div>

                        {/* Security */}
                        <div className="p-8 rounded-2xl bg-card border border-white/5">
                            <h3 className="text-2xl font-bold mb-4 text-orange-400">{t("privacyTitle")}</h3>
                            <p className="text-muted-foreground mb-4">
                                {t("privacyDesc")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Patent Section */}
            <section className="py-20">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="border border-cyan-500/30 bg-cyan-950/10 rounded-xl p-8 md:p-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Badge className="h-32 w-32" />
                        </div>
                        <h2 className="text-3xl font-bold mb-6">{t("patentSectionTitle")}</h2>
                        <p className="text-lg mb-8 text-muted-foreground">
                            {t("patentSectionDesc")}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-semibold text-cyan-400 mb-2">{t("patentPending")}</h4>
                                <div className="text-sm space-y-1 text-muted-foreground">
                                    <p><span className="font-medium text-white">{t("patentAppNo")}:</span> EPA-2025-0137</p>
                                    <p><span className="font-medium text-white">{t("patentDate")}:</span> 2025-08-20</p>
                                    <p><span className="font-medium text-white">{t("patentInventors")}:</span> Ji-Se Seong, Yu-Seok Kang</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-cyan-400 mb-2">{t("patentTitleLabel")}</h4>
                                <p className="text-sm text-muted-foreground italic">
                                    {t("patentTitleEn")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {t("patentTitleKo")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20 text-center">
                <Link href="/pricing">
                    <Button size="lg" variant="default" className="bg-white text-black hover:bg-zinc-200">
                        {t("ctaButton")}
                    </Button>
                </Link>
            </section>
        </div>
    );
}
