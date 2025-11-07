import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Logo } from "@/components/Logo";
import { useFullPage, useCurrentUser } from "@/lib/hooks";
import { supClient } from "@/lib/supabase";
import { Eye, EyeOff, Loader2, AlertCircle, Info } from "lucide-react";

interface SignInForm {
    email: string;
    password: string;
}

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignInPage() {
    useFullPage(true);

    const router = useRouter();
    const user = useCurrentUser();

    const [form, setForm] = useState<SignInForm>({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [error, setError] = useState<string | undefined>(undefined);

    const inviteCode =
        (router.query["invite"] as string | undefined) ||
        (router.query["inviteCode"] as string | undefined) ||
        (router.query["invite-code"] as string | undefined);

    const redirectParam = (router.query["redirect"] as string | undefined) || undefined;

    const postSignInDestination = useMemo(() => {
        if (redirectParam) return redirectParam;
        if (inviteCode) return `/accept-account-invite/${inviteCode}`;
        return "/dashboard";
    }, [redirectParam, inviteCode]);

    useEffect(() => {
        setError(undefined);
    }, [form.email, form.password]);

    function validate(): boolean {
        const errs: { email?: string; password?: string } = {};
        if (!form.email.trim() || !isValidEmail(form.email.trim())) {
            errs.email = "Enter a valid email address.";
        }
        if (!form.password) {
            errs.password = "Enter your password.";
        }
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setError(undefined);
        try {
            const { error: signInError } = await supClient().auth.signInWithPassword({
                email: form.email.trim(),
                password: form.password,
            });
            if (signInError) {
                setError(signInError.message || "Invalid credentials. Please try again.");
                return;
            }
            // Success: navigate to redirect or invite continuation or dashboard
            await router.push(postSignInDestination);
        } catch (err: any) {
            setError(err?.message ?? "Unable to sign in. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // Loading user state
    if (user === null) {
        return (
            <div className="page--SignInPage">
                <div className="min-h-[75vh] grid place-items-center">
                    <div className="flex items-center gap-3 text-[var(--text-2)]">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    // Already signed in
    if (user !== undefined) {
        return (
            <div className="page--SignInPage">
                <div className="min-h-[80vh] grid place-items-center px-4">
                    <div className="card max-w-md w-full">
                        <div className="flex items-center gap-3 mb-2">
                            <Logo className="w-8 h-8" />
                            <div className="flex flex-col">
                                <div className="card-title">You’re already signed in</div>
                                <div className="card-subtitle">Continue to your account.</div>
                            </div>
                        </div>

                        {inviteCode && (
                            <div className="alert info mb-3">
                                <div className="flex items-start gap-2">
                                    <Info className="w-4 h-4 mt-0.5" />
                                    <div>
                                        <div className="font-semibold">Invitation detected</div>
                                        <div className="text-[var(--text-2)]">
                                            Continue to accept your invite.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <Link
                                    className="btn btn-secondary"
                                    href="/profile"
                                    title="View your profile"
                                >
                                    Open Profile
                                </Link>
                                <Link
                                    className="btn btn-primary"
                                    href={postSignInDestination}
                                    title="Continue"
                                >
                                    {inviteCode ? "Continue to Invitation" : "Go to Dashboard"}
                                </Link>
                            </div>

                            <div className="text-sm text-[var(--text-3)]">
                                Or
                                <button
                                    type="button"
                                    className="link ml-1"
                                    onClick={() => router.back()}
                                >
                                    go back
                                </button>
                                .
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Not signed in: show form
    const emailHelpId = "email-help";
    const passwordHelpId = "password-help";

    return (
        <div className="page--SignInPage">
            <div className="min-h-[80vh] grid place-items-center px-4">
                <div className="card max-w-md w-full">
                    <div className="flex items-center gap-3">
                        <Logo className="w-9 h-9" />
                        <div className="flex flex-col">
                            <div className="card-title">Sign in</div>
                            <div className="card-subtitle">Access your Decisioning Demo account</div>
                        </div>
                    </div>

                    {inviteCode && (
                        <div className="alert info mt-3">
                            <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 mt-0.5" />
                                <div>
                                    <div className="font-semibold">Invitation detected</div>
                                    <div className="text-[var(--text-2)]">
                                        Sign in to accept your invite. You’ll be redirected to the
                                        invitation page after authentication.
                                    </div>
                                    <div className="mt-2">
                                        <Link
                                            className="link"
                                            href={`/accept-account-invite/${inviteCode}`}
                                        >
                                            View invite details
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="alert mt-3">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 text-[var(--danger)]" />
                                <div>
                                    <div className="font-semibold">Sign-in error</div>
                                    <div className="text-[var(--text-2)]">{error}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <form className="mt-4 grid gap-3" onSubmit={onSubmit} noValidate>
                        <div className={`field ${fieldErrors.email ? "invalid" : ""}`}>
                            <label className="label" htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                className="input"
                                type="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, email: e.target.value }))
                                }
                                aria-invalid={!!fieldErrors.email}
                                aria-describedby={fieldErrors.email ? emailHelpId : undefined}
                                autoComplete="email"
                                inputMode="email"
                            />
                            {fieldErrors.email && (
                                <div id={emailHelpId} className="help-text">
                                    {fieldErrors.email}
                                </div>
                            )}
                        </div>

                        <div className={`field ${fieldErrors.password ? "invalid" : ""}`}>
                            <label className="label" htmlFor="password">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    className="input pr-10"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Your password"
                                    value={form.password}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, password: e.target.value }))
                                    }
                                    aria-invalid={!!fieldErrors.password}
                                    aria-describedby={
                                        fieldErrors.password ? passwordHelpId : undefined
                                    }
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-icon absolute right-1 top-1/2 -translate-y-1/2"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    onClick={() => setShowPassword((v) => !v)}
                                    tabIndex={0}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <div id={passwordHelpId} className="help-text">
                                    {fieldErrors.password}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary mt-1"
                            disabled={loading}
                            aria-busy={loading}
                        >
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                "Sign in"
                            )}
                        </button>

                        <div className="text-sm text-[var(--text-2)]">
                            Don’t have an account?{" "}
                            <Link className="link" href="/register">
                                Register
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}