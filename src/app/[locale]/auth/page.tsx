import { Button } from "@/components/ui/button";
import { Chrome, Apple, MessageCircle, Navigation2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { signIn } from "../../../../auth";

export default async function AuthPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const search = await searchParams;
    const error = search?.error as string | undefined;

    // NextAuth throws "OAuthAccountNotLinked" when an email already exists in DB but with a different provider.
    const showAccountConflictError = error === "OAuthAccountNotLinked";
    return (
        <div className="flex flex-col min-h-screen items-center justify-center py-20 px-4 bg-gradient-to-b from-background to-blue-950/20">
            <div className="w-full max-w-md glass-panel p-8 rounded-3xl border-white/10 space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
                    <p className="text-muted-foreground">Sign in to your Inova AI account</p>
                </div>

                {showAccountConflictError && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3 text-red-400">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-bold">이미 다른 SNS로 가입된 이메일입니다.</p>
                            <p>기존에 가입하셨던 SNS 계정(예: 구글 등)으로 다시 로그인해주세요.</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 mt-8">
                    {/* Google */}
                    <form action={async () => {
                        "use server"
                        await signIn("google")
                    }}>
                        <Button type="submit" variant="outline" className="w-full h-12 text-base border-white/10 hover:bg-white/5 space-x-3 bg-white/5">
                            <Chrome className="h-5 w-5" />
                            <span>Continue with Google</span>
                        </Button>
                    </form>

                    {/* Apple */}
                    <form action={async () => {
                        "use server"
                        await signIn("apple")
                    }}>
                        <Button type="submit" variant="outline" className="w-full h-12 text-base border-white/10 hover:bg-white/5 space-x-3 bg-white/5">
                            <Apple className="h-5 w-5" />
                            <span>Continue with Apple</span>
                        </Button>
                    </form>

                    {/* Kakao */}
                    <form action={async () => {
                        "use server"
                        await signIn("kakao")
                    }}>
                        <Button type="submit" className="w-full h-12 text-base bg-[#FEE500] text-[#000000] hover:bg-[#FEE500]/90 space-x-3">
                            <MessageCircle className="h-5 w-5 fill-current" />
                            <span>Continue with Kakao</span>
                        </Button>
                    </form>

                    {/* Naver */}
                    <form action={async () => {
                        "use server"
                        await signIn("naver")
                    }}>
                        <Button type="submit" className="w-full h-12 text-base bg-[#03C75A] text-white hover:bg-[#03C75A]/90 space-x-3">
                            <Navigation2 className="h-5 w-5 fill-current" />
                            <span>Continue with Naver</span>
                        </Button>
                    </form>
                </div>

                <p className="text-center text-xs text-muted-foreground pt-4">
                    By continuing, you agree to Inova AI&apos;s <br />
                    <Link href="#" className="underline hover:text-white transition-colors">Terms of Service</Link> and <Link href="#" className="underline hover:text-white transition-colors">Privacy Policy</Link>
                </p>
            </div>
        </div>
    );
}
