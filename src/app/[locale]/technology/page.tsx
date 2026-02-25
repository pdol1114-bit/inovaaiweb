import { Badge } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TechnologyPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Tech Hero */}
            <section className="py-20 bg-background text-center">
                <div className="container mx-auto px-4">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">Built on Cutting-Edge AI</h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
                        We combine state-of-the-art Computer Vision with Large Language Models to simulate a veterinary consultation.
                    </p>
                </div>
            </section>

            {/* Tech Stack Grid */}
            <section className="py-20 bg-secondary/10">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Vision Model */}
                        <div className="p-8 rounded-2xl bg-card border border-white/5">
                            <h3 className="text-2xl font-bold mb-4 text-cyan-400">Computer Vision</h3>
                            <p className="text-muted-foreground mb-4">
                                Our fine-tuned CNN/Transformer hybrid models are trained on a proprietary dataset of dermatological and dental conditions in dogs and cats.
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                                <li>Lesion localization and segmentation</li>
                                <li>Severity classification (mild, moderate, severe)</li>
                                <li>Real-time inference on edge devices (planned)</li>
                            </ul>
                        </div>

                        {/* LLM */}
                        <div className="p-8 rounded-2xl bg-card border border-white/5">
                            <h3 className="text-2xl font-bold mb-4 text-purple-400">Large Language Models (LLM)</h3>
                            <p className="text-muted-foreground mb-4">
                                We use advanced LLMs to conduct dynamic medical interviews (anamnesis) and synthesize visual findings into a coherent report.
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                                <li>Context-aware follow-up questions</li>
                                <li>Medical jargon translation for pet owners</li>
                                <li>Multi-turn dialogue management</li>
                            </ul>
                        </div>

                        {/* Backend */}
                        <div className="p-8 rounded-2xl bg-card border border-white/5">
                            <h3 className="text-2xl font-bold mb-4 text-emerald-400">Robust Backend</h3>
                            <p className="text-muted-foreground mb-4">
                                Powered by FastAPI and microservices architecture to ensure low-latency responses and high availability.
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300">FastAPI</span>
                                <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300">Python</span>
                                <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300">TorchServe</span>
                                <span className="px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-300">React Native</span>
                            </div>
                        </div>

                        {/* Security */}
                        <div className="p-8 rounded-2xl bg-card border border-white/5">
                            <h3 className="text-2xl font-bold mb-4 text-orange-400">Data Privacy</h3>
                            <p className="text-muted-foreground mb-4">
                                We adhere to strict data privacy standards. Images are processed anonymously where possible, and personal data is encrypted at rest and in transit.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Patent Section */}
            <section className="py-20">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="border border-cyan-500/30 bg-cyan-950/10 rounded-xl p-8 md:p-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Badge className="h-32 w-32" />
                        </div>
                        <h2 className="text-3xl font-bold mb-6">Intellectual Property</h2>
                        <p className="text-lg mb-8 text-muted-foreground">
                            INOVA.AI has secured patents for our core technology, protecting our unique approach to combining biosignals with questionnaire data.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-semibold text-cyan-400 mb-2">Patent Pending</h4>
                                <div className="text-sm space-y-1 text-muted-foreground">
                                    <p><span className="font-medium text-white">App. No:</span> EPA-2025-0137</p>
                                    <p><span className="font-medium text-white">Date:</span> 2025-08-20</p>
                                    <p><span className="font-medium text-white">Inventors:</span> Ji-Se Seong, Yu-Seok Kang</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-cyan-400 mb-2">Title</h4>
                                <p className="text-sm text-muted-foreground italic">
                                    "AI-based Pet Health Assessment System using Questionnaire and Biosignals"
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    (인공지능 기반 반려동물 건강 상태 분석 시스템)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20 text-center">
                <Link href="/pricing">
                    <Button size="lg" variant="default" className="bg-white text-black hover:bg-zinc-200">
                        See the Tech in Action
                    </Button>
                </Link>
            </section>
        </div>
    );
}
