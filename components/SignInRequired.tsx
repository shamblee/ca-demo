import Link from "next/link";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/util";
import { LogIn } from "lucide-react";

export interface SignInRequiredProps {
    /**
     * A message to display to the user
     */
    message?: string;
    className?: string;
}

export function SignInRequired({ message, className }: SignInRequiredProps) {
    const finalMessage = message ?? "Please sign in to continue.";

    return (
        <section
            className={cn(
                "card max-w-[560px] mx-auto",
                className
            )}
            role="region"
            aria-labelledby="sign-in-required-title"
        >
            <div className="card-header">
                <div className="flex items-center gap-2">
                    <Logo className="w-7 h-7" />
                    <h2 id="sign-in-required-title" className="card-title">
                        Sign-in required
                    </h2>
                </div>
            </div>

            <div className="space-y-3">
                <p className="card-subtitle">{finalMessage}</p>
            </div>

            <div className="card-footer">
                <Link href="/sign-in" className="btn btn-primary">
                    <LogIn className="w-4 h-4 mr-2" aria-hidden="true" />
                    Sign in
                </Link>
                <Link href="/register" className="link">
                    Create an account
                </Link>
            </div>
        </section>
    );
}