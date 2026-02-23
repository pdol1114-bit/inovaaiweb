import { Button } from "@/components/ui/button";
import { ArrowRight, Settings, FileText, CheckCircle, Zap } from "lucide-react";
import Link from "next/link";

export default function AutomationPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative py-20 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-background to-background z-0" />
                <div className="container relative z-10 mx-auto px-4 text-center">
                    <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400 mb-6 animate-fade-in">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 mr-2"></span>
                        Workflow Automation & Pharma CSV
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-emerald-400 animate-fade-in">
                        Accelerating Pharmaceutical <br className="hidden md:block" />
                        Compliance with AI
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                        Streamline your Computer System Validation (CSV) processes and pharmaceutical manufacturing workflows through intelligent automation.
                    </p>
                </div>
            </section>

            {/* Pharma CSV Section */}
            <section className="py-20 bg-secondary/10">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold mb-6">Pharmaceutical CSV Solutions</h2>
                            <p className="text-muted-foreground mb-6">
                                Computer System Validation (CSV) is critical for regulatory compliance in the pharmaceutical industry.
                                Our AI-driven approach minimizes manual document effort and ensures GxP compliance.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "Automated Validation Documents Generation",
                                    "Risk-based CSV Assessment",
                                    "Real-time Compliance Monitoring",
                                    "Seamless Integration with Manufacturing Systems"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center">
                                        <CheckCircle className="h-5 w-5 text-emerald-500 mr-3" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            <div className="glass-panel p-6 rounded-2xl bg-emerald-500/5 border-emerald-500/20">
                                <FileText className="h-8 w-8 text-emerald-400 mb-4" />
                                <h3 className="font-bold mb-2">Smart Documentation</h3>
                                <p className="text-xs text-muted-foreground text-pretty">Generate IQ/OQ/PQ protocols automatically with deep learning.</p>
                            </div>
                            <div className="glass-panel p-6 rounded-2xl bg-blue-500/5 border-blue-500/20">
                                <Settings className="h-8 w-8 text-blue-400 mb-4" />
                                <h3 className="font-bold mb-2">Workflow Optimization</h3>
                                <p className="text-xs text-muted-foreground text-pretty">Identify bottlenecks in pharmaceutical manufacturing pipelines.</p>
                            </div>
                            <div className="glass-panel p-6 rounded-2xl bg-purple-500/5 border-purple-500/20">
                                <Zap className="h-8 w-8 text-purple-400 mb-4" />
                                <h3 className="font-bold mb-2">Rapid Deployment</h3>
                                <p className="text-xs text-muted-foreground text-pretty">Reduce validation cycle time by up to 60% with automated testing.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
