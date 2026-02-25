"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

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
                            <li><Link href="/sniff" className="hover:text-blue-600 transition-colors">{nt("sniff")}</Link></li>
                            <li><Link href="/sniff-hospital" className="hover:text-blue-600 transition-colors">{nt("sniffHospital")}</Link></li>
                            <li><Link href="/csv-automation" className="hover:text-blue-600 transition-colors">{nt("csvAutomation")}</Link></li>
                            <li><Link href="/fem-ai" className="hover:text-blue-600 transition-colors">{nt("femAi")}</Link></li>
                            <li><Link href="/automation" className="hover:text-blue-600 transition-colors">{nt("automation")}</Link></li>
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
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>{t("representative")}</li>
                            <li>{t("businessNumber")}</li>
                            <li>{t("address")}</li>
                            <li>support@inovaai.ai</li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-400 text-xs text-center md:text-left">
                        © {new Date().getFullYear()} INOVA.AI. All rights reserved.
                    </p>
                    <div className="flex space-x-6 text-xs text-gray-400">
                        <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-gray-600">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
