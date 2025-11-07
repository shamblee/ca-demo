import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    useCurrentUser,
    useFileUrl,
    useStoreItem,
    useStoreFirstMatchingItem,
} from "@/lib/hooks";
import { store } from "@/lib/store";
import { app } from "@/lib/app";
import { supClient } from "@/lib/supabase";
import { cn } from "@/lib/util";
import {
    typeDefs,
    Account as AccountEntity,
    User as UserEntity,
    AccountInvite as AccountInviteEntity,
    AccountMembership as AccountMembershipEntity,
} from "@/lib/schema";
import { SignInRequired } from "@/components/SignInRequired";
import {
    AlertTriangle,
    Building2,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    ExternalLink,
    LogIn,
    Mail,
    Shield,
    UserCircle2,
    XCircle,
} from "lucide-react";

function formatDate(iso?: string) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    } catch {
        return iso;
    }
}

type InviteComputedStatus =
    | "loading"
    | "invalid"
    | "expired"
    | "inactive"
    | "accepted"
    | "declined"
    | "valid";

export default function AcceptAccountInvitePage() {
    const router = useRouter();
    const user = useCurrentUser();

    const inviteCodeParam = router.query["invite-code"];
    const inviteCode =
        typeof inviteCodeParam === "string"
            ? inviteCodeParam
            : Array.isArray(inviteCodeParam)
            ? inviteCodeParam[0]
            : undefined;

    const invite = useStoreFirstMatchingItem<AccountInviteEntity>(
        typeDefs.AccountInvite,
        inviteCode ? { invite_code: inviteCode } : null,
        { resetOnChange: true }
    );

    const account = useStoreItem<AccountEntity>(
        typeDefs.Account,
        invite && invite !== null ? invite.account_id : undefined,
        { resetOnChange: true }
    );

    const inviter = useStoreItem<UserEntity>(
        typeDefs.User,
        invite && invite !== null ? invite.invited_by_user_id : undefined,
        { resetOnChange: true }
    );

    const accountLogoUrl = useFileUrl(account?.logo_image_path);

    const [actionError, setActionError] = useState<string | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [declining, setDeclining] = useState(false);
    const [mismatchAcknowledged, setMismatchAcknowledged] = useState(false);

    // Determine membership only when we have both user and invite
    const membershipMatch =
        user && invite && invite !== null
            ? { user_id: user.id, account_id: invite.account_id }
            : null;

    const existingMembership = useStoreFirstMatchingItem<AccountMembershipEntity>(
        typeDefs.AccountMembership,
        membershipMatch,
        { resetOnChange: true }
    );

    const computedStatus: InviteComputedStatus = useMemo(() => {
        if (invite === null) return "loading";
        if (invite === undefined) return "invalid";
        const isAccepted = !!invite.accepted_at;
        const isDeclined = !!invite.declined_at;
        const expired =
            !!invite.expires_at && new Date(invite.expires_at).getTime() < Date.now();

        if (isAccepted) return "accepted";
        if (isDeclined) return "declined";
        if (expired) return "expired";
        if (!invite.is_active) return "inactive";
        return "valid";
    }, [invite]);

    const targetEmail = invite && invite !== null ? invite.email : undefined;
    const userEmail = user?.email;
    const emailMismatch =
        !!targetEmail && !!userEmail && targetEmail.toLowerCase() !== userEmail.toLowerCase();

    useEffect(() => {
        // Reset mismatch acknowledgement when invite or user changes
        setMismatchAcknowledged(false);
    }, [invite?.id, user?.id]);

    async function handleAccept() {
        setActionError(null);
        if (!invite || invite === null) return;
        if (!user) {
            setActionError("You must be signed in to accept this invite.");
            return;
        }
        if (emailMismatch && !mismatchAcknowledged) {
            setActionError(
                "This invite targets a different email. Confirm 'Continue anyway' or sign out to switch accounts."
            );
            return;
        }
        setAccepting(true);
        try {
            // Ensure membership exists (idempotent)
            const existing = await store().selectFirstMatchesAsync<AccountMembershipEntity>(
                typeDefs.AccountMembership,
                { user_id: user.id, account_id: invite.account_id }
            );

            if (!existing) {
                await store().insertAsync(typeDefs.AccountMembership, {
                    user_id: user.id,
                    account_id: invite.account_id,
                    role: invite.role || "standard",
                } as Partial<AccountMembershipEntity> as any);
            }

            // Mark invite accepted
            await store().updateAsync<AccountInviteEntity>(typeDefs.AccountInvite, invite.id, {
                accepted_at: new Date().toISOString(),
                is_active: false,
            });

            // Switch tenancy
            await app().switchAccountAsync(invite.account_id);
        } catch (err: any) {
            setActionError(
                err?.message || "Something went wrong while accepting the invite. Please try again."
            );
        } finally {
            setAccepting(false);
        }
    }

    async function handleDecline() {
        setActionError(null);
        if (!invite || invite === null) return;
        setDeclining(true);
        try {
            await store().updateAsync<AccountInviteEntity>(typeDefs.AccountInvite, invite.id, {
                declined_at: new Date().toISOString(),
                is_active: false,
            });
        } catch (err: any) {
            setActionError(
                err?.message || "Unable to decline the invite at this time. Please try again."
            );
        } finally {
            setDeclining(false);
        }
    }

    async function handleSignOutToSwitch() {
        try {
            await supClient().auth.signOut();
            const redirectUrl = router.asPath || `/accept-account-invite/${inviteCode ?? ""}`;
            router.push(`/sign-in?redirect=${encodeURIComponent(redirectUrl)}`);
        } catch {
            router.push("/sign-in");
        }
    }

    async function handleSwitchToAccount() {
        if (!invite || invite === null) return;
        try {
            await app().switchAccountAsync(invite.account_id);
            router.push("/dashboard");
        } catch (err: any) {
            setActionError(
                err?.message || "Unable to switch accounts right now. Please try again."
            );
        }
    }

    function copyInviteInfo() {
        const info = {
            invite_code: inviteCode,
            status: computedStatus,
            account_id: invite && invite !== null ? invite.account_id : undefined,
            target_email: targetEmail,
            role: invite && invite !== null ? invite.role : undefined,
            expires_at: invite && invite !== null ? invite.expires_at : undefined,
        };
        navigator.clipboard.writeText(JSON.stringify(info, null, 2)).catch(() => {});
    }

    const canAccept =
        computedStatus === "valid" &&
        !!user &&
        (!emailMismatch || mismatchAcknowledged) &&
        !accepting;

    const showSignInPrompt = user === undefined && computedStatus === "valid";

    return (
        <div className="page--AcceptAccountInvitePage container-page space-y-4">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-[var(--text-2)]" />
                    <h1 className="section-title text-xl">Accept Account Invite</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="btn btn-secondary btn-icon"
                        aria-label="Copy invite info"
                        onClick={copyInviteInfo}
                        title="Copy invite details (for support)"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    <Link href="/dashboard" className="btn btn-secondary">
                        Back to Dashboard
                    </Link>
                </div>
            </header>

            {/* Invite summary card */}
            <section className="card">
                <div className="card-header">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-[var(--surface-3)] overflow-hidden flex items-center justify-center">
                            {accountLogoUrl ? (
                                <img
                                    src={accountLogoUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Building2 className="w-5 h-5 text-[var(--text-3)]" />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <div className="card-title">
                                    {account?.name ?? "Account"}
                                </div>
                                {/* Role badge */}
                                {invite && invite !== null && invite.role && (
                                    <span className="badge accent uppercase">
                                        {invite.role}
                                    </span>
                                )}
                            </div>
                            <div className="card-subtitle text-[var(--text-3)]">
                                Invitation to join this account
                            </div>
                        </div>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                        <span
                            className={cn(
                                "badge",
                                computedStatus === "valid" && "brand",
                                computedStatus === "accepted" && "success",
                                computedStatus === "declined" && "danger",
                                (computedStatus === "expired" || computedStatus === "inactive") &&
                                    "warning"
                            )}
                        >
                            {computedStatus === "valid" && "Pending"}
                            {computedStatus === "accepted" && "Accepted"}
                            {computedStatus === "declined" && "Declined"}
                            {computedStatus === "expired" && "Expired"}
                            {computedStatus === "inactive" && "Inactive"}
                            {computedStatus === "invalid" && "Invalid"}
                            {computedStatus === "loading" && "Loading"}
                        </span>
                    </div>
                </div>

                {/* Loading skeleton */}
                {invite === null && (
                    <div className="space-y-3">
                        <div className="skeleton h-6 w-1/2" />
                        <div className="skeleton h-4 w-2/3" />
                        <div className="skeleton h-4 w-1/3" />
                    </div>
                )}

                {/* Invalid invite */}
                {computedStatus === "invalid" && (
                    <div className="space-y-3">
                        <div className="alert danger">
                            <div className="flex items-center gap-2 font-semibold">
                                <XCircle className="w-4 h-4" />
                                Invalid invite
                            </div>
                            <div className="text-[var(--text-2)]">
                                We couldn’t find an invite for this link. Contact the inviter for a
                                new link or ask them to generate a fresh invite.
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="btn btn-secondary" onClick={() => location.reload()}>
                                Retry
                            </button>
                            <Link className="btn btn-primary" href="/account">
                                Visit Account Settings
                            </Link>
                        </div>
                    </div>
                )}

                {/* Expired or inactive */}
                {(computedStatus === "expired" || computedStatus === "inactive") &&
                    invite &&
                    invite !== null && (
                        <div className="space-y-3">
                            <div className="alert warning">
                                <div className="flex items-center gap-2 font-semibold">
                                    <Clock className="w-4 h-4" />
                                    {computedStatus === "expired" ? "Invite expired" : "Invite inactive"}
                                </div>
                                <div className="text-[var(--text-2)]">
                                    {computedStatus === "expired" ? (
                                        <>
                                            This invite expired on{" "}
                                            <span className="font-medium">
                                                {formatDate(invite.expires_at)}
                                            </span>
                                            . Ask the inviter to send a new link.
                                        </>
                                    ) : (
                                        <>This invite is no longer active.</>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="btn btn-secondary" onClick={() => location.reload()}>
                                    Retry
                                </button>
                                <Link className="btn btn-primary" href="/sign-in">
                                    <LogIn className="w-4 h-4 mr-1" />
                                    Sign in
                                </Link>
                            </div>
                        </div>
                    )}

                {/* Accepted summary */}
                {computedStatus === "accepted" && (
                    <div className="space-y-3">
                        <div className="alert success">
                            <div className="flex items-center gap-2 font-semibold">
                                <CheckCircle2 className="w-4 h-4" />
                                You’ve joined this account
                            </div>
                            <div className="text-[var(--text-2)]">
                                Head to the dashboard or account page to get started.
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link className="btn btn-primary" href="/dashboard">
                                Go to Dashboard
                            </Link>
                            <Link className="btn btn-secondary" href="/account">
                                View Account
                            </Link>
                        </div>
                    </div>
                )}

                {/* Declined summary */}
                {computedStatus === "declined" && (
                    <div className="space-y-3">
                        <div className="alert">
                            <div className="flex items-center gap-2 font-semibold">
                                <XCircle className="w-4 h-4" />
                                Invite declined
                            </div>
                            <div className="text-[var(--text-2)]">
                                If this was a mistake, ask the inviter to send a new invite.
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link className="btn btn-secondary" href="/dashboard">
                                Back to Dashboard
                            </Link>
                        </div>
                    </div>
                )}

                {/* Valid invite summary details */}
                {(computedStatus === "valid" || showSignInPrompt) && invite && invite !== null && (
                    <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="p-3 rounded border border-[var(--border)]">
                                <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                                    <Shield className="w-4 h-4" />
                                    Role granted on accept
                                </div>
                                <div className="mt-1 font-medium uppercase">
                                    {invite.role || "standard"}
                                </div>
                            </div>
                            <div className="p-3 rounded border border-[var(--border)]">
                                <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                                    <UserCircle2 className="w-4 h-4" />
                                    Invited by
                                </div>
                                <div className="mt-1">
                                    {inviter ? (
                                        <Link
                                            className="link inline-flex items-center gap-1"
                                            href={`/profile/${inviter.id}`}
                                        >
                                            {inviter.name}
                                            <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    ) : (
                                        <span className="text-[var(--text-3)]">Unknown</span>
                                    )}
                                </div>
                            </div>
                            <div className="p-3 rounded border border-[var(--border)]">
                                <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                                    <Mail className="w-4 h-4" />
                                    Target email
                                </div>
                                <div className="mt-1">
                                    {targetEmail ? (
                                        <span className="text-[var(--purple)]">{targetEmail}</span>
                                    ) : (
                                        <span className="text-[var(--text-3)]">Not specified</span>
                                    )}
                                </div>
                            </div>
                            <div className="p-3 rounded border border-[var(--border)]">
                                <div className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                                    <Clock className="w-4 h-4" />
                                    Expires
                                </div>
                                <div className="mt-1">
                                    {invite.expires_at ? (
                                        formatDate(invite.expires_at)
                                    ) : (
                                        <span className="text-[var(--text-3)]">No expiration</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Email mismatch notice for signed-in users */}
                        {user && emailMismatch && (
                            <div className="alert warning">
                                <div className="font-semibold flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    This invite is for a different email
                                </div>
                                <div className="text-[var(--text-2)] mt-1">
                                    Invite email:{" "}
                                    <span className="font-medium">{targetEmail}</span>. You are signed in as{" "}
                                    <span className="font-medium">{userEmail}</span>.
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                        className={cn(
                                            "btn",
                                            mismatchAcknowledged ? "btn-secondary" : "btn-primary ghost"
                                        )}
                                        onClick={() => setMismatchAcknowledged(true)}
                                    >
                                        Continue anyway
                                    </button>
                                    <button className="btn btn-secondary" onClick={handleSignOutToSwitch}>
                                        <LogIn className="w-4 h-4 mr-1" />
                                        Sign out to switch
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Already a member notice */}
                        {user && existingMembership && existingMembership !== null && (
                            <div className="alert info">
                                <div className="font-semibold">You’re already a member of this account</div>
                                <div className="text-[var(--text-2)] mt-1">
                                    You can switch to this account now to continue.
                                </div>
                                <div className="mt-2">
                                    <button className="btn btn-primary" onClick={handleSwitchToAccount}>
                                        Switch to this account
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Action buttons (signed-in valid) */}
                        {user && computedStatus === "valid" && (
                            <div className="card-footer">
                                <div className="flex items-center gap-2">
                                    <button
                                        className="btn btn-primary"
                                        disabled={!canAccept}
                                        onClick={handleAccept}
                                    >
                                        {accepting ? (
                                            <>
                                                <span className="spinner mr-2" />
                                                Accepting...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 mr-1" />
                                                Accept
                                            </>
                                        )}
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={declining}
                                        onClick={handleDecline}
                                    >
                                        {declining ? "Declining..." : "Decline"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Sign-in required state for valid invite */}
                        {!user && showSignInPrompt && (
                            <div className="mt-2">
                                <SignInRequired message="Sign in to accept or decline this invite." />
                            </div>
                        )}
                    </div>
                )}

                {/* Action error */}
                {actionError && (
                    <div className="mt-3 alert danger">
                        <div className="font-semibold">Action failed</div>
                        <div className="text-[var(--text-2)]">{actionError}</div>
                        <div className="mt-2">
                            <button className="btn btn-secondary" onClick={() => setActionError(null)}>
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Helpful tips / right-rail style section collapsed to full width */}
            <section className="card">
                <div className="card-title">About roles</div>
                <div className="text-[var(--text-2)]">
                    - Admin: full control including roles and billing
                    <br />
                    - Standard: edit content and configure agents
                    <br />
                    - Guest: view-only access
                </div>
            </section>
        </div>
    );
}