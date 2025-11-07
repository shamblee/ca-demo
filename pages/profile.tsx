import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    useUserInfo,
    useFileUrl,
    useStoreMatchingItems,
    useStoreItem,
} from "@/lib/hooks";
import { SignInRequired } from "@/components/SignInRequired";
import { User as UserIcon, Upload, Trash2, RefreshCw, Copy, ExternalLink, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/util";
import { app } from "@/lib/app";
import { supClient } from "@/lib/supabase";
import { store } from "@/lib/store";
import { typeDefs, User as DbUser, Account as DbAccount, AccountMembership as DbMembership } from "@/lib/schema";

interface ProfileForm {
    name: string;
}

function useInitials(name?: string) {
    return useMemo(() => {
        if (!name) return "";
        const parts = name.trim().split(/\s+/);
        const first = parts[0]?.[0] ?? "";
        const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
        return (first + last).toUpperCase();
    }, [name]);
}

function extFromFile(file: File): string {
    const byType = (() => {
        if (file.type === "image/jpeg") return "jpg";
        if (file.type === "image/png") return "png";
        if (file.type === "image/webp") return "webp";
        return "";
    })();
    if (byType) return byType;
    const name = file.name || "";
    const dot = name.lastIndexOf(".");
    return dot > -1 ? name.slice(dot + 1).toLowerCase() : "bin";
}

function cachebust(url: string | undefined, key: number) {
    if (!url) return undefined;
    return url + (url.includes("?") ? "&" : "?") + "v=" + key;
}

function RoleBadge({ role }: { role?: string }) {
    const roleLower = (role ?? "").toLowerCase();
    const [label, cls] = (() => {
        switch (roleLower) {
            case "admin":
                return ["Admin", "badge brand"];
            case "standard":
                return ["Standard", "badge accent"];
            case "guest":
                return ["Guest", "badge"];
            default:
                return [role ?? "Member", "badge"];
        }
    })();
    return <span className={cls}>{label}</span>;
}

export default function ProfilePage() {
    const userInfo = useUserInfo();
    const user = userInfo?.user as DbUser | undefined;
    const activeAccount = userInfo?.account as DbAccount | undefined;
    const activeAccountId = activeAccount?.id;

    // Form state
    const [form, setForm] = useState<ProfileForm>({ name: "" });
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Upload states
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingHero, setUploadingHero] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const avatarInputRef = useRef<HTMLInputElement | null>(null);
    const heroInputRef = useRef<HTMLInputElement | null>(null);

    // Resolve image URLs
    const avatarUrl = useFileUrl(user?.profile_image_path);
    const heroUrl = useFileUrl(user?.hero_image_path);

    // Memberships for the current user
    const memberships = useStoreMatchingItems<DbMembership>(
        typeDefs.AccountMembership,
        user ? { user_id: user.id } : undefined,
        { orderBy: "created_at", orderByDesc: true }
    );

    // Keep form synced with user
    useEffect(() => {
        if (user) {
            setForm({ name: user.name ?? "" });
            setDirty(false);
            setError(null);
        }
    }, [user?.id]); // intentionally only on id change to preserve edits across other updates

    const initials = useInitials(user?.name);

    // Access control
    if (userInfo === undefined) {
        // Not signed in
        return (
            <div className="page--ProfilePage container-page">
                <SignInRequired message="You need to sign in to view your profile." />
            </div>
        );
    }

    // Loading state
    if (userInfo === null || !user) {
        return (
            <div className="page--ProfilePage container-page space-y-4">
                <div className="content-2col">
                    <div className="space-y-3">
                        {/* Hero skeleton */}
                        <div className="card p-0 overflow-hidden">
                            <div className="h-40 skeleton" />
                            <div className="p-4 flex items-center gap-4">
                                <div className="w-20 h-20 rounded-full skeleton" />
                                <div className="flex-1 space-y-2">
                                    <div className="w-48 h-5 skeleton" />
                                    <div className="w-64 h-4 skeleton" />
                                </div>
                            </div>
                        </div>

                        {/* Edit card skeleton */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Profile</div>
                            </div>
                            <div className="grid gap-3 max-w-xl">
                                <div className="w-full h-10 skeleton" />
                                <div className="w-full h-10 skeleton" />
                                <div className="flex gap-2">
                                    <div className="w-24 h-9 skeleton" />
                                    <div className="w-24 h-9 skeleton" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside className="right-rail space-y-3">
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Accounts</div>
                            </div>
                            <div className="space-y-2">
                                <div className="w-full h-10 skeleton" />
                                <div className="w-full h-10 skeleton" />
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        );
    }

    const heroUrlBust = cachebust(heroUrl ?? undefined, refreshKey);
    const avatarUrlBust = cachebust(avatarUrl ?? undefined, refreshKey);

    const nameValid = form.name.trim().length > 0;

    async function handleSaveAsync() {
        setError(null);
        if (!user) return;
        if (!dirty || !nameValid) return;
        try {
            setSaving(true);
            await store().updateAsync(typeDefs.User, user.id, {
                name: form.name.trim(),
            } as Partial<DbUser>);
            setDirty(false);
        } catch (e: any) {
            setError(e?.message ?? "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    }

    function revertChanges() {
        if (!user) return;
        setForm({ name: user.name ?? "" });
        setDirty(false);
        setError(null);
    }

    async function uploadToPathAsync(kind: "avatar" | "hero", file: File): Promise<string> {
        if (!user || !activeAccountId) {
            throw new Error("No active account or user to upload images.");
        }
        const ext = extFromFile(file);
        const filename = `${kind}-${Date.now()}.${ext}`;
        const path = `${activeAccountId}/users/${user.id}/${filename}`;
        const res = await supClient().storage.from("accounts").upload(path, file, {
            upsert: true,
            cacheControl: "3600",
        });
        if (res.error) {
            throw res.error;
        }
        return path;
    }

    async function onAvatarSelected(files: FileList | null) {
        if (!files || files.length === 0) return;
        const file = files[0];
        setError(null);
        try {
            setUploadingAvatar(true);
            const path = await uploadToPathAsync("avatar", file);
            await store().updateAsync(typeDefs.User, user.id, {
                profile_image_path: path,
            } as Partial<DbUser>);
            setRefreshKey((k) => k + 1);
        } catch (e: any) {
            setError(e?.message ?? "Failed to upload profile image.");
        } finally {
            setUploadingAvatar(false);
            if (avatarInputRef.current) avatarInputRef.current.value = "";
        }
    }

    async function onHeroSelected(files: FileList | null) {
        if (!files || files.length === 0) return;
        const file = files[0];
        setError(null);
        try {
            setUploadingHero(true);
            const path = await uploadToPathAsync("hero", file);
            await store().updateAsync(typeDefs.User, user.id, {
                hero_image_path: path,
            } as Partial<DbUser>);
            setRefreshKey((k) => k + 1);
        } catch (e: any) {
            setError(e?.message ?? "Failed to upload cover image.");
        } finally {
            setUploadingHero(false);
            if (heroInputRef.current) heroInputRef.current.value = "";
        }
    }

    async function removeAvatarAsync() {
        if (!user) return;
        setError(null);
        try {
            setUploadingAvatar(true);
            await store().updateAsync(typeDefs.User, user.id, {
                profile_image_path: null as any,
            } as Partial<DbUser>);
            setRefreshKey((k) => k + 1);
        } catch (e: any) {
            setError(e?.message ?? "Failed to remove profile image.");
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function removeHeroAsync() {
        if (!user) return;
        setError(null);
        try {
            setUploadingHero(true);
            await store().updateAsync(typeDefs.User, user.id, {
                hero_image_path: null as any,
            } as Partial<DbUser>);
            setRefreshKey((k) => k + 1);
        } catch (e: any) {
            setError(e?.message ?? "Failed to remove cover image.");
        } finally {
            setUploadingHero(false);
        }
    }

    async function copyUserId() {
        if (!user) return;
        try {
            await navigator.clipboard.writeText(user.id);
        } catch {
            // ignore
        }
    }

    function refreshPreviews() {
        setRefreshKey((k) => k + 1);
    }

    const membershipsLoaded = memberships !== null;
    const membershipList = membershipsLoaded ? memberships ?? [] : [];

    return (
        <div className="page--ProfilePage">
            <main className="container-page space-y-4">
                <section className="content-2col">
                    {/* Primary content */}
                    <div className="space-y-3">
                        {/* Identity header: hero + avatar + basic info */}
                        <div className="card p-0 overflow-hidden">
                            {/* Hero / Cover */}
                            <div className="relative">
                                {heroUrlBust ? (
                                    <img
                                        src={heroUrlBust}
                                        alt="Profile cover"
                                        className="w-full h-40 object-cover"
                                    />
                                ) : (
                                    <div className="h-40 bg-[var(--surface-2)] flex items-center justify-center">
                                        <div className="flex items-center gap-2 text-[var(--text-3)]">
                                            <ImageIcon className="w-5 h-5" />
                                            <span>No cover image</span>
                                        </div>
                                    </div>
                                )}

                                <div className="absolute top-2 right-2 flex gap-2">
                                    <input
                                        ref={heroInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={(e) => onHeroSelected(e.target.files)}
                                    />
                                    <button
                                        className="btn btn-secondary btn-icon"
                                        aria-label={heroUrlBust ? "Replace cover image" : "Add cover image"}
                                        onClick={() => heroInputRef.current?.click()}
                                        disabled={uploadingHero || !activeAccountId}
                                        title={!activeAccountId ? "Select an account to upload" : undefined}
                                    >
                                        <Upload className={cn("w-4 h-4", uploadingHero && "animate-spin")} />
                                    </button>
                                    {heroUrlBust && (
                                        <button
                                            className="btn btn-secondary btn-icon"
                                            aria-label="Remove cover image"
                                            onClick={removeHeroAsync}
                                            disabled={uploadingHero}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Avatar + name + email */}
                            <div className="p-4 flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
                                        {avatarUrlBust ? (
                                            <img
                                                src={avatarUrlBust}
                                                alt={`${user.name}'s avatar`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="text-xl text-[var(--text-3)] font-semibold">
                                                {initials || <UserIcon className="w-8 h-8 mx-auto" />}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 flex gap-1">
                                        <input
                                            ref={avatarInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            className="hidden"
                                            onChange={(e) => onAvatarSelected(e.target.files)}
                                        />
                                        <button
                                            className="btn btn-secondary btn-icon"
                                            aria-label={avatarUrlBust ? "Replace profile picture" : "Add profile picture"}
                                            onClick={() => avatarInputRef.current?.click()}
                                            disabled={uploadingAvatar || !activeAccountId}
                                            title={!activeAccountId ? "Select an account to upload" : undefined}
                                        >
                                            <Upload className={cn("w-4 h-4", uploadingAvatar && "animate-spin")} />
                                        </button>
                                        {avatarUrlBust && (
                                            <button
                                                className="btn btn-secondary btn-icon"
                                                aria-label="Remove profile picture"
                                                onClick={removeAvatarAsync}
                                                disabled={uploadingAvatar}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="text-lg font-semibold truncate">{user.name}</div>
                                        <Link
                                            className="link flex items-center gap-1"
                                            href={`/profile/${user.id}`}
                                            title="Open public profile"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            <span className="hidden sm:inline">Public profile</span>
                                        </Link>
                                    </div>
                                    <div className="text-[var(--text-2)] truncate">{user.email}</div>
                                    <div className="mt-1 flex items-center gap-2">
                                        <button className="btn btn-secondary btn-icon" aria-label="Copy user id" onClick={copyUserId}>
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button className="btn btn-secondary btn-icon" aria-label="Refresh image previews" onClick={refreshPreviews}>
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Edit panel */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Edit profile</div>
                                <div className="card-subtitle">Update your display information. Email is read-only.</div>
                            </div>

                            {error && (
                                <div className="alert danger">
                                    <div className="font-semibold">Error</div>
                                    <div className="text-[var(--text-2)]">{error}</div>
                                </div>
                            )}

                            <div className="grid gap-3 max-w-xl">
                                <div className={cn("field", !nameValid && dirty && "invalid")}>
                                    <label className="label">Display name</label>
                                    <input
                                        className="input"
                                        placeholder="Your name"
                                        value={form.name}
                                        onChange={(e) => {
                                            setForm({ ...form, name: e.target.value });
                                            setDirty(true);
                                        }}
                                    />
                                    {!nameValid && dirty && (
                                        <div className="help-text">Please enter your name.</div>
                                    )}
                                </div>

                                <div className="field">
                                    <label className="label">Email</label>
                                    <input className="input" value={user.email} readOnly aria-readonly />
                                    <div className="help-text">Email is managed by authentication and cannot be changed.</div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSaveAsync}
                                        disabled={!dirty || !nameValid || saving}
                                    >
                                        {saving ? "Saving..." : "Save changes"}
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={revertChanges}
                                        disabled={saving || !dirty}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right rail: memberships */}
                    <aside className="right-rail space-y-3">
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Your accounts</div>
                            </div>

                            {!membershipsLoaded ? (
                                <div className="space-y-2">
                                    <div className="h-10 skeleton" />
                                    <div className="h-10 skeleton" />
                                </div>
                            ) : membershipList.length === 0 ? (
                                <div className="alert info">
                                    <div className="font-semibold">No accounts linked</div>
                                    <div className="text-[var(--text-2)]">
                                        You are not a member of any account yet.
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {membershipList.map((m) => (
                                        <MembershipItem key={m.id} membershipId={m.id} activeAccountId={activeAccountId} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>
                </section>
            </main>
        </div>
    );
}

function MembershipItem({ membershipId, activeAccountId }: { membershipId: string; activeAccountId?: string }) {
    const membership = useStoreItem<DbMembership>(typeDefs.AccountMembership, membershipId);
    const account = useStoreItem<DbAccount>(
        typeDefs.Account,
        membership ? membership.account_id : undefined
    );
    const logoUrl = useFileUrl(account?.logo_image_path);

    if (membership === null || account === null) {
        return (
            <div className="h-12 skeleton rounded-[var(--radius)]" />
        );
    }
    if (membership === undefined || account === undefined) return null;

    const isActive = activeAccountId === account.id;

    return (
        <div className="flex items-center justify-between gap-3 p-2 rounded-[var(--radius)] border border-[var(--border)]">
            <div className="flex items-center gap-2 min-w-0">
                {logoUrl ? (
                    <img src={logoUrl} alt="" className="w-6 h-6 rounded" />
                ) : (
                    <div className="w-6 h-6 rounded bg-[var(--surface-3)]" />
                )}
                <div className="min-w-0">
                    <div className="truncate">{account.name}</div>
                    <div className="text-[var(--text-3)]">
                        <RoleBadge role={membership.role} />
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isActive ? (
                    <span className="chip">Active</span>
                ) : (
                    <button
                        className="btn btn-secondary"
                        onClick={async () => {
                            await app().switchAccountAsync(account.id);
                        }}
                    >
                        Switch
                    </button>
                )}
            </div>
        </div>
    );
}