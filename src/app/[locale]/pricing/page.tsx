import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pricing");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
      <h1 className="text-4xl font-bold mb-8">{t("title")}</h1>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Free Plan */}
        <div className="p-8 rounded-2xl border border-gray-200 bg-white">
          <h2 className="text-2xl font-semibold mb-4">{t("freePlanTitle")}</h2>
          <p className="text-xl font-bold mb-2">{t("freePrice")}</p>
          <ul className="space-y-2 mb-4 text-gray-600">
            <li>{t("freeFeature1")}</li>
            <li>{t("freeFeature2")}</li>
          </ul>
          <button disabled className="w-full py-2 bg-gray-300 text-gray-700 rounded cursor-not-allowed">{t("currentPlan")}</button>
        </div>
        {/* Premium Plan */}
        <div className="p-8 rounded-2xl border border-cyan-500 bg-gradient-to-b from-cyan-950/30 to-background text-white">
          <h2 className="text-2xl font-semibold mb-4">{t("premiumPlanTitle")}</h2>
          <p className="text-xl font-bold mb-2">{t("premiumPrice")}</p>
          <ul className="space-y-2 mb-4 text-gray-200">
            <li>{t("premiumFeature1")}</li>
            <li>{t("premiumFeature2")}</li>
            <li>{t("premiumFeature3")}</li>
            <li>{t("premiumFeature4")}</li>
          </ul>
          <Link href={`/${locale}/payment`} className="block w-full text-center py-2 bg-cyan-600 hover:bg-cyan-500 rounded">{t("subscribeButton")}</Link>
        </div>
      </div>
      <p className="mt-8 text-sm text-gray-500 text-center max-w-2xl">
        {t("disclaimer")}
      </p>
      <Link href={`/${locale}/refund-policy`} className="mt-4 text-sm text-cyan-600 hover:underline">
        {t("refundPolicyLink")}
      </Link>
    </div>
  );
}
