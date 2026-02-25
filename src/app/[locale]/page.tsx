import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, ShieldCheck, Activity, Stethoscope, Settings } from "lucide-react";
import { QRBadge } from "@/components/ui/qr-badge";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden bg-white">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-60 z-0"></div>
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-cyan-50 rounded-full blur-[100px] opacity-60 z-0"></div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-600 mb-6 animate-fade-in shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
            {t("heroBadge")}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-gray-900 animate-fade-in whitespace-pre-line">
            {t.rich("heroTitle", {
              br: () => <br className="hidden md:block" />
            })}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 animate-fade-in opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
            {t("heroDescription")}
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-50/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">{t("coreBusinesses")}</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              {t("coreDescription")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {/* Service 1: Sniff by Hatch */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 group p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">{t("service1Title")}</h3>
              <p className="text-gray-600 mb-6 flex-grow">
                {t("service1Desc")}
              </p>
              <Link href="/sniff" className="inline-flex items-center text-blue-500 font-semibold hover:text-blue-700 transition-colors mt-auto">
                {t("learnMore")} <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Service 2: Sniff by Hatch Hospital */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 group p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 mb-6 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <Stethoscope className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">{t("service2Title")}</h3>
              <p className="text-gray-600 mb-6 flex-grow">
                {t("service2Desc")}
              </p>
              <Link href="/sniff-hospital" className="inline-flex items-center text-sky-500 font-semibold hover:text-sky-700 transition-colors mt-auto">
                {t("learnMore")} <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Service 3: CSV Automation */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 group p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">{t("service3Title")}</h3>
              <p className="text-gray-600 mb-6 flex-grow">
                {t("service3Desc")}
              </p>
              <Link href="/csv-automation" className="inline-flex items-center text-emerald-500 font-semibold hover:text-emerald-700 transition-colors mt-auto">
                {t("learnMore")} <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Service 4: FEM & AI */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 lg:col-start-2 group p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">{t("service4Title")}</h3>
              <p className="text-gray-600 mb-6 flex-grow">
                {t("service4Desc")}
              </p>
              <Link href="/fem-ai" className="inline-flex items-center text-purple-500 font-semibold hover:text-purple-700 transition-colors mt-auto">
                {t("learnMore")} <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Service 5: Workflow Automation */}
            <div className="col-span-1 md:col-span-2 md:col-start-2 lg:col-span-2 lg:col-start-4 group p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <Settings className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">{t("service5Title")}</h3>
              <p className="text-gray-600 mb-6 flex-grow">
                {t("service5Desc")}
              </p>
              <Link href="/automation" className="inline-flex items-center text-orange-500 font-semibold hover:text-orange-700 transition-colors mt-auto">
                {t("learnMore")} <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust/Safety Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Pioneering <br />
                <span className="text-blue-400">AI Excellence</span>
              </h2>
              <p className="text-muted-foreground mb-6">
                At Inova AI, we combine domain expertise with cutting-edge artificial intelligence to transform industries.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 mr-3" />
                  <span>Secure & Reliable Industrial Solutions</span>
                </li>
                <li className="flex items-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 mr-3" />
                  <span>Scalable AI Infrastructure</span>
                </li>
                <li className="flex items-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 mr-3" />
                  <span>Expert-in-the-loop Validation</span>
                </li>
              </ul>
            </div>
            <div className="flex-1 relative h-[400px] w-full bg-gradient-to-tr from-blue-900/20 to-purple-900/20 rounded-3xl border border-white/10 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
              <div className="relative z-10 glass-panel p-8 rounded-xl max-w-sm mx-4">
                <p className="text-lg font-bold mb-2 text-white">Our Mission</p>
                <p className="text-sm italic text-gray-300">
                  "To push the boundaries of what's possible with AI, creating tangible value for businesses and individuals alike."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
