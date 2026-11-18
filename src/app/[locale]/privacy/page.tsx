import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function PrivacyPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("Privacy");

    return (
        <div className="bg-white min-h-screen py-20 px-4">
            <div className="container mx-auto max-w-4xl text-slate-800">
                <header className="mb-16 border-b border-slate-100 pb-12 text-center md:text-left">
                    <h1 className="text-4xl font-black mb-6 text-slate-900 tracking-tight">
                        {t("title")}
                    </h1>
                    <div className="space-y-2">
                        <p className="text-lg font-bold text-slate-700">{t("companyName")}</p>
                        <p className="text-sm text-slate-400 font-medium">{t("effectiveDate")}</p>
                        <p className="text-sm text-slate-500 font-medium pt-2">
                            <a href="#fieldweather" className="underline underline-offset-4">{t("fieldweather.navNote")}</a>
                        </p>
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
                                <ul className="list-disc list-inside space-x-0 pl-1 space-y-2 text-slate-600">
                                    {(t.raw("section1List1") as string[]).map((item, i) => (
                                        <li key={i} className="pl-4 -indent-4">{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-3">
                                <h3 className="font-bold text-slate-800">{t("section1Subtitle2")}</h3>
                                <ul className="list-disc list-inside space-x-0 pl-1 space-y-2 text-slate-600">
                                    {(t.raw("section1List2") as string[]).map((item, i) => (
                                        <li key={i} className="pl-4 -indent-4">{item}</li>
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
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                            {(t.raw("section5TrusteeList") as string[]).map((item, i) => (
                                <p key={i} className="text-slate-700 font-medium">{item}</p>
                            ))}
                        </div>
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

                    {/* FieldWeather (별도 앱: 위 조항과 독립적으로 적용) */}
                    <section id="fieldweather" className="space-y-10 pt-16 border-t border-slate-100 scroll-mt-24">
                        <header className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t("fieldweather.title")}</h2>
                            <p className="text-lg font-bold text-slate-700">{t("fieldweather.companyName")}</p>
                            <p className="text-sm text-slate-400 font-medium">{t("fieldweather.effectiveDate")}</p>
                        </header>
                        <p className="text-lg text-slate-600">{t("fieldweather.intro")}</p>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-slate-900">{t("fieldweather.s1Title")}</h3>
                            <p className="text-slate-600">{t("fieldweather.s1Intro")}</p>
                            <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                                {(t.raw("fieldweather.s1List") as string[]).map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-slate-900">{t("fieldweather.s2Title")}</h3>
                            <p className="text-slate-600">{t("fieldweather.s2Intro")}</p>
                            <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                                {(t.raw("fieldweather.s2List") as string[]).map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                                {(t.raw("fieldweather.s2Notes") as string[]).map((item, i) => (
                                    <p key={i} className="text-slate-700 font-medium break-words">{item}</p>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-slate-900">{t("fieldweather.s3Title")}</h3>
                            <p className="text-slate-600">{t("fieldweather.s3Intro")}</p>
                            <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                                {(t.raw("fieldweather.s3List") as string[]).map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-slate-900">{t("fieldweather.s4Title")}</h3>
                            <ul className="list-disc list-inside pl-4 space-y-2 text-slate-600">
                                {(t.raw("fieldweather.s4List") as string[]).map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-slate-900">{t("fieldweather.s5Title")}</h3>
                            <p className="text-slate-600">{t("fieldweather.s5Text")}</p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-slate-900">{t("fieldweather.s6Title")}</h3>
                            <p className="text-slate-600">{t("fieldweather.s6Text")}</p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-slate-900">{t("fieldweather.s7Title")}</h3>
                            <p className="text-slate-600">{t("fieldweather.s7Text")}</p>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-2">
                                {(t.raw("section10List") as string[]).map((item, i) => (
                                    <p key={i} className="text-slate-700 font-medium">{item}</p>
                                ))}
                            </div>
                        </div>

                        <p className="italic text-slate-400 text-sm">{t("fieldweather.finalNote")}</p>
                    </section>

                    <footer className="pt-16 pb-8 border-t border-slate-100 italic text-slate-400 text-sm">
                        {t("finalNote")}
                    </footer>
                </div>
            </div>
        </div>
    );
}
