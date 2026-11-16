import type { Metadata } from "next";
import { Apple, AlertCircle, ArrowLeft, Chrome } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { signInFemWithApple, signInFemWithGoogle } from "@/app/actions/fem-auth";
import { femSupabaseConfig } from "@/utils/supabase/fem-config";

type Props = {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "FemAuth" });
    return { title: t("metaTitle"), robots: { index: false } };
}

/** FEM 회원 가입·로그인. Sniff 계정과는 별개의 FEM 전용 계정이다. */
export default async function FemAuthPage({ params, searchParams }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("FemAuth");
    const error = (await searchParams)?.error;
    const available = femSupabaseConfig() !== null;

    return (
        <div className="flex flex-col min-h-screen items-center justify-center py-20 px-4 bg-gradient-to-b from-background to-blue-950/20">
            <div className="w-full max-w-md glass-panel p-8 rounded-3xl border-white/10 space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground">{t("desc")}</p>
                    <p className="text-sm text-muted-foreground">{t("separateNotice")}</p>
                </div>

                {(error || !available) && (
                    <div role="alert" className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3 text-red-400">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <p className="text-sm">{!available || error === "unavailable" ? t("unavailable") : t("failed")}</p>
                    </div>
                )}

                {available && (
                    <div className="grid grid-cols-1 gap-4 mt-8">
                        <form action={async () => {
                            "use server"
                            await signInFemWithGoogle(locale)
                        }}>
                            <Button type="submit" variant="outline" className="w-full h-12 text-base border-white/10 hover:bg-white/5 space-x-3 bg-white/5">
                                <Chrome className="h-5 w-5" />
                                <span>{t("google")}</span>
                            </Button>
                        </form>
                        {process.env.FEM_APPLE_LOGIN_ENABLED === "true" && <form action={async () => {
                            "use server"
                            await signInFemWithApple(locale)
                        }}>
                            <Button type="submit" variant="outline" className="w-full h-12 text-base border-white/10 hover:bg-white/5 space-x-3 bg-white/5">
                                <Apple className="h-5 w-5" />
                                <span>{t("apple")}</span>
                            </Button>
                        </form>}
                    </div>
                )}

                <p className="text-center text-sm text-muted-foreground">{t("fileNotice")}</p>
                <p className="text-center text-xs text-muted-foreground">
                    {t.rich("termsAgreement", {
                        terms: (chunks) => <Link href="/terms" className="underline hover:text-white transition-colors">{chunks}</Link>,
                        privacy: (chunks) => <Link href="/privacy" className="underline hover:text-white transition-colors">{chunks}</Link>,
                    })}
                </p>
                <p className="text-center text-sm">
                    <Link href="/fem-ai" className="inline-flex items-center gap-1 underline hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4" />{t("back")}
                    </Link>
                </p>
            </div>
        </div>
    );
}
