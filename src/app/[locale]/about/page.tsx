import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, GraduationCap, Heart, MapPin } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* About Hero */}
            <section className="py-20 md:py-32 bg-background relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 animate-pulse">
                    <Heart className="h-64 w-64 text-pink-500" />
                </div>
                <div className="container mx-auto px-4 relative z-10">
                    <h1 className="text-4xl md:text-6xl font-bold mb-8">
                        We are <span className="text-cyan-400">INOVA.AI</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl leading-relaxed">
                        An AI-native startup redefining pet healthcare. We bridge the gap between technology and veterinary medicine to bring professional-grade care into every home.
                    </p>
                </div>
            </section>

            {/* Mission/Vision */}
            <section className="py-20 bg-secondary/10">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        <div>
                            <h3 className="text-xs font-semibold tracking-wider text-cyan-500 uppercase mb-2">Our Mission</h3>
                            <h2 className="text-3xl font-bold mb-6">Democratizing Pet Health</h2>
                            <p className="text-muted-foreground mb-4">
                                Detecting health issues early is the key to longevity. We believe every pet owner deserves access to immediate, accurate health insights without waiting for an appointment.
                            </p>
                            <p className="text-muted-foreground">
                                By combining advanced computer vision with the knowledge of experienced veterinarians, we create a safety net that never sleeps.
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                                    <GraduationCap className="h-6 w-6 text-cyan-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold mb-1">Vet-Led Innovation</h4>
                                    <p className="text-sm text-muted-foreground">Co-founded by a practicing veterinarian (DVM) to ensure clinical validity in every algorithm we build.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <Heart className="h-6 w-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold mb-1">Pet-Centric Design</h4>
                                    <p className="text-sm text-muted-foreground">Everything we build focuses on the comfort and well-being of the animal, minimizing stress and maximizing care.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Roadmap */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-16">Our Journey & Future</h2>

                    <div className="relative border-l border-white/10 ml-4 md:ml-auto md:mr-auto md:w-2/3 pl-8 space-y-12">

                        <div className="relative">
                            <div className="absolute -left-[39px] h-5 w-5 rounded-full bg-cyan-500 border-4 border-background"></div>
                            <h3 className="text-xl font-bold text-cyan-400 mb-2">NOW: Core Analysis</h3>
                            <p className="text-muted-foreground mb-4">
                                Launch of Sniff by Hatch beta.
                            </p>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li className="flex items-center"><CheckCircle2 className="h-3 w-3 mr-2" /> Dermatology & Dental visual analysis</li>
                                <li className="flex items-center"><CheckCircle2 className="h-3 w-3 mr-2" /> Basic AI triage chatbot</li>
                            </ul>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-[39px] h-5 w-5 rounded-full bg-slate-700 border-4 border-background"></div>
                            <h3 className="text-xl font-bold text-white mb-2">Q4 2025: AI Charting</h3>
                            <p className="text-muted-foreground mb-4">
                                Automating the paperwork for vets and owners.
                            </p>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                <li className="flex items-center"><ChevronRight className="h-3 w-3 mr-2" /> Auto-generation of medical notes</li>
                                <li className="flex items-center"><ChevronRight className="h-3 w-3 mr-2" /> Visual timeline of symptoms</li>
                            </ul>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-[39px] h-5 w-5 rounded-full bg-slate-700 border-4 border-background"></div>
                            <h3 className="text-xl font-bold text-white mb-2">2026: Personalized Care Plans</h3>
                            <p className="text-muted-foreground">
                                Context-aware lifestyle and nutrition recommendations based on breed, age, and health history.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Office/Location */}
            <section className="py-20 bg-secondary/10 text-center">
                <div className="container mx-auto px-4">
                    <MapPin className="h-8 w-8 text-cyan-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Headquarters</h2>
                    <p className="text-muted-foreground">Seoul, South Korea</p>
                    <div className="mt-8">
                        <Link href="mailto:support@inovaai.ai">
                            <Button variant="link" className="text-cyan-400">Contact Support &rarr;</Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
