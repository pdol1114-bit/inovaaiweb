import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { createClient } from "@/utils/supabase/server";
import { getSubscriptionForUser } from "@/lib/subscription";
import { SubscriptionManager } from "@/components/account/SubscriptionManager";
import { ArrowLeft } from "lucide-react";

export default async function SubscriptionPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("Subscription");

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect({ href: "/auth", locale });
    }

    const subscription = await getSubscriptionForUser(supabase, user!.id);

    return (
        <div className="flex flex-col min-h-screen bg-gray-50/50">
            <section className="pt-32 pb-12 bg-white border-b border-gray-100">
                <div className="container mx-auto px-4 max-w-3xl">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 mb-8 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t("backToMain")}
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{t("title")}</h1>
                </div>
            </section>

            <section className="py-12">
                <div className="container mx-auto px-4 max-w-3xl">
                    <SubscriptionManager subscription={subscription} locale={locale} />
                </div>
            </section>
        </div>
    );
}
