import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default function PrivacyPage({
    params,
}: {
    params: { locale: string };
}) {
    const { locale } = params;
    setRequestLocale(locale);
    const t = useTranslations("Privacy");

    return (
        <div className="bg-white min-h-screen py-20 px-4">
            <div className="container mx-auto max-w-4xl text-slate-800">
                <header className="mb-16 border-b border-slate-100 pb-12">
                    <h1 className="text-4xl font-black mb-6 text-slate-900 tracking-tight">
                        {t("title")}
                    </h1>
                    <div className="space-y-2">
                        <p className="text-lg font-bold text-slate-700">{t("companyName")}</p>
                        <p className="text-sm text-slate-400 font-medium">{t("effectiveDate")}</p>
                    </div>
                </header>

                <div className="space-y-16 leading-relaxed">
                    <section>
                        <p className="text-lg text-slate-600">
                            {t("intro")}
                        </p>
                    </section>

                    {/* Section 1 */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-900">{t("section1Title")}</h2>
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <h3 className="font-bold text-slate-800">{t("section1Subtitle1")}</h3>
                                <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                                    {(t.raw("section1List1") as string[]).map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-3">
                                <h3 className="font-bold text-slate-800">{t("section1Subtitle2")}</h3>
                                <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                                    {(t.raw("section1List2") as string[]).map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Section 2 */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-900">{t("section2Title")}</h2>
                        <p className="text-slate-600 mb-4">{t("section2Intro")}</p>
                        <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                            {(t.raw("section2List") as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    {/* Section 3 */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-900">{t("section3Title")}</h2>
                        <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                            {(t.raw("section3List") as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section className="space-y-8">
                        <h2 className="text-2xl font-black text-slate-900">{t("section4Title")}</h2>
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="font-bold text-slate-800">{t("section4Subtitle1")}</h3>
                                <p className="text-slate-600">{t("section4Text1")}</p>
                            </div>
                            <div className="space-y-3">
                                <h3 className="font-bold text-slate-800">{t("section4Subtitle2")}</h3>
                                <p className="text-slate-600">{t("section4Text2")}</p>
                                <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                                    {(t.raw("section4List2") as string[]).map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                                <p className="text-slate-600 pt-2">{t("section4Footer2")}</p>
                            </div>
                        </div>
                    </section>

                    {/* Section 5 */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-900">{t("section5Title")}</h2>
                        <p className="text-slate-600">{t("section5Text")}</p>
                    </section>

                    {/* Section 6 */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-900">{t("section6Title")}</h2>
                        <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                            {(t.raw("section6List") as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    {/* Section 7 */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-900">{t("section7Title")}</h2>
                        <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                            {(t.raw("section7List") as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    {/* Section 8 */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-900">{t("section8Title")}</h2>
                        <p className="text-slate-600 mb-4">{t("section8Intro")}</p>
                        <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                            {(t.raw("section8List") as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    {/* Section 9 */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-900">{t("section9Title")}</h2>
                        <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                            {(t.raw("section9List") as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    {/* Section 10 */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-900">{t("section10Title")}</h2>
                        <p className="text-slate-600 mb-4">{t("section10Intro")}</p>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-2">
                             {(t.raw("section10List") as string[]).map((item, i) => (
                                <p key={i} className="text-slate-700 font-medium">{item}</p>
                            ))}
                        </div>
                    </section>

                    {/* Section 11 */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-black text-slate-900">{t("section11Title")}</h2>
                        <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                            {(t.raw("section11List") as string[]).map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    <footer className="pt-16 pb-8 border-t border-slate-100 italic text-slate-400 text-sm">
                        {t("finalNote")}
                    </footer>
                </div>
            </div>
        </div>
    );
}
