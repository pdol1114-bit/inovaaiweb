import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function TermsPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("Terms");

    return (
        <div className="flex flex-col min-h-screen bg-gray-50/50">
            {/* Header */}
            <section className="pt-32 pb-12 bg-white border-b border-gray-100 font-sans">
                <div className="container mx-auto px-4 max-w-4xl">
                    <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-primary mb-8 transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t("backToMain")}
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t("title")}</h1>
                    <p className="text-gray-500">{t("lastUpdated")}</p>
                </div>
            </section>

            {/* Content */}
            <section className="py-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 prose prose-gray max-w-none">
                        <div className="space-y-8 text-gray-700 leading-relaxed font-sans">
                            {/* Dynamic Sections */}
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((num) => {
                                const sectionKey = `sections.s${num}`;
                                return (
                                    <section key={num}>
                                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                                            {t(`${sectionKey}.title`)}
                                        </h3>
                                        
                                        {/* Content Paragraph (if exists) */}
                                        {t.has(`${sectionKey}.content`) && (
                                            <p>{t(`${sectionKey}.content`)}</p>
                                        )}

                                        {/* Intro Paragraph (if exists) */}
                                        {t.has(`${sectionKey}.intro`) && (
                                            <p className="mb-2">{t(`${sectionKey}.intro`)}</p>
                                        )}

                                        {/* Warning Box (Section 13) */}
                                        {num === 13 && (
                                            <div className="space-y-2 text-amber-800 bg-amber-50 p-6 rounded-xl border border-amber-100 mb-4">
                                                <p className="font-bold mb-2 underline decoration-2">
                                                    {t(`${sectionKey}.warning`)}
                                                </p>
                                                <div className="space-y-2">
                                                    {(t.raw(`${sectionKey}.list`) as string[]).map((item, i) => (
                                                        <p key={i}>{item}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Standard List (excluding s13 which has a warning box) */}
                                        {t.has(`${sectionKey}.list`) && num !== 13 && (
                                            <div className="space-y-2">
                                                {(t.raw(`${sectionKey}.list`) as string[]).map((item, i) => {
                                                    if (item.startsWith("•")) {
                                                        return (
                                                            <ul key={i} className="list-disc pl-5 my-1">
                                                                <li>{item.substring(1).trim()}</li>
                                                            </ul>
                                                        );
                                                    }
                                                    return <p key={i}>{item}</p>;
                                                })}
                                            </div>
                                        )}

                                        {/* Footer Paragraph (if exists) */}
                                        {t.has(`${sectionKey}.footer`) && (
                                            <p className="mt-4">{t(`${sectionKey}.footer`)}</p>
                                        )}
                                    </section>
                                );
                            })}

                            <div className="pt-8 border-t border-gray-100">
                                <p className="font-bold text-gray-900">{t("appendix.title")}</p>
                                <p>{t("appendix.content")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
