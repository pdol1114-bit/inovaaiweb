import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, GraduationCap, Heart, MapPin } from "lucide-react";
import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function AboutPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("About");

    return (
        <div className="flex flex-col min-h-screen">
            {/* About Hero */}
            <section className="py-20 md:py-32 bg-background relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 animate-pulse">
                    <Heart className="h-64 w-64 text-pink-500" />
                </div>
                <div className="container mx-auto px-4 relative z-10">
                    <h1 className="text-4xl md:text-6xl font-bold mb-8">
                        {t.rich("heroTitle", {
                            span: (chunks) => <span className="text-cyan-400">{chunks}</span>
                        })}
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl leading-relaxed">
                        {t("heroDescription")}
                    </p>
                </div>
            </section>

            {/* Mission/Vision */}
            <section className="py-20 bg-secondary/10">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        <div>
                            <h3 className="text-xs font-semibold tracking-wider text-cyan-500 uppercase mb-2">{t("missionLabel")}</h3>
                            <h2 className="text-3xl font-bold mb-6">{t("missionTitle")}</h2>
                            <p className="text-muted-foreground mb-4">
                                {t("missionDesc1")}
                            </p>
                            <p className="text-muted-foreground">
                                {t("missionDesc2")}
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                                    <GraduationCap className="h-6 w-6 text-cyan-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold mb-1">{t("vetLedTitle")}</h4>
                                    <p className="text-sm text-muted-foreground">{t("vetLedDesc")}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <Heart className="h-6 w-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold mb-1">{t("petCentricTitle")}</h4>
                                    <p className="text-sm text-muted-foreground">{t("petCentricDesc")}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Roadmap */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-16">{t("journeyTitle")}</h2>

                    <div className="relative border-l border-white/10 ml-4 md:ml-auto md:mr-auto md:w-2/3 pl-8 space-y-12">

                        <div className="relative">
                            <div className="absolute -left-[39px] h-5 w-5 rounded-full bg-cyan-500 border-4 border-background"></div>
                            <h3 className="text-xl font-bold text-cyan-400 mb-2">{t("journeyNowTitle")}</h3>
                            <p className="text-muted-foreground mb-4">
                                {t("journeyNowDesc")}
                            </p>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li className="flex items-center"><CheckCircle2 className="h-3 w-3 mr-2" /> {t("journeyNowFeature1")}</li>
                                <li className="flex items-center"><CheckCircle2 className="h-3 w-3 mr-2" /> {t("journeyNowFeature2")}</li>
                            </ul>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-[39px] h-5 w-5 rounded-full bg-slate-700 border-4 border-background"></div>
                            <h3 className="text-xl font-bold text-foreground mb-2">{t("journeyNextTitle")}</h3>
                            <p className="text-muted-foreground mb-4">
                                {t("journeyNextDesc")}
                            </p>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li className="flex items-center"><ChevronRight className="h-3 w-3 mr-2" /> {t("journeyNextFeature1")}</li>
                                <li className="flex items-center"><ChevronRight className="h-3 w-3 mr-2" /> {t("journeyNextFeature2")}</li>
                            </ul>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-[39px] h-5 w-5 rounded-full bg-slate-700 border-4 border-background"></div>
                            <h3 className="text-xl font-bold text-foreground mb-2">{t("journeyFutureTitle")}</h3>
                            <p className="text-muted-foreground">
                                {t("journeyFutureDesc")}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Office/Location */}
            <section className="py-20 bg-secondary/10 text-center">
                <div className="container mx-auto px-4">
                    <MapPin className="h-8 w-8 text-cyan-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">{t("officeTitle")}</h2>
                    <p className="text-muted-foreground">{t("officeLocation")}</p>
                    <div className="mt-8">
                        <Link href="mailto:support@inovaai.ai">
                            <Button variant="link" className="text-cyan-400">{t("contactButton")} &rarr;</Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
