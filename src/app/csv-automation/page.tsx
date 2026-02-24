import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, CheckCircle, Zap, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function CSVAutomationPage() {
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
                <div className="absolute top-0 left-0 -ml-24 -mt-24 w-96 h-96 bg-blue-50 rounded-full blur-[100px] opacity-60 z-0"></div>
                <div className="container relative z-10 mx-auto px-4 text-center">
                    <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-600 mb-6 animate-fade-in shadow-sm">
                        <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2"></span>
                        CSV 자동화
                    </div>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-gray-900 animate-fade-in">
                        AI-Driven Pharmaceutical <br className="hidden md:block" />
                        CSV Solutions
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 animate-fade-in opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
                        Automate your Computer System Validation (CSV) workflows. Ensure GxP compliance with higher accuracy and significantly reduced manual effort.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in opacity-0" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
                        <Button size="lg" className="rounded-full bg-primary text-white hover:bg-primary/90 px-8 h-12 text-base shadow-lg shadow-blue-200/50" asChild>
                            <Link href="/auth?service=csv-automation">CSV 자동화 시작하기</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="rounded-full border-gray-200 text-gray-700 hover:bg-gray-50 px-8 h-12 text-base" asChild>
                            <Link href="/auth?service=csv-automation">관리자 로그인</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* CSV Features */}
            <section className="py-24 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                <FileText className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">문서 자동화</h3>
                            <p className="text-gray-600">
                                복잡한 CSV 산출물 문서를 AI를 통해 자동으로 생성하고 관리합니다.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">규제 준수</h3>
                            <p className="text-gray-600">
                                FDA, EMA 등 글로벌 규제 기관의 가이드라인을 100% 준수합니다.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                <Zap className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">검증 가속화</h3>
                            <p className="text-gray-600">
                                기존 수작업 대비 검증 시간을 최대 60% 이상 단축합니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
