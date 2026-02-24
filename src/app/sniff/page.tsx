import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, ShieldCheck, Stethoscope, Activity } from "lucide-react";
import Link from "next/link";
import { QRBadge } from "@/components/ui/qr-badge";

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
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in opacity-0 mb-12" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
                        <Button size="lg" className="rounded-full bg-primary text-white hover:bg-primary/90 px-8 h-12 text-base shadow-lg shadow-blue-200/50" asChild>
                            <Link href="/auth?service=sniff">Get Started</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 px-8 h-12 text-base" asChild>
                            <Link href="/auth?service=sniff">Login</Link>
                        </Button>
                    </div>

                    <div className="flex flex-col items-center animate-fade-in opacity-0" style={{ animationDelay: "0.6s", animationFillMode: "forwards" }}>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Download the Sniff App</p>
                        <div className="flex flex-wrap justify-center gap-6">
                            <QRBadge type="ios" url="https://apps.apple.com/kr/app/sniff-by-hatch/id6756805438" />
                            <QRBadge type="android" url="https://play.google.com/store/apps/details?id=com.kevinkang1114.sniff" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust/Safety Section (How it Works) */}
            <section className="py-24 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <div className="relative aspect-[9/19] rounded-2xl overflow-hidden shadow-xl border border-gray-100">
                                        <img src="/images/IMG_1.PNG" alt="Sniff Splash" className="absolute inset-0 w-full h-full object-cover" />
                                    </div>
                                    <div className="relative aspect-[9/19] rounded-2xl overflow-hidden shadow-xl border border-gray-100">
                                        <img src="/images/IMG_6.PNG" alt="Sniff Survey" className="absolute inset-0 w-full h-full object-cover" />
                                    </div>
                                </div>
                                <div className="space-y-4 mt-8">
                                    <div className="relative aspect-[9/19] rounded-2xl overflow-hidden shadow-xl border border-gray-100">
                                        <img src="/images/IMG_2.PNG" alt="Sniff Guide" className="absolute inset-0 w-full h-full object-cover" />
                                    </div>
                                    <div className="relative aspect-[9/19] rounded-2xl overflow-hidden shadow-xl border border-gray-100">
                                        <img src="/images/IMG_5.PNG" alt="Sniff Result" className="absolute inset-0 w-full h-full object-cover" />
                                    </div>
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

            {/* Features Grid (Why Sniff by Hatch?) */}
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
        </div>
    );
}
