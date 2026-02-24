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
    const [isScrolled, setIsScrolled] = useState(false); // Added isScrolled state

    // Effect to handle scroll for dynamic navbar styling
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
            isScrolled ? "bg-white/80 backdrop-blur-md border-b border-gray-100 py-3 shadow-sm" : "bg-transparent py-5"
        )}>
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-2">
                    <img
                        src="/logos/inova-blue.png"
                        alt="INOVA.AI"
                        className="h-8 w-auto"
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
                                "px-4 py-2 text-sm font-medium transition-colors rounded-lg",
                                pathname === link.href ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
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
                    <Button size="sm" className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-blue-200/50" asChild>
                        <Link href="/pricing">Get Started <Rocket className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
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
