"use client";

import { usePathname, useRouter, Link } from "@/i18n/routing";
import { useState, useEffect } from "react";
import { Menu, X, Globe } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const links = [
    { href: "/sniff", labelKey: "sniff" },
    { href: "/sniff-hospital", labelKey: "sniffHospital" },
    { href: "/csv-automation", labelKey: "csvAutomation" },
    { href: "/fem-ai", labelKey: "femAi" },
    { href: "/automation", labelKey: "automation" },
];

export function Navbar() {
    const t = useTranslations("Navbar");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const toggleLanguage = (newLocale: "ko" | "en") => {
        router.replace(pathname, { locale: newLocale });
        setIsOpen(false);
    };

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
            isScrolled ? "bg-white/80 backdrop-blur-md border-b border-gray-100 py-3 shadow-sm" : "bg-transparent py-5"
        )}>
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2 group">
                    <img
                        src="/logos/inova-blue.png"
                        alt="INOVA.AI"
                        className="h-7 w-auto transition-transform group-hover:scale-105"
                    />
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center space-x-1">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "px-3 py-2 text-sm font-medium transition-all rounded-lg",
                                pathname === link.href
                                    ? "text-blue-600 bg-blue-50"
                                    : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            )}
                        >
                            {t(link.labelKey)}
                        </Link>
                    ))}

                    {/* Language Toggle */}
                    <div className="flex items-center ml-2">
                        <div className="flex items-center space-x-0.5 bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                            <Globe className="h-3.5 w-3.5 text-gray-400 ml-1.5 mr-0.5" />
                            <button
                                onClick={() => toggleLanguage('ko')}
                                className={cn(
                                    "px-1.5 py-1 text-xs font-bold rounded transition-all",
                                    locale === 'ko' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-blue-600"
                                )}
                            >
                                KR
                            </button>
                            <button
                                onClick={() => toggleLanguage('en')}
                                className={cn(
                                    "px-1.5 py-1 text-xs font-bold rounded transition-all",
                                    locale === 'en' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-blue-600"
                                )}
                            >
                                US
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Nav */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
                    >
                        <div className="container mx-auto px-4 py-6 flex flex-col space-y-2">
                            {links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "px-4 py-3 text-base font-medium rounded-xl transition-colors",
                                        pathname === link.href
                                            ? "text-blue-600 bg-blue-50"
                                            : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                                    )}
                                    onClick={() => setIsOpen(false)}
                                >
                                    {t(link.labelKey)}
                                </Link>
                            ))}

                            {/* Mobile Language Toggle */}
                            <div className="flex items-center pt-4 mt-4 border-t border-gray-100 space-x-2">
                                <Globe className="h-5 w-5 text-gray-400" />
                                <span className="text-sm text-gray-500 font-medium mr-2">Language:</span>
                                <button
                                    onClick={() => toggleLanguage('ko')}
                                    className={cn(
                                        "px-4 py-2 text-sm font-bold rounded-lg transition-all flex-1",
                                        locale === 'ko' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                                    )}
                                >
                                    KR
                                </button>
                                <button
                                    onClick={() => toggleLanguage('en')}
                                    className={cn(
                                        "px-4 py-2 text-sm font-bold rounded-lg transition-all flex-1",
                                        locale === 'en' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                                    )}
                                >
                                    US
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
