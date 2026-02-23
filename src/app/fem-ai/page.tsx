import { Button } from "@/components/ui/button";
import { ArrowRight, Box, Cpu, Activity, Zap } from "lucide-react";
import Link from "next/link";

export default function FemAiPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative py-20 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-background to-background z-0" />
                <div className="container relative z-10 mx-auto px-4 text-center">
                    <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-400 mb-6 animate-fade-in">
                        <span className="flex h-2 w-2 rounded-full bg-purple-400 mr-2"></span>
                        FEM & AI Integration
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-purple-400 animate-fade-in">
                        Engineering Precision <br className="hidden md:block" />
                        Empowered by AI
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                        Combining Finite Element Method (FEM) with neural networks to revolutionize structural analysis and industrial simulation.
                    </p>
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
