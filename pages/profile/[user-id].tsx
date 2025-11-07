import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Copy, Mail, Link as LinkIcon, ShieldCheck, Shield, User as UserIcon } from "lucide-react";
import { SignInRequired } from "@/components/SignInRequired";
import { cn } from "@/lib/util";
import {
    useAccount,
    useCurrentUser,
    useFileUrl,
    useStoreFirstMatchingItem,
    useStoreItem,
    useUserRole,
} from "@/lib/hooks";
import { store } from "@/lib/store";
import { typeDefs, User, AccountMembership, UserRole } from "@/lib/schema";

function useParamUserId() {
    const { query } = useRouter();
    const raw = query["user-id"];
    return Array.isArray(raw) ? raw[0] : raw;
}

function usePermalink(userId: string | undefined) {
    const [link, setLink] = useState<string>();
    useEffect(() => {
        if (typeof window !== "undefined" && userId) {
            const url = `${window.location.origin}/profile/${userId}`;
            setLink(url);
        }
    }, [userId]);
    return link;
}

function formatDate(value?: string) {
    if (!value) return "—";
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleString();
    } catch {
        return value;
    }
}

function RoleBadge({ role }: { role?: string }) {
    if (!role) return <span className="badge accent">No role</span>;
    const label =
        role === "admin" ? "Admin" : role === "standard" ? "Standard" : role === "guest" ? "Guest" : role;
    const icon = role === "admin" ? <ShieldCheck className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />;
    return (
        <span className={cn("badge", role === "admin" ? "brand" : role === "guest" ? "accent" : undefined)}>
            <span className="inline-flex items-center gap-1">{icon}{label}</span>
        </span>
    );
}

async function copyToClipboard(text?: string) {
    if (!text) return false;
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

export default function PublicProfilePage() {
    const userId = useParamUserId();
    const permalink = usePermalink(userId);
    const viewer = useCurrentUser();
    const account = useAccount();
    const viewerRole = useUserRole();

    if (viewer === undefined) {
        // not signed in
        return (
            <div className="page--PublicProfilePage container-page">
                <SignInRequired message="You must be signed in to view public profiles." />
            </div>
        );
    }

    // Loading states for auth/account
    const loadingViewer = viewer === null;
    const loadingAccount = account === null;

    // Load the viewed user
    const viewedUser = useStoreItem<User>(typeDefs.User, userId ?? undefined, {
        disabled: !userId,
    });

    // Load membership for the viewed user in the current account
    const membership = useStoreFirstMatchingItem<AccountMembership>(
        typeDefs.AccountMembership,
        account && userId ? { account_id: account.id, user_id: userId } : null,
        { disabled: !account || !userId }
    );

    const heroUrl = useFileUrl(
        viewedUser && viewedUser !== null ? (viewedUser as User)?.hero_image_path : undefined
    );
    const avatarUrl = useFileUrl(
        viewedUser && viewedUser !== null ? (viewedUser as User)?.profile_image_path : undefined
    );

    const [copied, setCopied] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<UserRole | undefined>(undefined);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    const isSelf = useMemo(() => {
        return !!viewer && !!userId && viewer.id === userId;
    }, [viewer, userId]);

    const canAdmin = viewerRole === "admin";
    const canEditRole = canAdmin && !isSelf && !!membership && membership !== null;

    useEffect(() => {
        if (membership && membership !== null) {
            const roleVal = (membership as AccountMembership).role as UserRole;
            setEditRole(roleVal);
        } else {
            setEditRole(undefined);
        }
    }, [membership?.id]);

    const dirty = useMemo(() => {
        if (!membership || membership === null) return false;
        const current = (membership as AccountMembership).role as UserRole;
        return editRole !== undefined && editRole !== current;
    }, [membership, editRole]);

    const onCopy = async (text?: string, label?: string) => {
        const ok = await copyToClipboard(text);
        setCopied(ok ? label ?? "Copied" : "Copy failed");
        setTimeout(() => setCopied(null), 1500);
    };

    const onSaveRoleAsync = async () => {
        if (!canEditRole || !membership || membership === null || !dirty) return;
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(null);
        try {
            const m = membership as AccountMembership;
            await store().updateAsync(typeDefs.AccountMembership, m.id, { role: editRole });
            setSaveSuccess("Role updated");
        } catch (err: any) {
            setSaveError(err?.message ?? "Failed to update role");
        } finally {
            setSaving(false);
            setTimeout(() => setSaveSuccess(null), 1800);
        }
    };

    const onCancelEdit = () => {
        if (membership && membership !== null) {
            setEditRole((membership as AccountMembership).role as UserRole);
        }
        setSaveError(null);
        setSaveSuccess(null);
    };

    return (
        <div className="page--PublicProfilePage">
            <main className="container-page space-y-4">
                {(loadingViewer || loadingAccount) && (
                    <div className="card skeleton">
                        <div className="h-40 w-full rounded" />
                        <div className="p-4">
                            <div className="h-5 w-40 rounded mb-2" />
                            <div className="h-4 w-64 rounded" />
                        </div>
                    </div>
                )}

                {!loadingViewer && !viewer && (
                    <SignInRequired message="You must be signed in to view public profiles." />
                )}

                {!!viewer && (
                    <section className={cn("content-2col", !canAdmin && "rail-hidden")}>
                        <div className="space-y-3">
                            {/* Hero image preview */}
                            <div className="card overflow-hidden">
                                {heroUrl ? (
                                    <img src={heroUrl} alt="Hero" className="w-full h-40 object-cover" />
                                ) : (
                                    <div className="w-full h-20 bg-[var(--surface-3)]" />
                                )}
                                <div className="p-4 flex items-center gap-3">
                                    <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--surface-3)] flex items-center justify-center">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-8 h-8 text-[var(--text-3)]" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-lg font-semibold truncate">
                                            {viewedUser === null
                                                ? "Loading…"
                                                : !viewedUser
                                                    ? "User not found"
                                                    : (viewedUser as User).name}
                                        </div>
                                        <div className="text-[var(--text-2)] flex items-center gap-2">
                                            <span className="truncate">
                                                {viewedUser && viewedUser !== null ? (viewedUser as User).email : "—"}
                                            </span>
                                            {viewedUser && viewedUser !== null && (
                                                <>
                                                    <a
                                                        className="btn btn-secondary btn-icon"
                                                        aria-label="Email"
                                                        href={`mailto:${(viewedUser as User).email}`}
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                    </a>
                                                    <button
                                                        className="btn btn-secondary btn-icon"
                                                        aria-label="Copy email"
                                                        onClick={() => onCopy((viewedUser as User).email, "Email copied")}
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">User Details</div>
                                    <div className="flex items-center gap-2">
                                        <Link href="/profile" className="btn btn-secondary">Your profile</Link>
                                        {permalink && (
                                            <button
                                                className="btn btn-primary ghost"
                                                onClick={() => onCopy(permalink, "Link copied")}
                                            >
                                                <LinkIcon className="w-4 h-4 mr-1.5" />
                                                Copy public link
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="field">
                                        <label className="label">User ID</label>
                                        <div className="flex items-center gap-2">
                                            <code className="text-sm text-[var(--text-2)] break-all">
                                                {viewedUser && viewedUser !== null ? (viewedUser as User).id : "—"}
                                            </code>
                                            {viewedUser && viewedUser !== null && (
                                                <button
                                                    className="btn btn-secondary btn-icon"
                                                    aria-label="Copy user id"
                                                    onClick={() => onCopy((viewedUser as User).id, "ID copied")}
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="field">
                                        <label className="label">Created</label>
                                        <div className="text-[var(--text-2)]">
                                            {viewedUser && viewedUser !== null ? formatDate((viewedUser as User).created_at) : "—"}
                                        </div>
                                    </div>

                                    <div className="field">
                                        <label className="label">Account Role</label>
                                        <div className="flex items-center gap-2">
                                            <RoleBadge role={membership && membership !== null ? (membership as AccountMembership).role : undefined} />
                                            {!membership && membership !== null && (
                                                <span className="subtle">No role</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="field">
                                        <label className="label">Last accessed (this account)</label>
                                        <div className="text-[var(--text-2)]">
                                            {membership && membership !== null
                                                ? formatDate((membership as AccountMembership).last_accessed_at)
                                                : "—"}
                                        </div>
                                    </div>
                                </div>

                                {/* Membership edge-case notice */}
                                {account && (membership === undefined) && (
                                    <div className="alert info mt-3">
                                        <div className="font-semibold">No account membership</div>
                                        <div className="text-[var(--text-2)]">
                                            This user is not a member of your active account. Role management is unavailable.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right rail */}
                        <aside className="right-rail space-y-3">
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">Role</div>
                                    {membership && membership !== null && (
                                        <RoleBadge role={(membership as AccountMembership).role} />
                                    )}
                                </div>

                                {!canAdmin && (
                                    <div className="alert info">
                                        <div className="font-semibold">View only</div>
                                        <div className="text-[var(--text-2)]">
                                            You don’t have permission to change roles. Contact an account admin.
                                        </div>
                                    </div>
                                )}

                                {isSelf && canAdmin && (
                                    <div className="alert info">
                                        <div className="font-semibold">You can’t change your own role here</div>
                                        <div className="text-[var(--text-2)]">
                                            Admins cannot modify their own role from the public profile page.
                                        </div>
                                    </div>
                                )}

                                {!membership && membership !== null && (
                                    <div className="alert info">
                                        <div className="font-semibold">No membership</div>
                                        <div className="text-[var(--text-2)]">
                                            This user is not part of the current account.
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="field">
                                        <label className="label">Account role</label>
                                        <select
                                            className="select"
                                            value={editRole ?? ""}
                                            onChange={(e) => setEditRole(e.target.value as UserRole)}
                                            disabled={!canEditRole}
                                        >
                                            <option value="" disabled>
                                                {membership && membership !== null ? "Select role" : "No membership"}
                                            </option>
                                            <option value="admin">Admin</option>
                                            <option value="standard">Standard</option>
                                            <option value="guest">Guest</option>
                                        </select>
                                        {!canEditRole && (
                                            <div className="help-text">
                                                {isSelf
                                                    ? "You cannot change your own role from this page."
                                                    : !canAdmin
                                                        ? "Only admins can change roles."
                                                        : !membership
                                                            ? "User must be a member to assign a role."
                                                            : null}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            className="btn btn-primary"
                                            disabled={!dirty || !canEditRole || saving}
                                            onClick={onSaveRoleAsync}
                                        >
                                            Save
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            disabled={!dirty || saving}
                                            onClick={onCancelEdit}
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    {saveSuccess && (
                                        <div className="status success">{saveSuccess}</div>
                                    )}
                                    {saveError && (
                                        <div className="status danger">{saveError}</div>
                                    )}
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-title">Quick copy</div>
                                <div className="mt-2 flex flex-col gap-2">
                                    <button
                                        className="btn btn-secondary justify-between"
                                        onClick={() =>
                                            onCopy(
                                                viewedUser && viewedUser !== null ? (viewedUser as User).id : undefined,
                                                "ID copied"
                                            )
                                        }
                                        disabled={!viewedUser || viewedUser === null}
                                    >
                                        <span>User ID</span>
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        className="btn btn-secondary justify-between"
                                        onClick={() =>
                                            onCopy(
                                                viewedUser && viewedUser !== null ? (viewedUser as User).email : undefined,
                                                "Email copied"
                                            )
                                        }
                                        disabled={!viewedUser || viewedUser === null}
                                    >
                                        <span>Email</span>
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        className="btn btn-secondary justify-between"
                                        onClick={() => onCopy(permalink, "Link copied")}
                                        disabled={!permalink}
                                    >
                                        <span>Profile link</span>
                                        <LinkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                {copied && <div className="mt-2 status success">{copied}</div>}
                            </div>
                        </aside>
                    </section>
                )}
            </main>
        </div>
    );
}