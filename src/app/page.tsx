import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, ShieldCheck, Stethoscope, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-background to-background z-0" />
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-400 animate-fade-in">
            Innovating the Future with <br className="hidden md:block" />
            Artificial Intelligence
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
            Inova AI is at the forefront of technological transformation, delivering advanced solutions in pet health, pharmaceutical automation, and industrial FEM-AI integration.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in opacity-0" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
            <Link href="/sniff">
              <Button size="lg" variant="premium" className="w-full sm:w-auto">
                Discover Our Projects <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Our Core Businesses</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We leverage AI to solve complex challenges across multiple industries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-6 rounded-2xl hover:border-blue-500/50 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <Activity className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Pet Health AI</h3>
              <p className="text-muted-foreground">
                <img src="/logos/sniff-yellow.png" alt="Sniff by Hatch" className="h-5 w-auto mb-2" />
                A revolutionary AI platform for early detection of health issues in pets via visual analysis.
              </p>
              <Link href="/sniff" className="inline-flex items-center text-blue-400 mt-4 hover:underline">
                Learn more <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="glass-panel p-6 rounded-2xl hover:border-emerald-500/50 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Pharma Automation</h3>
              <p className="text-muted-foreground">
                Optimizing Pharmaceutical CSV workflows and manufacturing processes through intelligent automation.
              </p>
              <Link href="/automation" className="inline-flex items-center text-emerald-400 mt-4 hover:underline">
                Learn more <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            <div className="glass-panel p-6 rounded-2xl hover:border-purple-500/50 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">FEM & AI</h3>
              <p className="text-muted-foreground">
                Integrating Finite Element Method with AI to accelerate industrial design and simulation accuracy.
              </p>
              <Link href="/fem-ai" className="inline-flex items-center text-purple-400 mt-4 hover:underline">
                Learn more <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
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
                Pioneering <br />
                <span className="text-blue-400">AI Excellence</span>
              </h2>
              <p className="text-muted-foreground mb-6">
                At Inova AI, we combine domain expertise with cutting-edge artificial intelligence to transform industries.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 mr-3" />
                  <span>Secure & Reliable Industrial Solutions</span>
                </li>
                <li className="flex items-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 mr-3" />
                  <span>Scalable AI Infrastructure</span>
                </li>
                <li className="flex items-center">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 mr-3" />
                  <span>Expert-in-the-loop Validation</span>
                </li>
              </ul>
            </div>
            <div className="flex-1 relative h-[400px] w-full bg-gradient-to-tr from-blue-900/20 to-purple-900/20 rounded-3xl border border-white/10 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
              <div className="relative z-10 glass-panel p-8 rounded-xl max-w-sm mx-4">
                <p className="text-lg font-bold mb-2 text-white">Our Mission</p>
                <p className="text-sm italic text-gray-300">
                  "To push the boundaries of what's possible with AI, creating tangible value for businesses and individuals alike."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-white/5 bg-gradient-to-b from-background to-blue-950/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Shape the Future with Inova AI</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-10">
            Join us in our journey to redefine industries through intelligent technology and innovative solutions.
          </p>
          <Link href="/auth">
            <Button size="lg" variant="premium" className="px-12">
              Join Us Now
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
