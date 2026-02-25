import { Button } from "@/components/ui/button";
import { Chrome, Apple, MessageCircle, Navigation2 } from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
    return (
        <div className="flex flex-col min-h-screen items-center justify-center py-20 px-4 bg-gradient-to-b from-background to-blue-950/20">
            <div className="w-full max-w-md glass-panel p-8 rounded-3xl border-white/10 space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
                    <p className="text-muted-foreground">Sign in to your Inova AI account</p>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-8">
                    {/* Google */}
                    <Button variant="outline" className="h-12 text-base border-white/10 hover:bg-white/5 space-x-3 bg-white/5">
                        <Chrome className="h-5 w-5" />
                        <span>Continue with Google</span>
                    </Button>

                    {/* Apple */}
                    <Button variant="outline" className="h-12 text-base border-white/10 hover:bg-white/5 space-x-3 bg-white/5">
                        <Apple className="h-5 w-5" />
                        <span>Continue with Apple</span>
                    </Button>

                    {/* Kakao */}
                    <Button className="h-12 text-base bg-[#FEE500] text-[#000000] hover:bg-[#FEE500]/90 space-x-3">
                        <MessageCircle className="h-5 w-5 fill-current" />
                        <span>Continue with Kakao</span>
                    </Button>

                    {/* Naver */}
                    <Button className="h-12 text-base bg-[#03C75A] text-white hover:bg-[#03C75A]/90 space-x-3">
                        <Navigation2 className="h-5 w-5 fill-current" />
                        <span>Continue with Naver</span>
                    </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground pt-4">
                    By continuing, you agree to Inova AI's <br />
                    <Link href="#" className="underline hover:text-white transition-colors">Terms of Service</Link> and <Link href="#" className="underline hover:text-white transition-colors">Privacy Policy</Link>
                </p>
            </div>
        </div>
    );
}
