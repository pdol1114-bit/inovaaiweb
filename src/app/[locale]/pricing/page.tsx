"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Loader2, Lock, Sparkles, User, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

type Plan = "monthly" | "yearly";
type Step = "select" | "auth" | "pay" | "success";

export default function PricingPage() {
    const [step, setStep] = useState<Step>("select");
    const [billing, setBilling] = useState<Plan>("monthly");
    const [isLoading, setIsLoading] = useState(false);

    const handlePlanSelect = () => {
        setStep("auth");
    };

    const handleAuthSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep("pay");
        }, 1500);
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep("success");
        }, 2000);
    };

    // Prices in KRW
    const monthlyPrice = 3300; // incl. VAT
    const yearlyPrice = 33000; // incl. VAT
    const currentPrice = billing === "monthly" ? monthlyPrice : yearlyPrice;
    const priceDisplay = currentPrice.toLocaleString() + "원";

    return (
        <div className="min-h-screen pt-24 pb-20 bg-background flex flex-col items-center justify-center px-4">

            {/* Progress Indicators */}
            <div className="w-full max-w-3xl mb-12 flex items-center justify-center space-x-4">
                <div className={cn("h-2 rounded-full transition-all duration-500", step === "select" ? "w-12 bg-cyan-400" : "w-4 bg-white/20", (step === "auth" || step === "pay" || step === "success") && "bg-cyan-400/50")}></div>
                <div className={cn("h-2 rounded-full transition-all duration-500", step === "auth" ? "w-12 bg-cyan-400" : "w-4 bg-white/20", (step === "pay" || step === "success") && "bg-cyan-400/50")}></div>
                <div className={cn("h-2 rounded-full transition-all duration-500", step === "pay" ? "w-12 bg-cyan-400" : "w-4 bg-white/20", step === "success" && "bg-cyan-400/50")}></div>
                <div className={cn("h-2 rounded-full transition-all duration-500", step === "success" ? "w-12 bg-emerald-400" : "w-4 bg-white/20")}></div>
            </div>

            <div className="w-full max-w-4xl animate-fade-in">

                {/* Step 1: Select Plan */}
                {step === "select" && (
                    <div className="space-y-12">
                        <div className="text-center space-y-4">
                            <h1 className="text-4xl font-bold">Choose Your Plan</h1>
                            <p className="text-muted-foreground">Unlock unlimited AI health analysis for your pets.</p>

                            <div className="flex items-center justify-center space-x-4 mb-8">
                                <span className={cn("cursor-pointer font-medium", billing === "monthly" ? "text-white" : "text-muted-foreground")} onClick={() => setBilling("monthly")}>Monthly</span>
                                <div
                                    className="w-14 h-7 bg-white/10 rounded-full relative cursor-pointer p-1 transition-colors hover:bg-white/20"
                                    onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
                                >
                                    <div className={cn("h-5 w-5 bg-cyan-400 rounded-full transition-all duration-300 shadow-lg", billing === "yearly" ? "translate-x-7" : "translate-x-0")}></div>
                                </div>
                                <span className={cn("cursor-pointer font-medium", billing === "yearly" ? "text-white" : "text-muted-foreground")} onClick={() => setBilling("yearly")}>Yearly <span className="text-xs text-cyan-400 ml-1">(2 months free)</span></span>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 items-stretch">
                            {/* Free Tier */}
                            <div className="p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-left relative overflow-hidden flex flex-col">
                                <h3 className="text-xl font-bold mb-2">Basic</h3>
                                <div className="text-3xl font-bold mb-6">0원<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                                <ul className="space-y-3 mb-8 text-sm text-muted-foreground flex-1">
                                    <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-white" /> 1 AI Health Check / Month</li>
                                    <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-white" /> Basic Report</li>
                                    <li className="flex items-center opacity-50"><Check className="h-4 w-4 mr-2" /> No Vet Verification</li>
                                </ul>
                                <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                            </div>

                            {/* Pro Tier */}
                            <div className="p-8 rounded-2xl border border-cyan-500/50 bg-gradient-to-b from-cyan-950/30 to-background text-left relative overflow-hidden ring-2 ring-cyan-500/20 transform hover:-translate-y-1 transition-all duration-300 flex flex-col">
                                <div className="absolute top-0 right-0 bg-cyan-500 text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
                                <h3 className="text-xl font-bold mb-2 flex items-center">Pro <Sparkles className="h-4 w-4 ml-2 text-yellow-400" /></h3>
                                <div className="text-3xl font-bold mb-6">
                                    {billing === "monthly" ? "3,300원" : "33,000원"}
                                    <span className="text-sm font-normal text-muted-foreground">/{billing === "monthly" ? "mo" : "yr"}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-6 -mt-4">VAT Included</p>
                                <ul className="space-y-3 mb-8 text-sm flex-1">
                                    <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-cyan-400" /> Unlimited AI Analysis</li>
                                    <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-cyan-400" /> Detailed Medical Reports</li>
                                    <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-cyan-400" /> Vet Verification on Alerts</li>
                                    <li className="flex items-center"><Check className="h-4 w-4 mr-2 text-cyan-400" /> Priority Support</li>
                                </ul>
                                <Button variant="premium" className="w-full" onClick={handlePlanSelect}>
                                    Select Pro Plan
                                </Button>
                            </div>
                        </div>

                        {/* App Store Section */}
                        <div className="mt-16 pt-16 border-t border-white/10 text-center">
                            <h2 className="text-2xl font-bold mb-6 flex items-center justify-center gap-2">
                                <Smartphone className="h-6 w-6 text-cyan-400" />
                                Download the App
                            </h2>
                            <div className="glass-panel p-8 rounded-2xl max-w-2xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8">
                                <div className="h-32 w-32 bg-zinc-800 rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center relative">
                                    {/* Placeholder for the app icon found in search */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 opacity-20"></div>
                                    <span className="text-4xl font-bold text-white z-10">S</span>
                                    {/* Ideally we would use a real image here if found */}
                                    <p className="absolute bottom-2 text-[10px] text-white/50">Sniff by Hatch</p>
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold mb-2">Sniff by Hatch</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Manage your pet's health on the go. Available on iOS and Android.
                                    </p>
                                    <div className="flex gap-4">
                                        <Button variant="outline" size="sm" className="h-10">
                                            <span className="mr-2">🍎</span> App Store
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-10">
                                            <span className="mr-2">🤖</span> Play Store
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Auth */}
                {step === "auth" && (
                    <div className="max-w-md mx-auto p-8 rounded-2xl glass-panel animate-fade-in">
                        <h2 className="text-2xl font-bold mb-6 text-center">Create Account</h2>
                        <form onSubmit={handleAuthSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        required
                                        className="w-full bg-secondary/50 border border-white/10 rounded-md py-2 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        className="w-full bg-secondary/50 border border-white/10 rounded-md py-2 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                </div>
                            </div>
                            <Button type="submit" variant="premium" className="w-full" isLoading={isLoading}>
                                Continue to Payment
                            </Button>
                            <div className="text-center text-xs text-muted-foreground mt-4">
                                Already have an account? <span className="text-cyan-400 underline cursor-pointer">Log in</span>
                            </div>
                        </form>
                        <div className="mt-4 pt-4 border-t border-white/10 text-center">
                            <button
                                onClick={() => setStep("select")}
                                className="text-sm text-muted-foreground hover:text-white"
                            >
                                &larr; Back to Plans
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Payment */}
                {step === "pay" && (
                    <div className="max-w-md mx-auto p-8 rounded-2xl glass-panel animate-fade-in">
                        <div className="mb-6 flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Secure Checkout</h2>
                            <Lock className="h-4 w-4 text-emerald-400" />
                        </div>

                        <div className="bg-secondary/50 p-4 rounded-lg mb-6 flex justify-between items-center">
                            <div>
                                <div className="font-bold">Pro Plan ({billing === "monthly" ? "Monthly" : "Yearly"})</div>
                                <div className="text-xs text-muted-foreground">Billed {billing === "monthly" ? "monthly" : "annually"}</div>
                            </div>
                            <div className="font-bold text-xl">{priceDisplay}</div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm font-medium mb-2">Select Payment Method</p>

                            {/* Domestic Methods */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <Button variant="outline" className="h-12 border-white/10 hover:bg-white/5 flex flex-col items-center justify-center text-xs" onClick={handlePaymentSubmit}>
                                    <CreditCard className="h-4 w-4 mb-1" />
                                    <span>Credit Card</span>
                                </Button>
                                <Button variant="outline" className="h-12 border-white/10 hover:bg-white/5 flex flex-col items-center justify-center text-xs" onClick={handlePaymentSubmit}>
                                    <div className="font-bold mb-1">PAYCO</div>
                                    <span>Easy Pay</span>
                                </Button>
                            </div>

                            {/* International Methods */}
                            <p className="text-xs text-muted-foreground mb-2">International Payments</p>
                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="h-12 border-white/10 hover:bg-white/5 flex flex-col items-center justify-center text-xs" onClick={handlePaymentSubmit}>
                                    <span className="font-bold italic text-blue-400">PayPal</span>
                                </Button>
                                <Button variant="outline" className="h-12 border-white/10 hover:bg-white/5 flex flex-col items-center justify-center text-xs" onClick={handlePaymentSubmit}>
                                    <span className="font-bold italic text-indigo-400">Stripe</span>
                                </Button>
                            </div>

                            <div className="pt-6">
                                <Button variant="premium" className="w-full" isLoading={isLoading} onClick={handlePaymentSubmit}>
                                    Pay {priceDisplay} via Portone
                                </Button>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10 text-center">
                            <button
                                onClick={() => setStep("auth")}
                                className="text-sm text-muted-foreground hover:text-white"
                            >
                                &larr; Back to Account
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Success */}
                {step === "success" && (
                    <div className="max-w-md mx-auto text-center animate-fade-in">
                        <div className="h-24 w-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="h-12 w-12 text-emerald-400" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Welcome to Sniff Pro!</h2>
                        <p className="text-muted-foreground mb-8">
                            Your subscription of {priceDisplay} has been processed successfully.
                        </p>
                        <Link href="/">
                            <Button variant="outline" className="w-full">Go to Dashboard</Button>
                        </Link>
                    </div>
                )}

            </div>
        </div>
    );
}
