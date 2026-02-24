import { Button } from "@/components/ui/button";
import { ArrowRight, Box, Cpu, Activity, Zap } from "lucide-react";
import Link from "next/link";

export default function FemAiPage() {
    return (
        <div className="flex flex-col min-h-screen relative">
            {/* Coming Soon Overlay */}
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-2xl pointer-events-none">
                <div className="relative">
                    <div className="border-[12px] border-red-600/80 rounded-3xl px-16 py-10 rotate-[-15deg] flex flex-col items-center gap-2 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                        <span className="text-red-600/90 text-5xl md:text-7xl font-black tracking-tighter uppercase whitespace-nowrap">출시 예정</span>
                    </div>
                </div>
            </div>
            {/* Hero Section */}
            <section className="relative pt-32 pb-24 overflow-hidden bg-white">
                <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-blue-50 rounded-full blur-[100px] opacity-60 z-0"></div>
                <div className="container relative z-10 mx-auto px-4 text-center">
                    <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-600 mb-6 animate-fade-in shadow-sm">
                        <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
                        Industrial Innovation
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-gray-900 animate-fade-in">
                        Engineering Precision <br className="hidden md:block" />
                        Empowered by AI
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 animate-fade-in opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                        Accelerating engineering simulations by combining traditional Finite Element Method with deep learning acceleration.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in opacity-0" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
                        <Button size="lg" className="rounded-full bg-primary text-white hover:bg-primary/90 px-8 h-12 text-base shadow-lg shadow-blue-200/50" asChild>
                            <Link href="/auth?service=fem-ai">무료 시뮬레이션 시작하기</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 px-8 h-12 text-base" asChild>
                            <Link href="/auth?service=fem-ai">로그인</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Concept Section */}
            <section className="py-20 bg-secondary/10">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="relative h-[400px] rounded-3xl overflow-hidden glass-panel border-purple-500/20 flex items-center justify-center">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
                            <Box className="h-32 w-32 text-purple-500 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold mb-6">AI-Accelerated Simulation</h2>
                            <p className="text-muted-foreground mb-6">
                                Traditional FEM simulations are computationally expensive and time-consuming. Inova AI integrates Surrogate Models and Physics-Informed Neural Networks (PINNs) to provide near-instant results with high fidelity.
                            </p>
                            <div className="space-y-6">
                                <div className="flex items-start">
                                    <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center mr-4 shrink-0">
                                        <Zap className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Real-time Feedback</h4>
                                        <p className="text-sm text-muted-foreground">Instantaneous structural response analysis for design iteration.</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center mr-4 shrink-0">
                                        <Cpu className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Inverse Design AI</h4>
                                        <p className="text-sm text-muted-foreground">Automatically find optimal structures based on desired performance parameters.</p>
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
