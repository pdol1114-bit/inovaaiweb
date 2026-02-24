import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, ShieldCheck, Stethoscope, Activity } from "lucide-react";
import Link from "next/link";

export default function SniffPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative pt-32 pb-24 overflow-hidden bg-white">
                <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-yellow-50 rounded-full blur-[100px] opacity-60 z-0"></div>
                <div className="container relative z-10 mx-auto px-4 text-center">
                    <div className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-sm text-yellow-700 mb-6 animate-fade-in shadow-sm">
                        <span className="flex h-2 w-2 rounded-full bg-yellow-400 mr-2"></span>
                        Project: <img src="/logos/sniff-yellow.png" alt="Sniff by Hatch" className="h-4 w-auto inline-block ml-2" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-gray-900 animate-fade-in">
                        AI-Powered Health Analysis <br className="hidden md:block" />
                        for Your Beloved Pets
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 animate-fade-in opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                        Sniff by Hatch uses advanced visual recognition AI to monitor your pet's health. Simply take a photo and get instant insights into their well-being.
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
            <section className="py-24 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1">
                            <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl">
                                <div className="absolute inset-0 bg-blue-600 flex items-center justify-center text-white text-4xl font-bold">
                                    AI SCAN PREVIEW
                                </div>
                            </div>
                        </div>
                        <div className="order-1 md:order-2">
                            <h2 className="text-3xl font-bold mb-6 text-gray-900">How it Works</h2>
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 font-bold">1</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Snap a Photo</h4>
                                        <p className="text-gray-600">Take a clear picture of your pet's nose or eyes.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 shrink-0 font-bold">2</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">AI Analysis</h4>
                                        <p className="text-gray-600">Our deep learning model analyzes patterns and biomechanics.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0 font-bold">3</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">Get Results</h4>
                                        <p className="text-gray-600">Receive a detailed health status and recommendation within seconds.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
