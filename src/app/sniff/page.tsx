import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, ShieldCheck, Stethoscope, Activity } from "lucide-react";
import Link from "next/link";

export default function SniffPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative py-20 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-background to-background z-0" />
                <div className="container relative z-10 mx-auto px-4 text-center">
                    <div className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-400 mb-6 animate-fade-in">
                        <span className="flex h-2 w-2 rounded-full bg-cyan-400 mr-2"></span>
                        Project: <img src="/logos/sniff-yellow.png" alt="Sniff by Hatch" className="h-4 w-auto inline-block ml-2" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-cyan-400 animate-fade-in">
                        AI-Powered Health Analysis <br className="hidden md:block" />
                        for Your Beloved Pets
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                        Sniff by Hatch combines advanced computer vision with veterinary expertise to detect health issues early from simple photos.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in opacity-0" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
                        <Link href="/auth">
                            <Button size="lg" variant="premium" className="w-full sm:w-auto">
                                Start Free Analysis <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 bg-secondary/20">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">Why Sniff by Hatch?</h2>
                        <p className="text-muted-foreground max-w-xl mx-auto">
                            We bridge the gap between home care and veterinary visits using state-of-the-art AI technology.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="glass-panel p-6 rounded-2xl hover:border-cyan-500/50 transition-colors">
                            <div className="h-12 w-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4">
                                <Brain className="h-6 w-6 text-cyan-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Vision + LLM AI</h3>
                            <p className="text-muted-foreground">
                                Our AI analyzes visual cues from photos (skin, teeth, wounds) and combines them with symptom history for accurate assessments.
                            </p>
                        </div>

                        <div className="glass-panel p-6 rounded-2xl hover:border-emerald-500/50 transition-colors">
                            <div className="h-12 w-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                                <Stethoscope className="h-6 w-6 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Vet-Verified</h3>
                            <p className="text-muted-foreground">
                                Developed with leading veterinarians to ensure medical relevance. Critical cases are flagged for immediate professional care.
                            </p>
                        </div>

                        <div className="glass-panel p-6 rounded-2xl hover:border-purple-500/50 transition-colors">
                            <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                                <Activity className="h-6 w-6 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Proactive Monitoring</h3>
                            <p className="text-muted-foreground">
                                Track your pet's health timeline. Detect subtle changes early before they become serious issues.
                            </p>
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
                                Privacy First, <br />
                                <span className="text-cyan-400">Security Always</span>
                            </h2>
                            <p className="text-muted-foreground mb-6">
                                Your pet's health data is sensitive. We treat it that way.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-center">
                                    <ShieldCheck className="h-5 w-5 text-emerald-400 mr-3" />
                                    <span>Encrypted data transmission and storage</span>
                                </li>
                                <li className="flex items-center">
                                    <ShieldCheck className="h-5 w-5 text-emerald-400 mr-3" />
                                    <span>Minimal data collection policy</span>
                                </li>
                                <li className="flex items-center">
                                    <ShieldCheck className="h-5 w-5 text-emerald-400 mr-3" />
                                    <span>Transparent data deletion upon request</span>
                                </li>
                            </ul>
                        </div>
                        <div className="flex-1 relative h-[400px] w-full bg-gradient-to-tr from-cyan-900/20 to-purple-900/20 rounded-3xl border border-white/10 overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
                            <div className="relative z-10 glass-panel p-8 rounded-xl max-w-sm mx-4">
                                <div className="flex items-center mb-4">
                                    <div className="h-10 w-10 rounded-full bg-cyan-500 mr-3"></div>
                                    <div>
                                        <div className="font-bold">Dr. Ji-Se Seong</div>
                                        <div className="text-xs text-muted-foreground">Chief Veterinarian & Co-founder</div>
                                    </div>
                                </div>
                                <p className="text-sm italic">
                                    "Our goal isn't to replace vets, but to empower pet parents with professional-grade insights at home."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
