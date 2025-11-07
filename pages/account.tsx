import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignInRequired } from "@/components/SignInRequired";
import {
    useUserInfo,
    useAccount,
    useUserRole,
    useCurrentUser,
    useStoreMatchingItems,
    useStoreItem,
    useFileUrl,
} from "@/lib/hooks";
import { store } from "@/lib/store";
import { fileStore } from "@/lib/fileStore";
import { supClient } from "@/lib/supabase";
import { cn } from "@/lib/util";
import {
    typeDefs,
    Account as DBAccount,
    AccountInvite,
    AccountMembership,
    User,
} from "@/lib/schema";
import {
    Copy,
    Edit3,
    Save,
    X,
    Upload,
    Trash2,
    Link as LinkIcon,
    Shield,
    UserMinus,
    Users,
    Plus,
    Loader2,
    ExternalLink,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

type Role = "admin" | "standard" | "guest";

interface InviteFormState {
    email?: string;
    role: Role;
    generating: boolean;
    lastInviteUrl?: string;
    error?: string;
}

interface EditAccountState {
    name: string;
    saving: boolean;
    error?: string;
}

function usePendingInvites(accountId: string | undefined) {
    const invites = useStoreMatchingItems<AccountInvite>(
        // @ts-ignore typeDefs lookup
        (typeDefs as any).AccountInvite ?? "account_invite",
        accountId
            ? {
                  account_id: accountId,
                  is_active: true,
              }
            : undefined,
        { orderBy: "created_at", orderByDesc: true }
    );
    return invites;
}

function useMemberships(accountId: string | undefined) {
    const memberships = useStoreMatchingItems<AccountMembership>(
        (typeDefs as any).AccountMembership ?? "account_membership",
        accountId ? { account_id: accountId } : undefined,
        { orderBy: "created_at" }
    );
    return memberships;
}

function MemberCard({
    membership,
    canEditRoles,
    canRemove,
    isSelf,
    onRoleChange,
    onRemove,
}: {
    membership: AccountMembership;
    canEditRoles: boolean;
    canRemove: boolean;
    isSelf: boolean;
    onRoleChange: (role: Role) => Promise<void>;
    onRemove: () => Promise<void>;
}) {
    const user = useStoreItem<User>(
        (typeDefs as any).User ?? "user",
        membership?.user_id
    );
    const avatarUrl = useFileUrl(user?.profile_image_path);
    const [updating, setUpdating] = useState(false);
    const [removing, setRemoving] = useState(false);

    const role = (membership?.role as Role) || "standard";

    return (
        <div className="card p-3 flex flex-col gap-3">
            <div className="flex items-center gap-3">
                {avatarUrl ? (
                    <img
                        alt=""
                        src={avatarUrl}
                        className="w-10 h-10 rounded object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded bg-[var(--surface-3)] flex items-center justify-center">
                        <Users className="w-5 h-5 text-[var(--text-3)]" />
                    </div>
                )}
                <div className="min-w-0">
                    <div className="font-medium truncate">{user?.name ?? "—"}</div>
                    <div className="text-[var(--text-3)] text-xs truncate">{user?.email ?? "—"}</div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--text-3)]" />
                    {canEditRoles && !isSelf ? (
                        <select
                            className="select"
                            value={role}
                            onChange={async (e) => {
                                const newRole = e.target.value as Role;
                                setUpdating(true);
                                try {
                                    await onRoleChange(newRole);
                                } finally {
                                    setUpdating(false);
                                }
                            }}
                            disabled={updating}
                        >
                            <option value="admin">Admin</option>
                            <option value="standard">Standard</option>
                            <option value="guest">Guest</option>
                        </select>
                    ) : (
                        <span className="chip">{role}</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        className="btn btn-secondary btn-icon"
                        href={`/profile/${membership.user_id}`}
                        aria-label="Open public profile"
                        title="Open public profile"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </Link>

                    {canRemove && !isSelf && (
                        <button
                            className="btn btn-danger btn-icon"
                            aria-label="Remove member"
                            title="Remove member"
                            onClick={async () => {
                                if (!confirm("Remove this member from the account?")) return;
                                setRemoving(true);
                                try {
                                    await onRemove();
                                } finally {
                                    setRemoving(false);
                                }
                            }}
                            disabled={removing}
                        >
                            {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AccountPage() {
    const userInfo = useUserInfo();
    const user = useCurrentUser();
    const account = useAccount();
    const role = useUserRole(); // db role: admin | standard | guest
    const [hostOrigin, setHostOrigin] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setHostOrigin(window.location.origin);
        }
    }, []);

    // Loading & auth states
    if (userInfo === null || user === null || account === null || role === null) {
        return (
            <div className="page--AccountPage container-page">
                <div className="card p-6 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <div>Loading account...</div>
                </div>
            </div>
        );
    }
    if (userInfo === undefined || user === undefined) {
        return (
            <div className="page--AccountPage container-page">
                <SignInRequired message="Sign in to view and manage the account." />
            </div>
        );
    }
    if (!account) {
        return (
            <div className="page--AccountPage container-page space-y-4">
                <div className="card p-6">
                    <div className="card-title">No account found</div>
                    <div className="text-[var(--text-2)]">
                        You are signed in but do not belong to an account yet.
                    </div>
                    <div className="card-footer">
                        <Link className="btn btn-primary" href="/register">Create a new account</Link>
                    </div>
                </div>
            </div>
        );
    }

    const isAdmin = role === "admin";
    // NOTE: Manager role is handled via app logic; if you introduce a manager flag, wire it here.
    const isManager = false; // Placeholder: update when manager capability is available
    const canInviteOrRemove = isAdmin || isManager;

    const [editMode, setEditMode] = useState(false);
    const [editState, setEditState] = useState<EditAccountState>({
        name: account?.name ?? "",
        saving: false,
    });
    useEffect(() => {
        setEditState((s) => ({ ...s, name: account?.name ?? "" }));
    }, [account?.name]);

    const accountLogoUrl = useFileUrl(account.logo_image_path);

    const { lastInviteUrl, generating, error: inviteError, role: inviteRole, email: inviteEmail } =
        useMemo<InviteFormState>(() => ({ role: "standard", generating: false }), []);
    const [inviteState, setInviteState] = useState<InviteFormState>({
        role: "standard",
        generating: false,
    });

    const memberships = useMemberships(account?.id);
    const invites = usePendingInvites(account?.id);

    async function handleSaveAccountAsync() {
        if (!account?.id) return;
        setEditState((s) => ({ ...s, saving: true, error: undefined }));
        try {
            const trimmedName = editState.name.trim();
            if (!trimmedName) {
                setEditState((s) => ({ ...s, error: "Account name is required.", saving: false }));
                return;
            }
            await store().updateAsync<DBAccount>(
                (typeDefs as any).Account ?? "account",
                account.id,
                { name: trimmedName }
            );
            setEditMode(false);
        } catch (e: any) {
            setEditState((s) => ({ ...s, error: e?.message ?? "Failed to save changes.", saving: false }));
            return;
        }
        setEditState((s) => ({ ...s, saving: false }));
    }

    async function handleUploadLogoAsync(file: File) {
        if (!account?.id || !user?.id) return;
        const path = `${account.id}/logo/logo-${uuidv4()}-${file.name}`;
        const client = supClient();
        const bucket = client.storage.from("accounts");
        const { error: uploadError } = await bucket.upload(path, file, { upsert: true, contentType: file.type });
        if (uploadError) {
            setEditState((s) => ({ ...s, error: uploadError.message }));
            return;
        }
        await store().updateAsync<DBAccount>(
            (typeDefs as any).Account ?? "account",
            account.id,
            { logo_image_path: path }
        );
        // Warm URL cache
        await fileStore().getUrlAsync(path);
    }

    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // ignore
        }
    }

    async function generateInviteAsync() {
        if (!account?.id || !hostOrigin) return;
        setInviteState((s) => ({ ...s, generating: true, error: undefined, lastInviteUrl: undefined }));
        try {
            const inviteCode = uuidv4().replace(/-/g, "");
            const newInvite: Partial<AccountInvite> = {
                account_id: account.id,
                invited_by_user_id: user.id,
                email: inviteState.email?.trim() || undefined,
                role: inviteState.role,
                invite_code: inviteCode,
                is_active: true,
            };
            await store().insertAsync((typeDefs as any).AccountInvite ?? "account_invite", newInvite);
            const url = `${hostOrigin}/accept-account-invite/${inviteCode}`;
            setInviteState((s) => ({ ...s, lastInviteUrl: url }));
            await copyToClipboard(url);
        } catch (e: any) {
            setInviteState((s) => ({ ...s, error: e?.message ?? "Failed to generate invite." }));
        } finally {
            setInviteState((s) => ({ ...s, generating: false }));
        }
    }

    async function revokeInviteAsync(inviteId: string) {
        try {
            await store().updateAsync<AccountInvite>(
                (typeDefs as any).AccountInvite ?? "account_invite",
                inviteId,
                { is_active: false, declined_at: new Date().toISOString() }
            );
        } catch {
            // ignore
        }
    }

    return (
        <div className="page--AccountPage space-y-4">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Logo className="w-7 h-7" />
                    <div className="font-bold text-lg">Account</div>
                </div>
                <Link className="btn btn-secondary" href="/profile">
                    My Profile
                </Link>
            </header>

            <section className="content-2col">
                <div className="space-y-4">
                    {/* Account Info */}
                    <div className="card p-4">
                        <div className="card-header">
                            <div className="flex items-center gap-3">
                                {accountLogoUrl ? (
                                    <img
                                        alt=""
                                        src={accountLogoUrl}
                                        className="w-12 h-12 rounded object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded bg-[var(--surface-3)] flex items-center justify-center">
                                        <Logo className="w-6 h-6 opacity-70" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    {!editMode ? (
                                        <>
                                            <div className="text-xl font-semibold truncate">{account.name}</div>
                                            <div className="flex items-center gap-2 text-[var(--text-3)] text-xs">
                                                <span className="truncate">Account ID: {account.id}</span>
                                                <button
                                                    className="btn btn-secondary btn-icon"
                                                    aria-label="Copy account id"
                                                    onClick={() => copyToClipboard(account.id)}
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="field">
                                                <label className="label">Account name</label>
                                                <input
                                                    className="input"
                                                    placeholder="Enter account name"
                                                    value={editState.name}
                                                    onChange={(e) =>
                                                        setEditState((s) => ({ ...s, name: e.target.value }))
                                                    }
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <label className="btn btn-secondary" htmlFor="logoUpload">
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Upload logo
                                                </label>
                                                <input
                                                    id="logoUpload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            await handleUploadLogoAsync(file);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="ml-auto flex items-center gap-2">
                                    {!editMode && isAdmin && (
                                        <button className="btn btn-secondary" onClick={() => setEditMode(true)}>
                                            <Edit3 className="w-4 h-4 mr-2" />
                                            Edit
                                        </button>
                                    )}
                                    {editMode && (
                                        <>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setEditMode(false);
                                                    setEditState((s) => ({ ...s, name: account.name, error: undefined }));
                                                }}
                                                disabled={editState.saving}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Cancel
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleSaveAccountAsync}
                                                disabled={editState.saving}
                                            >
                                                {editState.saving ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Save className="w-4 h-4 mr-2" />
                                                )}
                                                Save
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        {editState.error && (
                            <div className="alert danger mt-3">
                                <div className="font-semibold">Error</div>
                                <div className="text-[var(--text-2)]">{editState.error}</div>
                            </div>
                        )}
                    </div>

                    {/* Members */}
                    <div className="card p-4">
                        <div className="card-header">
                            <div className="card-title">Members</div>
                            {canInviteOrRemove && (
                                <div className="flex items-center gap-2">
                                    <div className="text-[var(--text-3)] text-sm">Invite users and manage membership</div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {memberships === null && (
                                <div className="col-span-full flex items-center gap-2 text-[var(--text-2)]">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading members...
                                </div>
                            )}
                            {Array.isArray(memberships) && memberships.length === 0 && (
                                <div className="col-span-full text-[var(--text-2)]">No members found.</div>
                            )}
                            {Array.isArray(memberships) &&
                                memberships.map((m) => {
                                    const canEditRoles = isAdmin && m.user_id !== user.id; // admins cannot change own role
                                    const canRemove = canInviteOrRemove && m.user_id !== user.id;
                                    return (
                                        <MemberCard
                                            key={m.id}
                                            membership={m}
                                            canEditRoles={canEditRoles}
                                            canRemove={canRemove}
                                            isSelf={m.user_id === user.id}
                                            onRoleChange={async (newRole) => {
                                                await store().updateAsync<AccountMembership>(
                                                    (typeDefs as any).AccountMembership ?? "account_membership",
                                                    m.id,
                                                    { role: newRole }
                                                );
                                            }}
                                            onRemove={async () => {
                                                await store().deleteAsync<AccountMembership>(
                                                    (typeDefs as any).AccountMembership ?? "account_membership",
                                                    m.id
                                                );
                                            }}
                                        />
                                    );
                                })}
                        </div>
                    </div>
                </div>

                {/* Right rail */}
                <aside className="right-rail space-y-4">
                    <div className="card p-4">
                        <div className="card-title">Quick Actions</div>
                        <div className="mt-3 flex flex-col gap-2">
                            <Link className="btn btn-primary" href="/register">
                                <Plus className="w-4 h-4 mr-2" />
                                Create new account
                            </Link>
                            {isAdmin && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => alert("Billing management not implemented in this demo.")}
                                >
                                    Manage billing
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="card p-4">
                        <div className="card-header">
                            <div className="card-title">Invites</div>
                            {canInviteOrRemove && (
                                <span className="badge accent">Admin/Manager</span>
                            )}
                        </div>
                        {canInviteOrRemove ? (
                            <>
                                <div className="grid gap-2">
                                    <div className="field">
                                        <label className="label">Email (optional)</label>
                                        <input
                                            className="input"
                                            placeholder="name@example.com"
                                            value={inviteState.email ?? ""}
                                            onChange={(e) => setInviteState((s) => ({ ...s, email: e.target.value }))}
                                        />
                                    </div>
                                    <div className="field">
                                        <label className="label">Role</label>
                                        <select
                                            className="select"
                                            value={inviteState.role}
                                            onChange={(e) =>
                                                setInviteState((s) => ({
                                                    ...s,
                                                    role: e.target.value as Role,
                                                }))
                                            }
                                        >
                                            <option value="standard">Standard</option>
                                            <option value="guest">Guest</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="btn btn-primary"
                                            onClick={generateInviteAsync}
                                            disabled={inviteState.generating || !hostOrigin}
                                        >
                                            {inviteState.generating ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <LinkIcon className="w-4 h-4 mr-2" />
                                            )}
                                            Generate invite link
                                        </button>
                                        {inviteState.lastInviteUrl && (
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() =>
                                                    inviteState.lastInviteUrl
                                                        ? copyToClipboard(inviteState.lastInviteUrl)
                                                        : undefined
                                                }
                                            >
                                                <Copy className="w-4 h-4 mr-2" />
                                                Copy last link
                                            </button>
                                        )}
                                    </div>
                                    {inviteState.lastInviteUrl && (
                                        <div className="p-2 highlight rounded text-xs truncate">
                                            {inviteState.lastInviteUrl}
                                        </div>
                                    )}
                                    {inviteState.error && (
                                        <div className="alert danger">
                                            <div className="font-semibold">Error</div>
                                            <div className="text-[var(--text-2)]">{inviteState.error}</div>
                                        </div>
                                    )}
                                </div>

                                <div className="divider my-3" />

                                <div>
                                    <div className="font-medium mb-2">Pending invites</div>
                                    {invites === null && (
                                        <div className="text-[var(--text-2)] flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading invites...
                                        </div>
                                    )}
                                    {Array.isArray(invites) && invites.length === 0 && (
                                        <div className="text-[var(--text-2)]">No active invites.</div>
                                    )}
                                    <div className="space-y-2">
                                        {Array.isArray(invites) &&
                                            invites
                                                .filter((iv) => iv.is_active && !iv.accepted_at)
                                                .map((iv) => {
                                                    const url = hostOrigin
                                                        ? `${hostOrigin}/accept-account-invite/${iv.invite_code}`
                                                        : iv.invite_code;
                                                    return (
                                                        <div key={iv.id} className="p-2 rounded border border-[var(--border)] flex items-center justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <div className="text-sm truncate">{url}</div>
                                                                <div className="text-[var(--text-3)] text-xs">
                                                                    Role: {iv.role || "standard"} {iv.email ? `• ${iv.email}` : ""}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <button
                                                                    className="btn btn-secondary btn-icon"
                                                                    aria-label="Copy invite"
                                                                    onClick={() => copyToClipboard(url)}
                                                                >
                                                                    <Copy className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    className="btn btn-danger btn-icon"
                                                                    aria-label="Revoke invite"
                                                                    onClick={() => revokeInviteAsync(iv.id)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-[var(--text-2)]">
                                You don’t have permission to manage invites. Contact an admin.
                            </div>
                        )}
                    </div>

                    {isAdmin && (
                        <div className="card p-4">
                            <div className="card-title text-[var(--danger)]">Danger Zone</div>
                            <div className="text-[var(--text-2)] text-sm">
                                Deleting the account is irreversible. All tenant data will be removed.
                            </div>
                            <div className="card-footer">
                                <button
                                    className="btn btn-danger"
                                    onClick={() => {
                                        alert("Delete account is not implemented in this demo.");
                                    }}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete account
                                </button>
                            </div>
                        </div>
                    )}
                </aside>
            </section>
        </div>
    );
}