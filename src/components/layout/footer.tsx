"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { BusinessInfo } from "@/components/layout/BusinessInfo";
import { filterVisibleServices } from "@/lib/upcoming-services";

const serviceLinks = filterVisibleServices([
    { href: "/sniff", labelKey: "sniff" },
    { href: "/sniff-hospital", labelKey: "sniffHospital" },
    { href: "/csv-automation", labelKey: "csvAutomation" },
    { href: "/fem-ai", labelKey: "femAi" },
    { href: "/automation", labelKey: "automation" },
]);

export function Footer() {
    const t = useTranslations("Footer");
    const nt = useTranslations("Navbar");

    return (
        <footer className="bg-gray-50 border-t border-gray-100 py-12 mt-auto">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center mb-4">
                            <img
                                src="/logos/inova-blue.png"
                                alt="INOVA.AI"
                                className="h-6 w-auto"
                            />
                        </Link>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            {t("description")}
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 mb-4">{t("services")}</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                            {serviceLinks.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="hover:text-blue-600 transition-colors">
                                        {nt(link.labelKey)}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 mb-4">{t("company")}</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><Link href="/about" className="hover:text-blue-600 transition-colors">About Us</Link></li>
                            <li><Link href="/technology" className="hover:text-blue-600 transition-colors">Technology</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 mb-4">{t("contact")}</h4>
                        <BusinessInfo className="space-y-2 text-sm text-gray-600" />
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-400 text-xs text-center md:text-left">
                        © {new Date().getFullYear()} INOVA.AI. All rights reserved.
                    </p>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
                        <Link href="/privacy" className="font-bold text-gray-800 hover:text-blue-600 underline underline-offset-4">
                            {t("privacyPolicy")}
                        </Link>
                        <Link href="/terms" className="hover:text-gray-700">
                            {t("termsOfService")}
                        </Link>
                        <Link href="/refund-policy" className="hover:text-gray-700">
                            {t("refundPolicy")}
                        </Link>
                        <Link href="/account/subscription" className="hover:text-gray-700">
                            {t("manageSubscription")}
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
