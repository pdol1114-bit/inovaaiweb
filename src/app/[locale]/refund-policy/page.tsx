import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function RefundPolicyPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("RefundPolicy");

    return (
        <div className="flex flex-col min-h-screen bg-gray-50/50">
            {/* Header */}
            <section className="pt-32 pb-12 bg-white border-b border-gray-100 font-sans">
                <div className="container mx-auto px-4 max-w-4xl">
                    <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-primary mb-8 transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {locale === "ko" ? "메인으로 돌아가기" : "Back to Main"}
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t("title")}</h1>
                </div>
            </section>

            {/* Content */}
            <section className="py-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 prose prose-gray max-w-none">
                        <ol className="space-y-4 text-gray-700 leading-relaxed font-sans list-decimal pl-5">
                            <li>{t("item1")}</li>
                            <li>{t("item2")}</li>
                            <li>{t("item3")}</li>
                            <li>{t("item4")}</li>
                            <li>{t("item5")}</li>
                            <li>{t("item6")}</li>
                            <li>{t("item7")}</li>
                        </ol>
                    </div>
                </div>
            </section>
        </div>
    );
}
