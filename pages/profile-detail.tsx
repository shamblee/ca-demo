import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    useAccount,
    useCurrentUser,
    useUserRole,
    useStoreItem,
    useStoreMatchingItems,
} from "@/lib/hooks";
import { store } from "@/lib/store";
import {
    typeDefs,
    Profile as DbProfile,
    ChannelSubscription as DbChannelSubscription,
    Event as DbEvent,
    Segment as DbSegment,
    SegmentProfile as DbSegmentProfile,
} from "@/lib/schema";
import { SignInRequired } from "@/components/SignInRequired";
import { cn } from "@/lib/util";
import {
    AtSign,
    BadgeCheck,
    Bell,
    BellDot,
    Building2,
    Calendar,
    Check,
    ChevronDown,
    Clipboard,
    ClipboardCheck,
    Clock,
    Edit3,
    ExternalLink,
    FileDown,
    Filter,
    Fingerprint,
    Globe,
    Hash,
    Mail,
    MapPin,
    MousePointerClick,
    Pencil,
    Phone,
    Plus,
    RefreshCcw,
    Save,
    Smartphone,
    ShoppingCart,
    X,
    Search,
    Award,
    Users,
    Inbox,
    Heart,
    BadgeAlert,
    Badge,
} from "lucide-react";

type Channel = "email" | "sms" | "push";
type EventType =
    | "page_view"
    | "session_start"
    | "form_submit"
    | "message_sent"
    | "message_open"
    | "message_click"
    | "message_bounce"
    | "subscriber_new"
    | "subscriber_removed"
    | "add_to_cart"
    | "favorite"
    | "checkout_started"
    | "checkout_abandoned"
    | "purchase"
    | "push_open";

interface ProfileForm {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    device_id?: string;
    address_street?: string;
    address_city?: string;
    address_state?: string;
    address_zip?: string;
    address_country?: string;
    job_title?: string;
    department?: string;
    company?: string;
    external_id?: string;
}

interface EventFilters {
    eventType?: EventType | "all";
    channel?: Channel | "all";
    sort?: "newest" | "oldest";
    q?: string;
    from?: string; // yyyy-mm-dd
    to?: string; // yyyy-mm-dd
}

function formatMoney(amount?: number, currency = "USD") {
    if (amount == null || isNaN(amount)) return "-";
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `$${amount.toFixed(2)}`;
    }
}

function statusBadgeClass(status?: string) {
    switch (status) {
        case "subscribed":
            return "badge success";
        case "unsubscribed":
            return "badge warning";
        case "bounced":
            return "badge danger";
        case "pending":
            return "badge accent";
        default:
            return "badge";
    }
}

function channelIcon(channel: Channel) {
    switch (channel) {
        case "email":
            return <Mail className="w-4 h-4" />;
        case "sms":
            return <Phone className="w-4 h-4" />;
        case "push":
            return <Bell className="w-4 h-4" />;
    }
}

function eventIcon(type: string) {
    switch (type as EventType) {
        case "page_view":
            return <Globe className="w-4 h-4" />;
        case "session_start":
            return <Clock className="w-4 h-4" />;
        case "form_submit":
            return <Inbox className="w-4 h-4" />;
        case "message_sent":
            return <Mail className="w-4 h-4" />;
        case "message_open":
            return <BadgeCheck className="w-4 h-4" />;
        case "message_click":
            return <MousePointerClick className="w-4 h-4" />;
        case "message_bounce":
            return <BadgeAlert className="w-4 h-4" />;
        case "subscriber_new":
            return <Users className="w-4 h-4" />;
        case "subscriber_removed":
            return <Users className="w-4 h-4" />;
        case "add_to_cart":
            return <ShoppingCart className="w-4 h-4" />;
        case "favorite":
            return <Heart className="w-4 h-4" />;
        case "checkout_started":
            return <ShoppingCart className="w-4 h-4" />;
        case "checkout_abandoned":
            return <ShoppingCart className="w-4 h-4" />;
        case "purchase":
            return <Award className="w-4 h-4" />;
        case "push_open":
            return <BellDot className="w-4 h-4" />;
        default:
            return <Hash className="w-4 h-4" />;
    }
}

function asDateString(dt?: string) {
    if (!dt) return "-";
    const d = new Date(dt);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function copyToClipboard(text?: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
}

export default function ProfileDetailPage() {
    const user = useCurrentUser();
    const account = useAccount();
    const role = useUserRole();
    const router = useRouter();
    const profileId = (router.query.id as string) || undefined;

    const isGuest = role === "guest";
    const canEdit = !!user && role !== null && role !== undefined && !isGuest;

    const profile = useStoreItem<DbProfile>(typeDefs.Profile, profileId);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<ProfileForm | null>(null);

    // Initial load / sync form with profile
    useEffect(() => {
        if (profile && editing === false) {
            setForm({
                first_name: profile.first_name,
                last_name: profile.last_name,
                email: profile.email,
                phone: profile.phone,
                device_id: profile.device_id,
                address_street: profile.address_street,
                address_city: profile.address_city,
                address_state: profile.address_state,
                address_zip: profile.address_zip,
                address_country: profile.address_country,
                job_title: profile.job_title,
                department: profile.department,
                company: profile.company,
                external_id: profile.external_id,
            });
        }
    }, [profile, editing]);

    // Channel subscriptions for this profile
    const subs = useStoreMatchingItems<DbChannelSubscription>(
        typeDefs.ChannelSubscription,
        profileId && account ? { profile_id: profileId, account_id: account.id } : undefined
    );

    // Segment memberships
    const memberships = useStoreMatchingItems<DbSegmentProfile>(
        typeDefs.SegmentProfile,
        profileId && account ? { profile_id: profileId, account_id: account.id } : undefined
    );

    // All segments (for add-to-segment UI)
    const allSegments = useStoreMatchingItems<DbSegment>(
        typeDefs.Segment,
        account ? { account_id: account.id } : undefined
    );

    // Events for this profile (client-side filters will apply)
    const events = useStoreMatchingItems<DbEvent>(
        typeDefs.Event,
        profileId && account ? { profile_id: profileId, account_id: account.id } : undefined,
        { orderBy: "occurred_at", orderByDesc: true, limit: 1000 }
    );

    const [filters, setFilters] = useState<EventFilters>({
        eventType: "all",
        channel: "all",
        sort: "newest",
        q: "",
        from: "",
        to: "",
    });

    const filteredEvents = useMemo(() => {
        if (!events || !Array.isArray(events)) return events;
        let list = [...events];
        if (filters.eventType && filters.eventType !== "all") {
            list = list.filter((e) => e.event_type === filters.eventType);
        }
        if (filters.channel && filters.channel !== "all") {
            list = list.filter((e) => e.channel === filters.channel);
        }
        if (filters.q && filters.q.trim().length > 0) {
            const q = filters.q.toLowerCase();
            list = list.filter((e) => {
                return (
                    e.page_url?.toLowerCase().includes(q) ||
                    e.order_id?.toLowerCase().includes(q) ||
                    e.product_id?.toLowerCase().includes(q) ||
                    e.message_id?.toLowerCase().includes(q) ||
                    e.agent_id?.toLowerCase().includes(q) ||
                    JSON.stringify(e.properties || {}).toLowerCase().includes(q)
                );
            });
        }
        if (filters.from) {
            const fromTs = new Date(filters.from + "T00:00:00").getTime();
            list = list.filter((e) => new Date(e.occurred_at).getTime() >= fromTs);
        }
        if (filters.to) {
            const toTs = new Date(filters.to + "T23:59:59").getTime();
            list = list.filter((e) => new Date(e.occurred_at).getTime() <= toTs);
        }
        if (filters.sort === "oldest") {
            list.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
        } else {
            list.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
        }
        return list;
    }, [events, filters]);

    // KPI calculations from events (purchase events)
    const kpis = useMemo(() => {
        const evt = events ?? [];
        const purchases = evt.filter((e) => e.event_type === "purchase");
        const totalOrders = purchases.length;
        const totalRevenue = purchases.reduce((sum, e) => sum + (e.revenue || 0), 0);
        const currency = purchases.find((e) => e.currency)?.currency ?? "USD";
        const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const ltv = totalRevenue; // Simplified: sum of revenue for this profile
        return { totalOrders, aov, ltv, currency };
    }, [events]);

    const primarySubByChannel = useMemo(() => {
        const email = (subs ?? [])?.find((s) => s.channel === "email" && s.is_primary);
        const sms = (subs ?? [])?.find((s) => s.channel === "sms" && s.is_primary);
        const push = (subs ?? [])?.find((s) => s.channel === "push" && s.is_primary);
        return { email, sms, push };
    }, [subs]);

    const name = useMemo(() => {
        if (!profile) return "";
        const first = profile.first_name?.trim() || "";
        const last = profile.last_name?.trim() || "";
        const full = `${first} ${last}`.trim();
        return full || profile.email || profile.phone || "Profile";
    }, [profile]);

    async function handleSaveAsync() {
        if (!profile || !profileId || !form) return;
        try {
            await store().updateAsync(typeDefs.Profile, profileId, {
                first_name: form.first_name?.trim() || null,
                last_name: form.last_name?.trim() || null,
                email: form.email?.trim() || null,
                phone: form.phone?.trim() || null,
                device_id: form.device_id?.trim() || null,
                address_street: form.address_street?.trim() || null,
                address_city: form.address_city?.trim() || null,
                address_state: form.address_state?.trim() || null,
                address_zip: form.address_zip?.trim() || null,
                address_country: form.address_country?.trim() || null,
                job_title: form.job_title?.trim() || null,
                department: form.department?.trim() || null,
                company: form.company?.trim() || null,
                external_id: form.external_id?.trim() || null,
            });
            setEditing(false);
        } catch (err) {
            console.error("Failed to save profile", err);
        }
    }

    async function handleToggleSubscriptionAsync(channel: Channel, nextStatus: "subscribed" | "unsubscribed") {
        if (!account || !profileId) return;
        const current = (subs ?? []).find((s) => s.channel === channel && s.is_primary);
        const address =
            channel === "email" ? profile?.email :
            channel === "sms" ? profile?.phone :
            profile?.device_id;

        try {
            if (current) {
                await store().updateAsync(typeDefs.ChannelSubscription, current.id, {
                    status: nextStatus,
                    address: address || current.address || null,
                    unsubscribed_at: nextStatus === "unsubscribed" ? new Date().toISOString() : null,
                    subscribed_at: nextStatus === "subscribed" ? new Date().toISOString() : current.subscribed_at || null,
                });
            } else {
                await store().insertAsync(typeDefs.ChannelSubscription, {
                    account_id: account.id,
                    profile_id: profileId,
                    channel,
                    status: nextStatus,
                    address: address || undefined,
                    is_primary: true,
                    subscribed_at: nextStatus === "subscribed" ? new Date().toISOString() : undefined,
                });
            }
        } catch (err) {
            console.error("Failed to toggle subscription", err);
        }
    }

    function downloadBlob(content: string, filename: string, type = "text/plain") {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportProfileJSON() {
        if (!profile) return;
        downloadBlob(JSON.stringify(profile, null, 2), `profile-${profile.id}.json`, "application/json");
    }

    function exportProfileCSV() {
        if (!profile) return;
        const headers = [
            "id",
            "created_at",
            "first_name",
            "last_name",
            "email",
            "phone",
            "device_id",
            "address_street",
            "address_city",
            "address_state",
            "address_zip",
            "address_country",
            "job_title",
            "department",
            "company",
            "external_id",
        ];
        const values = headers.map((h) => (profile as any)[h] ?? "");
        const csv = [headers.join(","), values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")].join("\n");
        downloadBlob(csv, `profile-${profile.id}.csv`, "text/csv");
    }

    function exportEventsCSV() {
        if (!filteredEvents) return;
        const headers = [
            "id",
            "occurred_at",
            "event_type",
            "channel",
            "page_url",
            "message_id",
            "agent_id",
            "order_id",
            "product_id",
            "revenue",
            "currency",
            "properties",
        ];
        const rows = filteredEvents.map((e) => [
            e.id,
            e.occurred_at,
            e.event_type,
            e.channel ?? "",
            e.page_url ?? "",
            e.message_id ?? "",
            e.agent_id ?? "",
            e.order_id ?? "",
            e.product_id ?? "",
            e.revenue ?? "",
            e.currency ?? "",
            JSON.stringify(e.properties || {}),
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
        downloadBlob(csv, `events-${profileId}.csv`, "text/csv");
    }

    async function handleEnrichAsync() {
        if (!profile || !profileId) return;
        try {
            const attrs = { ...(profile.attributes || {}), enriched_at: new Date().toISOString() };
            await store().updateAsync(typeDefs.Profile, profileId, { attributes: attrs as any });
        } catch (err) {
            console.error("Enrichment failed", err);
        }
    }

    // Segment add/remove
    const [addSegmentOpen, setAddSegmentOpen] = useState(false);
    const [segmentSearch, setSegmentSearch] = useState("");

    const availableSegments = useMemo(() => {
        const list = allSegments ?? [];
        const memberIds = new Set((memberships ?? []).map((m) => m.segment_id));
        const filtered = list.filter((s) => !memberIds.has(s.id));
        if (!segmentSearch.trim()) return filtered;
        const q = segmentSearch.toLowerCase();
        return filtered.filter((s) => s.name.toLowerCase().includes(q));
    }, [allSegments, memberships, segmentSearch]);

    async function addToSegmentAsync(segmentId: string) {
        if (!account || !profileId) return;
        try {
            await store().insertAsync(typeDefs.SegmentProfile, {
                account_id: account.id,
                segment_id: segmentId,
                profile_id: profileId,
            });
            setAddSegmentOpen(false);
            setSegmentSearch("");
        } catch (err) {
            console.error("Failed adding to segment", err);
        }
    }

    async function removeFromSegmentAsync(membershipId: string) {
        try {
            await store().deleteAsync(typeDefs.SegmentProfile, membershipId);
        } catch (err) {
            console.error("Failed removing from segment", err);
        }
    }

    // Guard: auth
    if (user === undefined) {
        return (
            <div className="page--ProfileDetailPage container-page">
                <SignInRequired message="You must sign in to view profile details." />
            </div>
        );
    }
    if (user === null || account === null || role === null) {
        // loading
        return (
            <div className="page--ProfileDetailPage container-page space-y-4">
                <div className="skeleton h-8 w-64" />
                <section className="content-2col">
                    <div className="space-y-3">
                        <div className="card h-64 skeleton" />
                        <div className="card h-80 skeleton" />
                        <div className="card h-96 skeleton" />
                    </div>
                    <aside className="right-rail space-y-3">
                        <div className="card h-40 skeleton" />
                        <div className="card h-56 skeleton" />
                        <div className="card h-40 skeleton" />
                    </aside>
                </section>
            </div>
        );
    }

    // Missing id
    if (!profileId) {
        return (
            <div className="page--ProfileDetailPage container-page space-y-4">
                <div className="alert info">
                    <div className="font-semibold">No profile selected</div>
                    <div className="text-[var(--text-2)]">
                        Open this page from the Profiles list or append ?id={"{profile_id}"} to the URL.
                    </div>
                </div>
                <Link className="link" href="/profiles">
                    Back to Profiles
                </Link>
            </div>
        );
    }

    const profileLoading = profile === null;
    const attributesObj = (profile && profile.attributes) || {};

    return (
        <div className="page--ProfileDetailPage space-y-4">
            {/* Header with actions */}
            <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--surface-3)]">
                        <Smartphone className="w-5 h-5 text-[var(--text-3)]" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="section-title text-xl">{name}</h1>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {primarySubByChannel.email && (
                                <span className={cn("chip", "channel", "email")}>
                                    Email: {primarySubByChannel.email.status}
                                </span>
                            )}
                            {primarySubByChannel.sms && (
                                <span className={cn("chip", "channel", "sms")}>
                                    SMS: {primarySubByChannel.sms.status}
                                </span>
                            )}
                            {primarySubByChannel.push && (
                                <span className={cn("chip", "channel", "push")}>
                                    Push: {primarySubByChannel.push.status}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="btn btn-secondary" onClick={exportEventsCSV}>
                        <FileDown className="w-4 h-4 mr-2" />
                        Download Events CSV
                    </button>
                    <button className="btn btn-secondary" onClick={exportProfileJSON}>
                        <FileDown className="w-4 h-4 mr-2" />
                        Export JSON
                    </button>
                    <button className="btn btn-secondary" onClick={exportProfileCSV}>
                        <FileDown className="w-4 h-4 mr-2" />
                        Export CSV
                    </button>
                    <button
                        className={cn("btn", canEdit ? "btn-primary" : "btn-secondary")}
                        onClick={handleEnrichAsync}
                        disabled={!canEdit}
                        title={!canEdit ? "Guests cannot enrich profiles" : "Enrich profile now"}
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Enrich
                    </button>
                    {!editing ? (
                        <button
                            className="btn btn-primary"
                            onClick={() => setEditing(true)}
                            disabled={!canEdit || profileLoading}
                            title={!canEdit ? "Guests cannot edit" : "Edit profile"}
                        >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                        </button>
                    ) : (
                        <>
                            <button className="btn btn-secondary" onClick={() => setEditing(false)}>
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveAsync}>
                                <Save className="w-4 h-4 mr-2" />
                                Save
                            </button>
                        </>
                    )}
                </div>
            </header>

            <section className="content-2col">
                {/* Primary column */}
                <div className="space-y-3">
                    {/* Contact card */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Contact</div>
                            <div className="card-subtitle">Identity, contact information, and addresses</div>
                        </div>

                        {profileLoading ? (
                            <div className="space-y-2">
                                <div className="skeleton h-6 w-1/2" />
                                <div className="skeleton h-6 w-1/3" />
                                <div className="skeleton h-6 w-2/3" />
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="field">
                                    <label className="label">First name</label>
                                    <input
                                        className="input"
                                        placeholder="First name"
                                        value={form?.first_name ?? ""}
                                        onChange={(e) => setForm({ ...(form || {}), first_name: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                                <div className="field">
                                    <label className="label">Last name</label>
                                    <input
                                        className="input"
                                        placeholder="Last name"
                                        value={form?.last_name ?? ""}
                                        onChange={(e) => setForm({ ...(form || {}), last_name: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>

                                <div className="field">
                                    <label className="label">Email</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="input flex-1"
                                            placeholder="name@example.com"
                                            value={form?.email ?? ""}
                                            onChange={(e) => setForm({ ...(form || {}), email: e.target.value })}
                                            disabled={!editing}
                                            type="email"
                                        />
                                        <button
                                            className="btn btn-secondary btn-icon"
                                            aria-label="Copy email"
                                            onClick={() => copyToClipboard(form?.email)}
                                        >
                                            <Clipboard className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="field">
                                    <label className="label">Phone</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="input flex-1"
                                            placeholder="+1 (555) 555-1234"
                                            value={form?.phone ?? ""}
                                            onChange={(e) => setForm({ ...(form || {}), phone: e.target.value })}
                                            disabled={!editing}
                                        />
                                        <button
                                            className="btn btn-secondary btn-icon"
                                            aria-label="Copy phone"
                                            onClick={() => copyToClipboard(form?.phone)}
                                        >
                                            <Clipboard className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="field">
                                    <label className="label">Device ID</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="input flex-1"
                                            placeholder="device-identifier"
                                            value={form?.device_id ?? ""}
                                            onChange={(e) => setForm({ ...(form || {}), device_id: e.target.value })}
                                            disabled={!editing}
                                        />
                                        <button
                                            className="btn btn-secondary btn-icon"
                                            aria-label="Copy device id"
                                            onClick={() => copyToClipboard(form?.device_id)}
                                        >
                                            <Clipboard className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="field md:col-span-2">
                                    <label className="label">Street</label>
                                    <input
                                        className="input"
                                        placeholder="Street address"
                                        value={form?.address_street ?? ""}
                                        onChange={(e) => setForm({ ...(form || {}), address_street: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>

                                <div className="field">
                                    <label className="label">City</label>
                                    <input
                                        className="input"
                                        placeholder="City"
                                        value={form?.address_city ?? ""}
                                        onChange={(e) => setForm({ ...(form || {}), address_city: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>

                                <div className="field">
                                    <label className="label">State/Region</label>
                                    <input
                                        className="input"
                                        placeholder="State or region"
                                        value={form?.address_state ?? ""}
                                        onChange={(e) => setForm({ ...(form || {}), address_state: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>

                                <div className="field">
                                    <label className="label">Postal/ZIP</label>
                                    <input
                                        className="input"
                                        placeholder="ZIP"
                                        value={form?.address_zip ?? ""}
                                        onChange={(e) => setForm({ ...(form || {}), address_zip: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>

                                <div className="field">
                                    <label className="label">Country</label>
                                    <input
                                        className="input"
                                        placeholder="Country"
                                        value={form?.address_country ?? ""}
                                        onChange={(e) => setForm({ ...(form || {}), address_country: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>

                                <div className="field">
                                    <label className="label">Job title</label>
                                    <input
                                        className="input"
                                        placeholder="e.g., Director of Marketing"
                                        value={form?.job_title ?? ""}
                                        onChange={(e) => setForm({ ...(form || {}), job_title: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>

                                <div className="field">
                                    <label className="label">Department</label>
                                    <input
                                        className="input"
                                        placeholder="e.g., Marketing"
                                        value={form?.department ?? ""}
                                        onChange={(e) => setForm({ ...(form || {}), department: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>

                                <div className="field">
                                    <label className="label">Company</label>
                                    <input
                                        className="input"
                                        placeholder="Company"
                                        value={form?.company ?? ""}
                                        onChange={(e) => setForm({ ...(form || {}), company: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>

                                <div className="field">
                                    <label className="label">External ID</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="input flex-1"
                                            placeholder="External/CRM ID"
                                            value={form?.external_id ?? ""}
                                            onChange={(e) => setForm({ ...(form || {}), external_id: e.target.value })}
                                            disabled={!editing}
                                        />
                                        <button
                                            className="btn btn-secondary btn-icon"
                                            aria-label="Copy external id"
                                            onClick={() => copyToClipboard(form?.external_id)}
                                        >
                                            <Clipboard className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="field md:col-span-2">
                                    <label className="label">Profile ID</label>
                                    <div className="flex gap-2">
                                        <input className="input flex-1" value={profile?.id ?? ""} disabled />
                                        <button
                                            className="btn btn-secondary btn-icon"
                                            aria-label="Copy profile id"
                                            onClick={() => copyToClipboard(profile?.id)}
                                        >
                                            <Clipboard className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Attributes */}
                    <AttributesCard attributes={attributesObj} />

                    {/* Event History */}
                    <div className="card">
                        <div className="card-header">
                            <div className="flex flex-col">
                                <div className="card-title">Event history</div>
                                <div className="card-subtitle">Web, messaging, and ecommerce activity</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--text-3)]">Type</span>
                                    <select
                                        className="select"
                                        value={filters.eventType}
                                        onChange={(e) =>
                                            setFilters((f) => ({ ...f, eventType: e.target.value as any }))
                                        }
                                    >
                                        <option value="all">All</option>
                                        {[
                                            "page_view",
                                            "session_start",
                                            "form_submit",
                                            "message_sent",
                                            "message_open",
                                            "message_click",
                                            "message_bounce",
                                            "subscriber_new",
                                            "subscriber_removed",
                                            "add_to_cart",
                                            "favorite",
                                            "checkout_started",
                                            "checkout_abandoned",
                                            "purchase",
                                            "push_open",
                                        ].map((et) => (
                                            <option key={et} value={et}>
                                                {et}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--text-3)]">Channel</span>
                                    <select
                                        className="select"
                                        value={filters.channel}
                                        onChange={(e) =>
                                            setFilters((f) => ({ ...f, channel: e.target.value as any }))
                                        }
                                    >
                                        <option value="all">All</option>
                                        <option value="email">Email</option>
                                        <option value="sms">SMS</option>
                                        <option value="push">Push</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-[var(--text-3)]" />
                                    <input
                                        type="date"
                                        className="input w-[11rem]"
                                        value={filters.from}
                                        onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                                    />
                                    <span className="text-[var(--text-3)]">to</span>
                                    <input
                                        type="date"
                                        className="input w-[11rem]"
                                        value={filters.to}
                                        onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[var(--text-3)]">Sort</span>
                                    <select
                                        className="select"
                                        value={filters.sort}
                                        onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as any }))}
                                    >
                                        <option value="newest">Newest</option>
                                        <option value="oldest">Oldest</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Search className="w-4 h-4 text-[var(--text-3)]" />
                                    <input
                                        className="input w-[14rem]"
                                        placeholder="Search URL, order, message, meta"
                                        value={filters.q}
                                        onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="divider" />

                        {filteredEvents === null ? (
                            <div className="p-3 text-[var(--text-3)]">Loading events…</div>
                        ) : !filteredEvents || filteredEvents.length === 0 ? (
                            <div className="p-3 text-[var(--text-3)]">No events found for the selected filters.</div>
                        ) : (
                            <div className="space-y-2">
                                {filteredEvents.map((e) => (
                                    <div key={e.id} className="flex items-start gap-3 p-3 rounded border border-[var(--border)] hover:border-brand-subtle transition">
                                        <div className="mt-0.5">{eventIcon(e.event_type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold">{e.event_type}</span>
                                                {e.channel && <span className={cn("chip", "channel", e.channel)}>{e.channel}</span>}
                                                <span className="text-[var(--text-3)]">{asDateString(e.occurred_at)}</span>
                                            </div>
                                            <div className="mt-1 text-[var(--text-2)] break-words">
                                                {e.page_url && (
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="w-4 h-4 text-[var(--text-3)]" />
                                                        <a className="link truncate" href={e.page_url} target="_blank" rel="noreferrer">
                                                            {e.page_url}
                                                        </a>
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-3 mt-1">
                                                    {e.order_id && (
                                                        <div className="chip">Order: {e.order_id}</div>
                                                    )}
                                                    {e.product_id && (
                                                        <div className="chip">Product: {e.product_id}</div>
                                                    )}
                                                    {typeof e.revenue === "number" && (
                                                        <div className="chip">Revenue: {formatMoney(e.revenue, e.currency || "USD")}</div>
                                                    )}
                                                    {e.message_id && (
                                                        <Link className="chip no-underline" href={`/message-detail?id=${e.message_id}`}>
                                                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                                            Message
                                                        </Link>
                                                    )}
                                                    {e.agent_id && (
                                                        <Link className="chip no-underline" href={`/agent-detail?id=${e.agent_id}`}>
                                                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                                            Agent
                                                        </Link>
                                                    )}
                                                </div>
                                                {e.properties && Object.keys(e.properties).length > 0 && (
                                                    <div className="mt-2 text-[var(--text-3)] text-xs break-words">
                                                        {JSON.stringify(e.properties)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <button
                                                className="btn btn-secondary btn-icon"
                                                aria-label="Copy event id"
                                                onClick={() => copyToClipboard(e.id)}
                                            >
                                                <Clipboard className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right rail */}
                <aside className="right-rail space-y-3">
                    {/* KPIs */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">KPIs</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="kpi">
                                <div className="kpi-label">Total Orders</div>
                                <div className="kpi-value">{kpis.totalOrders.toLocaleString()}</div>
                                <div className="kpi-delta text-[var(--text-3)]">–</div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">AOV</div>
                                <div className="kpi-value">{formatMoney(kpis.aov, kpis.currency)}</div>
                                <div className="kpi-delta text-[var(--text-3)]">–</div>
                            </div>
                            <div className="kpi col-span-2">
                                <div className="kpi-label">Lifetime Value</div>
                                <div className="kpi-value">{formatMoney(kpis.ltv, kpis.currency)}</div>
                                <div className="kpi-delta text-[var(--text-3)]">–</div>
                            </div>
                        </div>
                    </div>

                    {/* Subscriptions */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Channel subscriptions</div>
                        </div>
                        <div className="space-y-2">
                            {(["email", "sms", "push"] as Channel[]).map((ch) => {
                                const sub = (subs ?? []).find((s) => s.channel === ch && s.is_primary);
                                const address =
                                    ch === "email" ? profile?.email :
                                    ch === "sms" ? profile?.phone :
                                    profile?.device_id;
                                const status = sub?.status || "unsubscribed";
                                const isSubscribed = status === "subscribed";
                                return (
                                    <div key={ch} className="flex items-center justify-between p-2 rounded border border-[var(--border)]">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {channelIcon(ch)}
                                            <div className="truncate">
                                                <div className="font-semibold capitalize">{ch}</div>
                                                <div className="text-[var(--text-3)] truncate">{address || sub?.address || "—"}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={statusBadgeClass(sub?.status)}>{sub?.status ?? "unsubscribed"}</span>
                                            <button
                                                className={cn("btn", isSubscribed ? "btn-secondary" : "btn-primary")}
                                                disabled={!canEdit}
                                                onClick={() => handleToggleSubscriptionAsync(ch, isSubscribed ? "unsubscribed" : "subscribed")}
                                                title={!canEdit ? "Guests cannot manage subscriptions" : undefined}
                                            >
                                                {isSubscribed ? "Unsubscribe" : "Subscribe"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Segments */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Segments</div>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setAddSegmentOpen((v) => !v)}
                                disabled={!canEdit}
                                title={!canEdit ? "Guests cannot edit segment membership" : undefined}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add to Segment
                            </button>
                        </div>

                        {addSegmentOpen && (
                            <div className="p-2 border rounded border-[var(--border)] space-y-2">
                                <input
                                    className="input w-full"
                                    placeholder="Search segments"
                                    value={segmentSearch}
                                    onChange={(e) => setSegmentSearch(e.target.value)}
                                />
                                <div className="max-h-48 overflow-auto space-y-1">
                                    {availableSegments === null ? (
                                        <div className="text-[var(--text-3)] p-2">Loading segments…</div>
                                    ) : (availableSegments ?? []).length === 0 ? (
                                        <div className="text-[var(--text-3)] p-2">No segments available.</div>
                                    ) : (
                                        availableSegments!.map((s) => (
                                            <div key={s.id} className="flex items-center justify-between p-2 rounded hover:bg-[var(--surface-2)]">
                                                <div className="truncate">{s.name}</div>
                                                <button className="btn btn-primary" onClick={() => addToSegmentAsync(s.id)}>
                                                    Add
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-2 space-y-2">
                            {memberships === null ? (
                                <div className="text-[var(--text-3)]">Loading membership…</div>
                            ) : (memberships ?? []).length === 0 ? (
                                <div className="text-[var(--text-3)]">Not a member of any segments.</div>
                            ) : (
                                (memberships ?? []).map((m) => (
                                    <SegmentRow
                                        key={m.id}
                                        membership={m}
                                        canEdit={canEdit}
                                        onRemove={() => removeFromSegmentAsync(m.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Quick actions</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button className="btn btn-secondary" onClick={exportEventsCSV}>
                                <FileDown className="w-4 h-4 mr-2" />
                                Download filtered events
                            </button>
                            <Link className="btn btn-secondary no-underline" href="/segments">
                                Manage segments
                            </Link>
                            <Link className="btn btn-secondary no-underline" href="/messages">
                                Browse messages
                            </Link>
                        </div>
                    </div>
                </aside>
            </section>
        </div>
    );
}

function AttributesCard({ attributes }: { attributes: Record<string, any> }) {
    const [showJson, setShowJson] = useState(false);
    const keys = Object.keys(attributes || {});
    const previewPairs = keys.slice(0, 10);

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-title">Attributes</div>
                <button className="btn btn-secondary" onClick={() => setShowJson((v) => !v)}>
                    <Hash className="w-4 h-4 mr-2" />
                    {showJson ? "Hide JSON" : "View JSON"}
                </button>
            </div>

            {!attributes || keys.length === 0 ? (
                <div className="text-[var(--text-3)]">No attributes available.</div>
            ) : showJson ? (
                <pre className="p-3 rounded bg-[var(--surface-2)] overflow-auto text-xs">{JSON.stringify(attributes, null, 2)}</pre>
            ) : (
                <div className="grid gap-2 md:grid-cols-2">
                    {previewPairs.map((k) => (
                        <div key={k} className="p-2 rounded border border-[var(--border)]">
                            <div className="text-[var(--text-3)] text-xs">{k}</div>
                            <div className="truncate">{renderValue(attributes[k])}</div>
                        </div>
                    ))}
                    {keys.length > previewPairs.length && (
                        <div className="text-[var(--text-3)]">+{keys.length - previewPairs.length} more keys (view JSON)</div>
                    )}
                </div>
            )}
        </div>
    );
}

function renderValue(v: any): string {
    if (v === null || v === undefined) return "—";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
    try {
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
}

function SegmentRow({
    membership,
    canEdit,
    onRemove,
}: {
    membership: DbSegmentProfile;
    canEdit: boolean;
    onRemove: () => void;
}) {
    // Load the segment info per membership
    const segment = useStoreItem<DbSegment>(typeDefs.Segment, membership.segment_id);

    return (
        <div className="flex items-center justify-between p-2 rounded border border-[var(--border)]">
            <Link className="no-underline flex items-center gap-2 min-w-0" href={`/segment-detail?id=${membership.segment_id}`}>
                <Users className="w-4 h-4 text-[var(--text-3)]" />
                <div className="truncate">{segment?.name ?? "Segment"}</div>
            </Link>
            <div className="flex items-center gap-2">
                <span className="text-[var(--text-3)] text-xs">{segment?.is_dynamic ? "Dynamic" : "Static"}</span>
                {!segment?.is_dynamic && (
                    <button className="btn btn-secondary" disabled={!canEdit} onClick={onRemove}>
                        Remove
                    </button>
                )}
            </div>
        </div>
    );
}