import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Eye, EyeOff, CheckCircle2, MailCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useFullPage, useCurrentUser } from "@/lib/hooks";
import { supClient } from "@/lib/supabase";
import { cn } from "@/lib/util";

interface RegisterForm {
    name: string;
    email: string;
    accountName: string;
    password: string;
}

interface FormErrors {
    name?: string;
    email?: string;
    accountName?: string;
    password?: string;
    form?: string;
}

export default function RegisterPage() {
    useFullPage(true);

    const router = useRouter();
    const user = useCurrentUser();

    const [form, setForm] = useState<RegisterForm>({
        name: "",
        email: "",
        accountName: "",
        password: "",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState<"pending" | "email-confirm" | "signed-in">("pending");
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteCode, setInviteCode] = useState("");

    useEffect(() => {
        // If a query param pre-fills email or invite code
        const q = router.query;
        if (typeof q?.email === "string") {
            setForm((f) => ({ ...f, email: q.email! }));
        }
        if (typeof q?.invite === "string") {
            setInviteOpen(true);
            setInviteCode(q.invite!);
        }
    }, [router.query]);

    const validate = (): boolean => {
        const next: FormErrors = {};
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passMin = 8;

        if (!form.name.trim()) next.name = "Please enter your name.";
        if (!form.email.trim()) next.email = "Please enter your email.";
        else if (!emailRe.test(form.email.trim())) next.email = "Please enter a valid email address.";
        if (!form.accountName.trim()) next.accountName = "Please enter your organization name.";
        if (!form.password) next.password = "Please enter a password.";
        else if (form.password.length < passMin) next.password = `Password must be at least ${passMin} characters.`;

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        setErrors((p) => ({ ...p, form: undefined }));

        try {
            const { data, error } = await supClient().auth.signUp({
                email: form.email.trim(),
                password: form.password,
                options: {
                    data: {
                        name: form.name.trim(),
                        accountName: form.accountName.trim(),
                    },
                },
            });

            if (error) {
                setErrors((p) => ({ ...p, form: error.message || "Registration failed. Please try again." }));
                setSubmitting(false);
                return;
            }

            // If session exists, user is signed in; otherwise, email confirmation is required
            if (data?.session) {
                setSuccess("signed-in");
                // Route after a short delay to provide feedback
                setTimeout(() => {
                    router.replace("/dashboard");
                }, 700);
            } else {
                setSuccess("email-confirm");
            }
        } catch (err: any) {
            setErrors((p) => ({ ...p, form: err?.message ?? "An unexpected error occurred." }));
        } finally {
            setSubmitting(false);
        }
    };

    // Loading state while auth is resolving
    if (user === null) {
        return (
            <div className="page--RegisterPage min-h-screen flex items-center justify-center">
                <div className="card w-full max-w-md p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Logo className="w-6 h-6" />
                        <div className="font-semibold">Decisioning Demo</div>
                    </div>
                    <div className="space-y-2">
                        <div className="skeleton h-9 rounded" />
                        <div className="skeleton h-9 rounded" />
                        <div className="skeleton h-9 rounded" />
                    </div>
                    <div className="mt-4 text-[var(--text-3)] text-sm">Loading...</div>
                </div>
            </div>
        );
    }

    // Already signed in
    if (user) {
        return (
            <div className="page--RegisterPage min-h-screen flex items-center justify-center">
                <div className="card w-full max-w-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Logo className="w-7 h-7" />
                        <div className="text-lg font-semibold">You're already registered</div>
                    </div>

                    <div className="alert info">
                        <div className="font-medium">Signed in as {user.email}</div>
                        <div className="text-[var(--text-2)]">
                            You’re already signed in. Continue to your profile or head to the dashboard.
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        <Link href="/profile" className="btn btn-primary">
                            Go to Profile
                        </Link>
                        <Link href="/dashboard" className="btn btn-secondary">
                            Open Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Success states
    if (success !== "pending") {
        const isEmailConfirm = success === "email-confirm";
        return (
            <div className="page--RegisterPage min-h-screen flex items-center justify-center">
                <div className="card w-full max-w-lg p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Logo className="w-7 h-7" />
                        <div className="text-lg font-semibold">Registration complete</div>
                    </div>

                    <div className="mt-2 flex items-start gap-3">
                        {isEmailConfirm ? (
                            <MailCheck className="w-6 h-6 text-[var(--purple)] mt-0.5" />
                        ) : (
                            <CheckCircle2 className="w-6 h-6 text-[var(--success)] mt-0.5" />
                        )}
                        <div className="space-y-1">
                            <div className="font-medium">
                                {isEmailConfirm ? "Confirm your email" : "You’re all set"}
                            </div>
                            {isEmailConfirm ? (
                                <div className="text-[var(--text-2)]">
                                    We’ve sent a confirmation link to {form.email.trim()}. Open the link to finish
                                    setting up your account, then sign in.
                                </div>
                            ) : (
                                <div className="text-[var(--text-2)]">
                                    Your account is ready. Redirecting you to the dashboard...
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {isEmailConfirm ? (
                            <>
                                <Link href="/sign-in" className="btn btn-primary">
                                    Go to Sign-in
                                </Link>
                                <Link href="/dashboard" className="btn btn-secondary">
                                    Back to Home
                                </Link>
                            </>
                        ) : (
                            <Link href="/dashboard" className="btn btn-primary">
                                Open Dashboard
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Default: registration form
    const emailErrorId = useMemo(() => (errors.email ? "register-email-error" : undefined), [errors.email]);
    const nameErrorId = useMemo(() => (errors.name ? "register-name-error" : undefined), [errors.name]);
    const orgErrorId = useMemo(() => (errors.accountName ? "register-org-error" : undefined), [errors.accountName]);
    const passErrorId = useMemo(() => (errors.password ? "register-pass-error" : undefined), [errors.password]);

    return (
        <div className="page--RegisterPage min-h-screen flex items-center justify-center">
            <div className="w-full max-w-md">
                <div className="card p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Logo className="w-7 h-7" />
                            <div className="font-semibold">Create your account</div>
                        </div>
                        <div className="text-sm text-[var(--text-3)]">Decisioning Demo</div>
                    </div>

                    <form className="mt-4 grid gap-3" onSubmit={onSubmit} noValidate>
                        {errors.form && (
                            <div role="alert" aria-live="polite" className="alert info">
                                <div className="font-medium">We couldn’t complete your registration</div>
                                <div className="text-[var(--text-2)]">{errors.form}</div>
                            </div>
                        )}

                        <div className={cn("field", errors.name && "invalid")}>
                            <label htmlFor="reg-name" className="label">
                                Name
                            </label>
                            <input
                                id="reg-name"
                                className="input"
                                placeholder="Your full name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                autoComplete="name"
                                aria-invalid={!!errors.name}
                                aria-describedby={nameErrorId}
                                required
                            />
                            {errors.name && (
                                <div id={nameErrorId} className="help-text">
                                    {errors.name}
                                </div>
                            )}
                        </div>

                        <div className={cn("field", errors.email && "invalid")}>
                            <label htmlFor="reg-email" className="label">
                                Email
                            </label>
                            <input
                                id="reg-email"
                                className="input"
                                type="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                autoComplete="email"
                                aria-invalid={!!errors.email}
                                aria-describedby={emailErrorId}
                                required
                            />
                            {errors.email && (
                                <div id={emailErrorId} className="help-text">
                                    {errors.email}
                                </div>
                            )}
                        </div>

                        <div className={cn("field", errors.accountName && "invalid")}>
                            <label htmlFor="reg-org" className="label">
                                Organization name
                            </label>
                            <input
                                id="reg-org"
                                className="input"
                                placeholder="e.g., GardenIQ Labs"
                                value={form.accountName}
                                onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                                aria-invalid={!!errors.accountName}
                                aria-describedby={orgErrorId ? `${orgErrorId} reg-org-help` : "reg-org-help"}
                                required
                            />
                            <div id="reg-org-help" className="help-text">
                                This creates your workspace (tenant). You can add teammates later.
                            </div>
                            {errors.accountName && (
                                <div id={orgErrorId} className="help-text">
                                    {errors.accountName}
                                </div>
                            )}
                        </div>

                        <div className={cn("field", errors.password && "invalid")}>
                            <label htmlFor="reg-password" className="label">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="reg-password"
                                    className="input pr-10"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Create a password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    autoComplete="new-password"
                                    aria-invalid={!!errors.password}
                                    aria-describedby={passErrorId}
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-icon absolute right-1 top-1/2 -translate-y-1/2"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    onClick={() => setShowPassword((v) => !v)}
                                    tabIndex={0}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <div id={passErrorId} className="help-text">
                                    {errors.password}
                                </div>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary mt-1" disabled={submitting} aria-busy={submitting}>
                            {submitting ? "Creating account..." : "Register"}
                        </button>

                        <div className="flex items-center justify-between mt-1 text-sm">
                            <div className="text-[var(--text-3)]">
                                Already have an account?{" "}
                                <Link href="/sign-in" className="link">
                                    Sign in
                                </Link>
                            </div>
                            <button
                                type="button"
                                className="link"
                                onClick={() => setInviteOpen((o) => !o)}
                                aria-expanded={inviteOpen}
                                aria-controls="invite-code-panel"
                            >
                                Have an invite code?
                            </button>
                        </div>

                        {inviteOpen && (
                            <div id="invite-code-panel" className="mt-2 p-3 rounded-[var(--radius)] highlight">
                                <div className="flex items-end gap-2">
                                    <div className="field flex-1">
                                        <label htmlFor="invite-code" className="label">
                                            Invite code
                                        </label>
                                        <input
                                            id="invite-code"
                                            className="input"
                                            placeholder="Paste invite code"
                                            value={inviteCode}
                                            onChange={(e) => setInviteCode(e.target.value)}
                                        />
                                        <div className="help-text">
                                            Invite links look like /accept-account-invite/[invite-code]
                                        </div>
                                    </div>
                                    <Link
                                        href={
                                            inviteCode.trim()
                                                ? `/accept-account-invite/${encodeURIComponent(inviteCode.trim())}`
                                                : "#"
                                        }
                                        onClick={(e) => {
                                            if (!inviteCode.trim()) e.preventDefault();
                                        }}
                                        className={cn("btn", inviteCode.trim() ? "btn-secondary" : "btn-secondary disabled")}
                                        aria-disabled={!inviteCode.trim()}
                                    >
                                        Open
                                    </Link>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}