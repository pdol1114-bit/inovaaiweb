"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const links = [
    { href: "/", label: "Overview" },
    { href: "/sniff", label: "Sniff by Hatch" },
    { href: "/automation", label: "Workflow Automation" },
    { href: "/fem-ai", label: "FEM & AI" },
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
                        className="h-8 w-auto transition-transform group-hover:scale-105"
                    />
                    <span className="font-bold text-xl tracking-tight text-gray-900">
                        INOVA.AI
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center space-x-1">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "px-4 py-2 text-sm font-medium transition-all rounded-lg",
                                pathname === link.href
                                    ? "text-blue-600 bg-blue-50"
                                    : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center space-x-3">
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 hover:bg-blue-50" asChild>
                        <Link href="/auth">Login</Link>
                    </Button>
                    <Button size="sm" className="bg-primary text-white hover:bg-primary/90 shadow-lg shadow-blue-200/50 px-6" asChild>
                        <Link href="/pricing" className="flex items-center">
                            Get Started <Rocket className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
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
                                    {link.label}
                                </Link>
                            ))}
                            <div className="pt-4 flex flex-col space-y-3">
                                <Button variant="outline" className="w-full border-gray-200 text-gray-700 h-12" asChild onClick={() => setIsOpen(false)}>
                                    <Link href="/auth">Login</Link>
                                </Button>
                                <Button className="w-full bg-primary text-white h-12 shadow-lg shadow-blue-200/50" asChild onClick={() => setIsOpen(false)}>
                                    <Link href="/pricing">Get Started</Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
