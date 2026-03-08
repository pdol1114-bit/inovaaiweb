import { Button } from "@/components/ui/button";
import { Chrome, Apple, MessageCircle, Navigation2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { signIn } from "../../../../auth";
import { getTranslations } from "next-intl/server";

export default async function AuthPage({
    searchParams,
    params,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
    params: Promise<{ locale: string }>;
}) {
    const search = await searchParams;
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Auth" });
    const error = search?.error as string | undefined;

    // NextAuth throws "OAuthAccountNotLinked" when an email already exists in DB but with a different provider.
    const showAccountConflictError = error === "OAuthAccountNotLinked";
    return (
        <div className="flex flex-col min-h-screen items-center justify-center py-20 px-4 bg-gradient-to-b from-background to-blue-950/20">
            <div className="w-full max-w-md glass-panel p-8 rounded-3xl border-white/10 space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">{t("welcomeTitle")}</h1>
                    <p className="text-muted-foreground">{t("welcomeDesc")}</p>
                </div>

                {showAccountConflictError && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3 text-red-400">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-bold">{t("conflictErrorTitle")}</p>
                            <p>{t("conflictErrorDesc")}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 mt-8">
                    {/* Google */}
                    <form action={async () => {
                        "use server"
                        await signIn("google", { redirectTo: `/${locale}/auth/success` })
                    }}>
                        <Button type="submit" variant="outline" className="w-full h-12 text-base border-white/10 hover:bg-white/5 space-x-3 bg-white/5">
                            <Chrome className="h-5 w-5" />
                            <span>{t("google")}</span>
                        </Button>
                    </form>

                    {/* Apple */}
                    <form action={async () => {
                        "use server"
                        await signIn("apple", { redirectTo: `/${locale}/auth/success` })
                    }}>
                        <Button type="submit" variant="outline" className="w-full h-12 text-base border-white/10 hover:bg-white/5 space-x-3 bg-white/5">
                            <Apple className="h-5 w-5" />
                            <span>{t("apple")}</span>
                        </Button>
                    </form>

                    {/* Kakao */}
                    <form action={async () => {
                        "use server"
                        await signIn("kakao", { redirectTo: `/${locale}/auth/success` })
                    }}>
                        <Button type="submit" className="w-full h-12 text-base bg-[#FEE500] text-[#000000] hover:bg-[#FEE500]/90 space-x-3">
                            <MessageCircle className="h-5 w-5 fill-current" />
                            <span>{t("kakao")}</span>
                        </Button>
                    </form>

                    {/* Naver */}
                    <form action={async () => {
                        "use server"
                        await signIn("naver", { redirectTo: `/${locale}/auth/success` })
                    }}>
                        <Button type="submit" className="w-full h-12 text-base bg-[#03C75A] text-white hover:bg-[#03C75A]/90 space-x-3">
                            <Navigation2 className="h-5 w-5 fill-current" />
                            <span>{t("naver")}</span>
                        </Button>
                    </form>
                </div>

                <p className="text-center text-xs text-muted-foreground pt-4">
                    {t.rich("termsAgreement", {
                        terms: (chunks) => <Link href="#" className="underline hover:text-white transition-colors">{chunks}</Link>,
                        privacy: (chunks) => <Link href="#" className="underline hover:text-white transition-colors">{chunks}</Link>
                    })}
                </p>
            </div>
        </div>
    );
}
