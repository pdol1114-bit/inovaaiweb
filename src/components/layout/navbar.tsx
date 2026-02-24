"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const links = [
    { href: "/sniff", label: "Sniff by Hatch" },
    { href: "/sniff-hospital", label: "Sniff by Hatch for Hospital", isComingSoon: true, launchText: "26년 말 출시 예정" },
    { href: "/csv-automation", label: "CSV 자동화", isComingSoon: true, launchText: "출시 예정" },
    { href: "/fem-ai", label: "FEM & AI", isComingSoon: true, launchText: "출시 예정" },
    { href: "/automation", label: "업무자동화" },
];

export function Navbar() {
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
                        <div key={link.href} className="relative group/nav">
                            <Link
                                href={link.isComingSoon ? "#" : link.href}
                                className={cn(
                                    "px-3 py-2 text-sm font-medium transition-all rounded-lg block",
                                    pathname === link.href
                                        ? "text-blue-600 bg-blue-50"
                                        : "text-gray-600 hover:text-blue-600 hover:bg-blue-50",
                                    link.isComingSoon && "blur-[1.5px] pointer-events-none opacity-60"
                                )}
                            >
                                {link.label}
                            </Link>
                            {link.isComingSoon && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="bg-red-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded rotate-[-12deg] border border-white shadow-sm whitespace-nowrap">
                                        {link.launchText}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Desktop Actions - Removed global buttons */}
                <div className="hidden md:flex items-center">
                    {/* Placeholder space for balance or future right-side items */}
                    <div className="w-10"></div>
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
                                <div key={link.href} className="relative">
                                    <Link
                                        href={link.isComingSoon ? "#" : link.href}
                                        className={cn(
                                            "px-4 py-3 text-base font-medium rounded-xl transition-colors block",
                                            pathname === link.href
                                                ? "text-blue-600 bg-blue-50"
                                                : "text-gray-600 hover:text-blue-600 hover:bg-blue-50",
                                            link.isComingSoon && "blur-[2px] pointer-events-none opacity-60"
                                        )}
                                        onClick={() => !link.isComingSoon && setIsOpen(false)}
                                    >
                                        {link.label}
                                    </Link>
                                    {link.isComingSoon && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-lg rotate-[-5deg] border-2 border-white shadow-lg shadow-red-200/50">
                                                {link.launchText}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
