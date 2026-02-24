import { Button } from "@/components/ui/button";
import { ArrowRight, Settings, Cpu, LineChart, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function WorkflowAutomationPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative pt-32 pb-24 overflow-hidden bg-white">
                <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-blue-50 rounded-full blur-[100px] opacity-60 z-0"></div>
                <div className="container relative z-10 mx-auto px-4 text-center">
                    <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-600 mb-6 animate-fade-in shadow-sm">
                        <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
                        업무자동화
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-gray-900 animate-fade-in">
                        AI-Powered <br className="hidden md:block" />
                        Workflow Automation
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 animate-fade-in opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                        Optimize your business processes with intelligent AI agents. Reduce repetitive tasks and focus on what matters most.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in opacity-0" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
                        <Button size="lg" className="rounded-full bg-primary text-white hover:bg-primary/90 px-8 h-12 text-base shadow-lg shadow-blue-200/50" asChild>
                            <Link href="mailto:contact@inovaai.ai">도입 문의하기</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Automation Features */}
            <section className="py-24 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                <Cpu className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">AI 에이전트</h3>
                            <p className="text-gray-600">
                                반복적인 업무를 지능적으로 처리하는 맞춤형 AI 에이전트를 구축합니다.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                <Settings className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">프로세스 최적화</h3>
                            <p className="text-gray-600">
                                비효율적인 업무 흐름을 분석하고 가장 효율적인 방식으로 자동화합니다.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                <LineChart className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">데이터 인사이트</h3>
                            <p className="text-gray-600">
                                자동화된 업무 성과를 실시간으로 모니터링하고 분석 리포트를 제공합니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
