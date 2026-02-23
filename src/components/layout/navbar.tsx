"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
    { href: "/", label: "Overview" },
    { href: "/sniff", label: "Sniff by Hatch" },
    { href: "/automation", label: "Workflow Automation" },
    { href: "/fem-ai", label: "FEM & AI" },
];

export function Navbar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2">
                    <img
                        src="/logos/inova-blue.png"
                        alt="INOVA.AI"
                        className="h-8 w-auto"
                    />
                    <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        INOVA.AI
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center space-x-8">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-cyan-400",
                                pathname === link.href ? "text-cyan-400" : "text-muted-foreground"
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center space-x-4">
                    <Link href="/pricing">
                        <Button variant="ghost" size="sm">
                            Log in
                        </Button>
                    </Link>
                    <Link href="/pricing">
                        <Button variant="premium" size="sm">
                            Get Started <Rocket className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-white"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-background border-b border-white/10 p-4 animate-fade-in">
                    <nav className="flex flex-col space-y-4">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "text-base font-medium transition-colors hover:text-cyan-400",
                                    pathname === link.href ? "text-cyan-400" : "text-muted-foreground"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="pt-4 flex flex-col space-y-2">
                            <Link href="/pricing" onClick={() => setIsOpen(false)}>
                                <Button className="w-full" variant="outline">Log in</Button>
                            </Link>
                            <Link href="/pricing" onClick={() => setIsOpen(false)}>
                                <Button className="w-full" variant="premium">Get Started</Button>
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
