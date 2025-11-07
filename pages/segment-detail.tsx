import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    useAccount,
    useCurrentUser,
    useUserRole,
    useStoreItem,
} from "@/lib/hooks";
import { store } from "@/lib/store";
import { cn } from "@/lib/util";
import { SignInRequired } from "@/components/SignInRequired";
import {
    typeDefs,
    Segment,
    SegmentProfile,
    Profile,
    ChannelSubscription,
    Event,
} from "@/lib/schema";
import {
    CalendarClock,
    Copy,
    Download,
    Edit3,
    ExternalLink,
    Filter,
    MoreHorizontal,
    RefreshCw,
    Search,
    Sparkles,
    Trash2,
    Users2,
    Mail,
    MessageSquareText,
    Bell,
    ChevronLeft,
    ChevronRight,
    Shield,
    Info,
    Loader2,
    PlusCircle,
} from "lucide-react";

type Timeframe = "30d" | "90d" | "all";

function formatNumber(n: number | undefined | null): string {
    if (!n) return "0";
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function formatCurrency(n: number | undefined | null): string {
    if (!n) return "$0";
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(n);
}

function formatDate(d?: string): string {
    if (!d) return "—";
    try {
        const dt = new Date(d);
        return dt.toLocaleString();
    } catch {
        return d;
    }
}

function fullName(p: Profile): string {
    const fn = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
    return fn || p.email || p.phone || p.device_id || p.external_id || "(unknown)";
}

function pick<T>(val: T | null | undefined): T | undefined {
    return val === null ? undefined : val;
}

function withinTimeframe(occurredAt: string, tf: Timeframe): boolean {
    if (tf === "all") return true;
    const now = Date.now();
    const dt = new Date(occurredAt).getTime();
    const days = tf === "30d" ? 30 : 90;
    return dt >= now - days * 24 * 60 * 60 * 1000;
}

export default function SegmentDetailPage() {
    const router = useRouter();
    const id = typeof router.query.id === "string" ? router.query.id : undefined;

    const user = useCurrentUser();
    const role = useUserRole();
    const account = useAccount();

    const isLoadingUser = user === null || role === null || account === null;
    const isSignedOut = user === undefined;

    const isGuest = role === "guest";
    const isAdmin = role === "admin";

    const segment = useStoreItem<Segment>(typeDefs.Segment, id);

    const [segmentProfiles, setSegmentProfiles] = useState<SegmentProfile[] | null>(null);
    const [profiles, setProfiles] = useState<Profile[] | null>(null);
    const [subs, setSubs] = useState<ChannelSubscription[] | null>(null);
    const [events, setEvents] = useState<Event[] | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [loadError, setLoadError] = useState<string | undefined>(undefined);

    const [timeframe, setTimeframe] = useState<Timeframe>("all");

    // UI state
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "date_added" | "ltv">("date_added");
    const [emailFilter, setEmailFilter] = useState<"any" | "subscribed" | "unsubscribed" | "bounced" | "pending">("any");
    const [smsFilter, setSmsFilter] = useState<"any" | "subscribed" | "unsubscribed" | "bounced" | "pending">("any");
    const [pushFilter, setPushFilter] = useState<"any" | "subscribed" | "unsubscribed" | "bounced" | "pending">("any");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [actionsOpen, setActionsOpen] = useState(false);
    const [editingOpen, setEditingOpen] = useState(false);
    const [editingName, setEditingName] = useState<string>("");
    const [editingDescription, setEditingDescription] = useState<string>("");
    const [editingCriteriaText, setEditingCriteriaText] = useState<string>("");

    const segmentLoaded = segment && segment !== null;
    const seg = (segment as Segment) || undefined;

    // Load membership, profiles, subscriptions, and events
    const loadAllAsync = async (segId?: string) => {
        if (!segId) return;
        setLoadingData(true);
        setLoadError(undefined);
        try {
            // Segment profiles
            const sp = (await store().selectMatchesAsync<SegmentProfile>(typeDefs.SegmentProfile, { segment_id: segId }, { orderBy: "added_at", orderByDesc: true })) as SegmentProfile[];
            setSegmentProfiles(sp);

            const profileIds = sp.map((m) => m.profile_id);
            if (profileIds.length === 0) {
                setProfiles([]);
                setSubs([]);
                setEvents([]);
                return;
            }

            // Fetch profiles by ids (assuming IN match supported by store implementation)
            const profs = (await store().selectMatchesAsync<Profile>(typeDefs.Profile, { id: profileIds as any })) as Profile[];
            setProfiles(profs);

            // Channel subscriptions for members
            const subRows = (await store().selectMatchesAsync<ChannelSubscription>(typeDefs.ChannelSubscription, { profile_id: profileIds as any })) as ChannelSubscription[];
            setSubs(subRows);

            // Events for KPI (purchases, opens/clicks etc.)
            const ev = (await store().selectMatchesAsync<Event>(typeDefs.Event, { profile_id: profileIds as any })) as Event[];
            setEvents(ev);
        } catch (err: any) {
            console.error(err);
            setLoadError(err?.message || "Failed to load segment data");
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        if (seg?.id) {
            loadAllAsync(seg.id);
        }
    }, [seg?.id]);

    // Prepare edit modal defaults when segment loads
    useEffect(() => {
        if (seg) {
            setEditingName(seg.name || "");
            setEditingDescription(seg.description || "");
            try {
                setEditingCriteriaText(JSON.stringify(seg.criteria ?? {}, null, 2));
            } catch {
                setEditingCriteriaText("{}");
            }
        }
    }, [seg?.id]);

    // Derived maps
    const spMapByProfileId = useMemo(() => {
        const m: Record<string, SegmentProfile> = {};
        (segmentProfiles || []).forEach((sp) => (m[sp.profile_id] = sp));
        return m;
    }, [segmentProfiles]);

    const subsByProfile = useMemo(() => {
        const m: Record<string, ChannelSubscription[]> = {};
        (subs || []).forEach((s) => {
            if (!m[s.profile_id]) m[s.profile_id] = [];
            m[s.profile_id].push(s);
        });
        return m;
    }, [subs]);

    const ltvByProfile = useMemo(() => {
        const result: Record<string, number> = {};
        if (!events) return result;
        for (const e of events) {
            if (e.event_type === "purchase" && typeof e.revenue === "number" && e.profile_id) {
                if (!result[e.profile_id]) result[e.profile_id] = 0;
                if (withinTimeframe(e.occurred_at, timeframe)) {
                    result[e.profile_id] += e.revenue || 0;
                }
            }
        }
        return result;
    }, [events, timeframe]);

    const ordersCount = useMemo(() => {
        if (!events) return 0;
        return events.filter((e) => e.event_type === "purchase" && withinTimeframe(e.occurred_at, timeframe)).length;
    }, [events, timeframe]);

    const revenueSum = useMemo(() => {
        if (!events) return 0;
        return events
            .filter((e) => e.event_type === "purchase" && withinTimeframe(e.occurred_at, timeframe))
            .reduce((sum, e) => sum + (e.revenue || 0), 0);
    }, [events, timeframe]);

    const aov = useMemo(() => {
        const count = ordersCount || 0;
        if (count === 0) return 0;
        return revenueSum / count;
    }, [ordersCount, revenueSum]);

    const subscribedCounts = useMemo(() => {
        const counters = {
            email: { subscribed: 0, unsubscribed: 0, bounced: 0, pending: 0 },
            sms: { subscribed: 0, unsubscribed: 0, bounced: 0, pending: 0 },
            push: { subscribed: 0, unsubscribed: 0, bounced: 0, pending: 0 },
        } as Record<"email" | "sms" | "push", Record<"subscribed" | "unsubscribed" | "bounced" | "pending", number>>;
        (subs || []).forEach((s) => {
            const ch = s.channel as "email" | "sms" | "push";
            const st = (s.status as "subscribed" | "unsubscribed" | "bounced" | "pending") || "pending";
            if (counters[ch]) {
                counters[ch][st] = (counters[ch][st] || 0) + 1;
            }
        });
        return counters;
    }, [subs]);

    // Filter and sort profiles for membership table
    const filteredProfiles = useMemo(() => {
        let arr = (profiles || []).slice();

        // Search filter
        const q = search.trim().toLowerCase();
        if (q) {
            arr = arr.filter((p) => {
                const fields = [
                    fullName(p),
                    p.email || "",
                    p.phone || "",
                    p.device_id || "",
                    p.company || "",
                    p.job_title || "",
                    p.address_city || "",
                    p.address_state || "",
                    p.address_country || "",
                ]
                    .join(" ")
                    .toLowerCase();
                return fields.includes(q);
            });
        }

        // Channel filters
        const checkStatus = (p: Profile, channel: "email" | "sms" | "push", want: typeof emailFilter) => {
            if (want === "any") return true;
            const rows = (subsByProfile[p.id] || []).filter((s) => s.channel === channel);
            if (rows.length === 0) return want === "pending"; // treat no record as pending
            return rows.some((r) => (r.status as any) === want);
        };
        arr = arr.filter(
            (p) =>
                checkStatus(p, "email", emailFilter) &&
                checkStatus(p, "sms", smsFilter) &&
                checkStatus(p, "push", pushFilter)
        );

        // Sort
        if (sortBy === "name") {
            arr.sort((a, b) => fullName(a).localeCompare(fullName(b)));
        } else if (sortBy === "date_added") {
            arr.sort((a, b) => {
                const ad = spMapByProfileId[a.id]?.added_at || "";
                const bd = spMapByProfileId[b.id]?.added_at || "";
                return (new Date(bd).getTime() || 0) - (new Date(ad).getTime() || 0);
            });
        } else if (sortBy === "ltv") {
            arr.sort((a, b) => (ltvByProfile[b.id] || 0) - (ltvByProfile[a.id] || 0));
        }

        return arr;
    }, [profiles, search, emailFilter, smsFilter, pushFilter, sortBy, ltvByProfile, spMapByProfileId, subsByProfile]);

    // Pagination
    const totalRows = filteredProfiles?.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const pageStart = (page - 1) * pageSize;
    const pageEnd = pageStart + pageSize;
    const pageRows = filteredProfiles?.slice(pageStart, pageEnd) || [];

    useEffect(() => {
        // Reset to first page on filters/search change
        setPage(1);
    }, [search, emailFilter, smsFilter, pushFilter, sortBy, pageSize, timeframe]);

    const allSelectedOnPage = pageRows.length > 0 && pageRows.every((r) => selected[r.id]);
    const someSelectedOnPage = pageRows.some((r) => selected[r.id]);

    const toggleSelectAllOnPage = () => {
        const next = { ...selected };
        if (allSelectedOnPage) {
            pageRows.forEach((r) => delete next[r.id]);
        } else {
            pageRows.forEach((r) => (next[r.id] = true));
        }
        setSelected(next);
    };

    const clearSelection = () => setSelected({});

    // Actions
    const handleRefresh = async () => {
        await loadAllAsync(seg?.id);
    };

    const handleDuplicateAsync = async () => {
        if (!seg) return;
        try {
            const copyValue = {
                account_id: seg.account_id,
                name: `${seg.name} (Copy)`,
                description: seg.description,
                criteria: seg.criteria,
                is_dynamic: seg.is_dynamic,
            };
            await store().insertAsync(typeDefs.Segment, copyValue as any);
            setActionsOpen(false);
            window.alert("Segment duplicated.");
        } catch (err) {
            console.error(err);
            window.alert("Failed to duplicate segment.");
        }
    };

    const handleDeleteAsync = async () => {
        if (!seg) return;
        if (!isAdmin) return;
        if (!confirm(`Delete segment "${seg.name}"? This cannot be undone.`)) return;
        try {
            await store().deleteAsync(typeDefs.Segment, seg.id);
            router.push("/segments");
        } catch (err) {
            console.error(err);
            window.alert("Failed to delete segment.");
        }
    };

    const handleExportSelected = async () => {
        const selectedIds = Object.keys(selected).filter((k) => selected[k]);
        const rows = (profiles || []).filter((p) => selectedIds.includes(p.id));
        doExport(rows);
    };

    const handleExportAllFiltered = async () => {
        doExport(filteredProfiles || []);
    };

    const doExport = (rows: Profile[]) => {
        const header = [
            "Full Name",
            "Email",
            "Phone",
            "Device ID",
            "Date Added",
            "Company",
            "Job Title",
            "City",
            "State",
            "Country",
        ];
        const lines = [header.join(",")];
        for (const p of rows) {
            const added = spMapByProfileId[p.id]?.added_at || "";
            const line = [
                JSON.stringify(fullName(p)),
                JSON.stringify(p.email || ""),
                JSON.stringify(p.phone || ""),
                JSON.stringify(p.device_id || ""),
                JSON.stringify(added),
                JSON.stringify(p.company || ""),
                JSON.stringify(p.job_title || ""),
                JSON.stringify(p.address_city || ""),
                JSON.stringify(p.address_state || ""),
                JSON.stringify(p.address_country || ""),
            ].join(",");
            lines.push(line);
        }
        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${seg?.name || "segment"}-export.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleEnrichSelected = async () => {
        const selectedIds = Object.keys(selected).filter((k) => selected[k]);
        if (selectedIds.length === 0) {
            window.alert("Select at least one profile to enrich.");
            return;
        }
        // Placeholder enrichment flow
        window.alert(`Enrichment queued for ${selectedIds.length} profiles.`);
    };

    const handleEnrichAllFiltered = async () => {
        const count = filteredProfiles?.length || 0;
        if (count === 0) {
            window.alert("No profiles to enrich.");
            return;
        }
        window.alert(`Enrichment queued for ${count} profiles.`);
    };

    const handleSaveEditAsync = async () => {
        if (!seg) return;
        try {
            // Parse criteria JSON (basic editing affordance)
            let criteria: any = seg.criteria;
            try {
                criteria = JSON.parse(editingCriteriaText || "{}");
            } catch {
                // keep previous criteria if parse fails
            }
            await store().updateAsync(typeDefs.Segment, seg.id, {
                name: editingName.trim() || seg.name,
                description: editingDescription || null || undefined,
                criteria,
            } as any);
            setEditingOpen(false);
        } catch (err) {
            console.error(err);
            window.alert("Failed to save segment changes.");
        }
    };

    // Criteria chips from known keys
    const criteriaChips = useMemo(() => {
        const c = seg?.criteria || {};
        const chips: string[] = [];
        const pushVal = (label: string, val: any) => {
            if (val === undefined || val === null) return;
            if (Array.isArray(val)) {
                if (val.length === 0) return;
                chips.push(`${label}: ${val.join(" / ")}`);
            } else if (typeof val === "object") {
                const parts = Object.entries(val)
                    .filter(([, v]) => v !== undefined && v !== null && v !== "")
                    .map(([k, v]) => `${k}=${v}`);
                if (parts.length > 0) chips.push(`${label}: ${parts.join(", ")}`);
            } else {
                chips.push(`${label}: ${val}`);
            }
        };

        pushVal("Age", c.age_range || c.age);
        pushVal("Gender", c.gender);
        pushVal("Geo", c.geography || c.geo || { country: c.country, region: c.region, city: c.city, zip: c.zip });
        pushVal("Socioeconomic", c.socioeconomic_status || c.ses);
        pushVal("Marital", c.marital_status);
        pushVal("Children/Pets", c.children_pets || c.children || c.pets);

        // Behavior
        pushVal("Purchases", c.purchases);
        pushVal("Add-to-cart", c.add_to_cart);
        pushVal("Message opens", c.message_opens);
        pushVal("Message clicks", c.message_clicks);
        pushVal("Page views", c.page_views);
        pushVal("Product views", c.product_views);
        pushVal("Sessions", c.sessions);

        return chips;
    }, [seg?.criteria]);

    const lastUpdated = useMemo(() => {
        const dates = (segmentProfiles || []).map((m) => m.added_at).filter(Boolean);
        if (dates.length === 0) return seg?.created_at;
        dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        return dates[0];
    }, [segmentProfiles, seg?.created_at]);

    if (isLoadingUser || segment === null) {
        return (
            <div className="page--SegmentDetailPage container-page space-y-4">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[var(--surface-3)] skeleton" />
                        <div className="w-40 h-6 rounded bg-[var(--surface-3)] skeleton" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-28 h-9 rounded bg-[var(--surface-3)] skeleton" />
                        <div className="w-28 h-9 rounded bg-[var(--surface-3)] skeleton" />
                        <div className="w-36 h-9 rounded bg-[var(--surface-3)] skeleton" />
                    </div>
                </header>

                <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="card p-4">
                            <div className="w-24 h-4 rounded bg-[var(--surface-3)] skeleton mb-2" />
                            <div className="w-20 h-7 rounded bg-[var(--surface-3)] skeleton" />
                        </div>
                    ))}
                </section>

                <section className="content-2col">
                    <div className="space-y-3">
                        <div className="card p-4">
                            <div className="w-28 h-5 rounded bg-[var(--surface-3)] skeleton mb-3" />
                            <div className="flex flex-wrap gap-2">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="w-28 h-7 rounded-full bg-[var(--surface-3)] skeleton" />
                                ))}
                            </div>
                        </div>

                        <div className="card p-0">
                            <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
                                <div className="w-36 h-5 rounded bg-[var(--surface-3)] skeleton" />
                                <div className="w-64 h-9 rounded bg-[var(--surface-3)] skeleton" />
                            </div>
                            <div className="p-3">
                                <div className="w-full h-32 rounded bg-[var(--surface-3)] skeleton" />
                            </div>
                        </div>
                    </div>

                    <aside className="right-rail space-y-3">
                        <div className="card p-4">
                            <div className="w-24 h-5 rounded bg-[var(--surface-3)] skeleton mb-3" />
                            <div className="w-full h-24 rounded bg-[var(--surface-3)] skeleton" />
                        </div>
                        <div className="card p-4">
                            <div className="w-24 h-5 rounded bg-[var(--surface-3)] skeleton mb-3" />
                            <div className="w-full h-16 rounded bg-[var(--surface-3)] skeleton" />
                        </div>
                    </aside>
                </section>
            </div>
        );
    }

    if (isSignedOut) {
        return (
            <div className="page--SegmentDetailPage container-page">
                <SignInRequired message="Sign in to view segment details." />
            </div>
        );
    }

    if (!id) {
        return (
            <div className="page--SegmentDetailPage container-page space-y-4">
                <div className="alert info">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        <div className="font-semibold">No segment selected</div>
                    </div>
                    <div className="text-[var(--text-2)]">Open this page with a segment id: /segment-detail?id=SEGMENT_ID</div>
                </div>
                <Link className="link" href="/segments">Back to Segments</Link>
            </div>
        );
    }

    if (segment === undefined) {
        return (
            <div className="page--SegmentDetailPage container-page space-y-4">
                <div className="alert danger">
                    <div className="font-semibold">Segment not found</div>
                    <div className="text-[var(--text-2)]">The requested segment could not be located.</div>
                </div>
                <Link className="link" href="/segments">Back to Segments</Link>
            </div>
        );
    }

    const memberCount = profiles?.length || 0;

    return (
        <div className="page--SegmentDetailPage space-y-4">
            <header className="container-page flex items-center justify-between">
                <div className="flex items-start md:items-center gap-3 flex-col md:flex-row">
                    <div className="flex items-center gap-2">
                        <Users2 className="w-6 h-6 text-[var(--text-2)]" />
                        <h1 className="section-title text-xl">{seg?.name || "Segment"}</h1>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("badge", seg?.is_dynamic ? "accent" : "")}>
                            {seg?.is_dynamic ? "Dynamic" : "Static"}
                        </span>
                        <span className="badge">{formatNumber(memberCount)} members</span>
                        <span className="badge" title={formatDate(lastUpdated)}>
                            <CalendarClock className="w-3.5 h-3.5 mr-1" />
                            Updated {formatDate(lastUpdated)}
                        </span>
                        {isGuest && (
                            <span className="badge warning" title="View-only access">
                                <Shield className="w-3.5 h-3.5 mr-1" />
                                Guest
                            </span>
                        )}
                    </div>
                    {seg?.description && <div className="text-[var(--text-2)]">{seg.description}</div>}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setEditingOpen(true)}
                        disabled={isGuest}
                        title={isGuest ? "Guests cannot edit" : "Edit segment"}
                    >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => (isGuest ? undefined : handleExportAllFiltered())}
                        disabled={isGuest || (filteredProfiles || []).length === 0}
                        title={isGuest ? "Guests cannot export" : "Export all filtered"}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => (isGuest ? undefined : handleEnrichAllFiltered())}
                        disabled={isGuest || (filteredProfiles || []).length === 0}
                        title={isGuest ? "Guests cannot enrich" : "Enrich all filtered"}
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Enrich
                    </button>
                    <Link
                        href={`/create-agent?segmentId=${encodeURIComponent(seg?.id || "")}`}
                        className="btn btn-primary"
                        title="Create decisioning agent with this segment"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Create Agent
                    </Link>
                    <button className="btn btn-secondary btn-icon" aria-label="Refresh metrics" onClick={handleRefresh} title="Refresh">
                        {loadingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                    <div className="relative">
                        <button
                            className="btn btn-secondary btn-icon"
                            aria-haspopup="menu"
                            aria-expanded={actionsOpen}
                            aria-label="More actions"
                            onClick={() => setActionsOpen((v) => !v)}
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {actionsOpen && (
                            <div className="absolute right-0 mt-2 min-w-[14rem] card p-2 z-50">
                                <button className="navlink w-full text-left" onClick={handleDuplicateAsync}>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicate segment
                                </button>
                                <div className="divider my-2" />
                                <button
                                    className="navlink danger w-full text-left"
                                    onClick={handleDeleteAsync}
                                    disabled={!isAdmin}
                                    title={isAdmin ? "Delete segment" : "Only admins can delete"}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete segment
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* KPI Summary */}
            <section className="container-page">
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Segment KPIs</div>
                        <div className="flex items-center gap-2">
                            <div className="field">
                                <select
                                    className="select"
                                    value={timeframe}
                                    onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                                >
                                    <option value="30d">Last 30 days</option>
                                    <option value="90d">Last 90 days</option>
                                    <option value="all">All time</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3">
                        <div className="kpi">
                            <div className="kpi-label">Total Orders</div>
                            <div className="kpi-value">{formatNumber(ordersCount)}</div>
                            <div className="kpi-delta text-[var(--text-3)]">—</div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">AOV</div>
                            <div className="kpi-value">{formatCurrency(aov)}</div>
                            <div className="kpi-delta text-[var(--text-3)]">—</div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Aggregate LTV</div>
                            <div className="kpi-value">{formatCurrency(revenueSum)}</div>
                            <div className="kpi-delta text-[var(--text-3)]">—</div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Subscribers (by channel)</div>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1">
                                    <span className="channel email"><Mail className="w-3.5 h-3.5" /></span>
                                    <span className="badge brand">{formatNumber(subscribedCounts.email.subscribed)}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="channel sms"><MessageSquareText className="w-3.5 h-3.5" /></span>
                                    <span className="badge brand">{formatNumber(subscribedCounts.sms.subscribed)}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="channel push"><Bell className="w-3.5 h-3.5" /></span>
                                    <span className="badge brand">{formatNumber(subscribedCounts.push.subscribed)}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Two-column: Criteria + Membership / Right rail */}
            <section className="container-page content-2col">
                <div className="space-y-3">
                    {/* Criteria */}
                    <div className="card">
                        <div className="card-header">
                            <div className="flex flex-col">
                                <div className="card-title">Criteria</div>
                                <div className="card-subtitle">Demographics and behavior filters</div>
                            </div>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setEditingOpen(true)}
                                disabled={isGuest}
                                title={isGuest ? "Guests cannot edit" : "Edit criteria"}
                            >
                                <Edit3 className="w-4 h-4 mr-2" />
                                Edit Criteria
                            </button>
                        </div>
                        <div className="p-3">
                            {criteriaChips.length === 0 ? (
                                <div className="alert info">
                                    <div className="font-semibold">No criteria defined</div>
                                    <div className="text-[var(--text-2)]">
                                        Define segment rules to build a targeted audience. You can also enrich profiles to unlock more filters.
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {criteriaChips.map((c, i) => (
                                        <span key={i} className="chip">{c}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Membership */}
                    <div className="card p-0">
                        <div className="p-3 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="field">
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                                        <input
                                            className="input pl-9"
                                            placeholder="Search name, email, phone…"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="field">
                                    <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                                        <option value="date_added">Sort: Date added</option>
                                        <option value="name">Sort: Name</option>
                                        <option value="ltv">Sort: LTV</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-[var(--text-3)]" />
                                    <div className="field">
                                        <select className="select" value={emailFilter} onChange={(e) => setEmailFilter(e.target.value as any)}>
                                            <option value="any">Email: any</option>
                                            <option value="subscribed">Email: subscribed</option>
                                            <option value="unsubscribed">Email: unsubscribed</option>
                                            <option value="bounced">Email: bounced</option>
                                            <option value="pending">Email: pending</option>
                                        </select>
                                    </div>
                                    <div className="field">
                                        <select className="select" value={smsFilter} onChange={(e) => setSmsFilter(e.target.value as any)}>
                                            <option value="any">SMS: any</option>
                                            <option value="subscribed">SMS: subscribed</option>
                                            <option value="unsubscribed">SMS: unsubscribed</option>
                                            <option value="bounced">SMS: bounced</option>
                                            <option value="pending">SMS: pending</option>
                                        </select>
                                    </div>
                                    <div className="field">
                                        <select className="select" value={pushFilter} onChange={(e) => setPushFilter(e.target.value as any)}>
                                            <option value="any">Push: any</option>
                                            <option value="subscribed">Push: subscribed</option>
                                            <option value="unsubscribed">Push: unsubscribed</option>
                                            <option value="bounced">Push: bounced</option>
                                            <option value="pending">Push: pending</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="field">
                                    <select className="select" value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10))}>
                                        <option value={25}>25 / page</option>
                                        <option value={50}>50 / page</option>
                                        <option value={100}>100 / page</option>
                                    </select>
                                </div>

                                <div className="divider hidden md:block h-6" />

                                <button
                                    className="btn btn-secondary"
                                    onClick={handleExportSelected}
                                    disabled={isGuest || !someSelectedOnPage}
                                    title={isGuest ? "Guests cannot export" : "Export selected"}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Export selected
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleEnrichSelected}
                                    disabled={isGuest || !someSelectedOnPage}
                                    title={isGuest ? "Guests cannot enrich" : "Enrich selected"}
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Enrich selected
                                </button>
                                <button className="btn btn-secondary" onClick={clearSelection} disabled={!someSelectedOnPage}>
                                    Clear selection
                                </button>
                            </div>
                        </div>

                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="w-10">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox"
                                                    checked={allSelectedOnPage}
                                                    onChange={toggleSelectAllOnPage}
                                                    aria-label="Select all"
                                                />
                                            </label>
                                        </th>
                                        <th>Full name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Device ID</th>
                                        <th>Date added</th>
                                        <th>Company</th>
                                        <th>Job title</th>
                                        <th>Channels</th>
                                        <th className="text-right">LTV</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(pageRows || []).map((p) => {
                                        const sp = spMapByProfileId[p.id];
                                        const channelRows = subsByProfile[p.id] || [];
                                        const statusFor = (channel: "email" | "sms" | "push") =>
                                            (channelRows.find((c) => c.channel === channel)?.status as any) || "pending";
                                        const emailStatus = statusFor("email");
                                        const smsStatus = statusFor("sms");
                                        const pushStatus = statusFor("push");
                                        const ltv = ltvByProfile[p.id] || 0;

                                        return (
                                            <tr key={p.id}>
                                                <td className="td-base">
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox"
                                                        checked={!!selected[p.id]}
                                                        onChange={(e) =>
                                                            setSelected((s) => ({ ...s, [p.id]: e.target.checked }))
                                                        }
                                                        aria-label={`Select ${fullName(p)}`}
                                                    />
                                                </td>
                                                <td className="td-base">{fullName(p)}</td>
                                                <td className="td-base">{p.email || "—"}</td>
                                                <td className="td-base">{p.phone || "—"}</td>
                                                <td className="td-base">{p.device_id || "—"}</td>
                                                <td className="td-base">{formatDate(sp?.added_at)}</td>
                                                <td className="td-base">{p.company || "—"}</td>
                                                <td className="td-base">{p.job_title || "—"}</td>
                                                <td className="td-base">
                                                    <div className="flex flex-wrap gap-1">
                                                        <span className={cn("chip", "channel", "email")}>
                                                            <Mail className="w-3.5 h-3.5 mr-1" />
                                                            {emailStatus}
                                                        </span>
                                                        <span className={cn("chip", "channel", "sms")}>
                                                            <MessageSquareText className="w-3.5 h-3.5 mr-1" />
                                                            {smsStatus}
                                                        </span>
                                                        <span className={cn("chip", "channel", "push")}>
                                                            <Bell className="w-3.5 h-3.5 mr-1" />
                                                            {pushStatus}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="td-base text-right">{formatCurrency(ltv)}</td>
                                                <td className="td-base text-right">
                                                    <Link
                                                        className="btn btn-secondary btn-icon"
                                                        href={`/profile-detail?id=${encodeURIComponent(p.id)}`}
                                                        title="Open profile"
                                                        aria-label="Open profile"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {pageRows.length === 0 && (
                                        <tr>
                                            <td className="td-base text-center text-[var(--text-2)]" colSpan={11}>
                                                {loadingData ? "Loading…" : "No profiles match your filters."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-3 flex items-center justify-between text-sm text-[var(--text-2)]">
                            <div>
                                Showing {Math.min(pageStart + 1, totalRows)}–{Math.min(pageEnd, totalRows)} of {totalRows}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="btn btn-secondary btn-icon"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div>
                                    Page {page} / {totalPages}
                                </div>
                                <button
                                    className="btn btn-secondary btn-icon"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    aria-label="Next page"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {loadError && (
                        <div className="alert danger">
                            <div className="font-semibold">Error loading data</div>
                            <div className="text-[var(--text-2)]">{loadError}</div>
                            <div className="mt-2">
                                <button className="btn btn-secondary" onClick={handleRefresh}>
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right rail */}
                <aside className="right-rail space-y-3">
                    <div className="card p-3">
                        <div className="card-title">Channel Mix</div>
                        <div className="mt-3 space-y-3">
                            {(["email", "sms", "push"] as const).map((ch) => {
                                const label = ch === "email" ? "Email" : ch.toUpperCase();
                                const icon =
                                    ch === "email" ? (
                                        <Mail className="w-4 h-4" />
                                    ) : ch === "sms" ? (
                                        <MessageSquareText className="w-4 h-4" />
                                    ) : (
                                        <Bell className="w-4 h-4" />
                                    );
                                const totals = subscribedCounts[ch];
                                const total =
                                    totals.subscribed + totals.unsubscribed + totals.bounced + totals.pending;
                                return (
                                    <div key={ch} className="p-2 rounded border border-[var(--border)]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("channel", ch)}>{icon}</span>
                                                <div className="font-semibold">{label}</div>
                                            </div>
                                            <div className="text-[var(--text-2)]">{formatNumber(total)} total</div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span className="badge success">Subscribed: {formatNumber(totals.subscribed)}</span>
                                            <span className="badge warning">Unsubscribed: {formatNumber(totals.unsubscribed)}</span>
                                            <span className="badge danger">Bounced: {formatNumber(totals.bounced)}</span>
                                            <span className="badge">Pending: {formatNumber(totals.pending)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="card p-3">
                        <div className="card-title">Recent Activity</div>
                        <div className="mt-2 space-y-2">
                            {(events || [])
                                .filter((e) =>
                                    ["purchase", "message_open", "message_click", "add_to_cart"].includes(e.event_type)
                                )
                                .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
                                .slice(0, 8)
                                .map((e) => (
                                    <div key={e.id} className="flex items-center justify-between text-sm">
                                        <div className="text-[var(--text-2)]">{e.event_type.replaceAll("_", " ")}</div>
                                        <div className="text-[var(--text-3)]">{formatDate(e.occurred_at)}</div>
                                    </div>
                                ))}
                            {(events || []).length === 0 && <div className="text-[var(--text-3)]">No recent activity.</div>}
                        </div>
                    </div>

                    <div className="card p-3">
                        <div className="card-title">Next step</div>
                        <div className="text-[var(--text-2)] mt-1">
                            Configure an AI decisioning agent to choose the best message, channel, and timing for this segment.
                        </div>
                        <div className="mt-3">
                            <Link
                                href={`/create-agent?segmentId=${encodeURIComponent(seg?.id || "")}`}
                                className="btn btn-primary w-full"
                            >
                                <PlusCircle className="w-4 h-4 mr-2" />
                                Create Agent
                            </Link>
                        </div>
                    </div>
                </aside>
            </section>

            {/* Edit Segment Modal */}
            {editingOpen && (
                <div className="modal" role="dialog" aria-modal="true">
                    <div className="modal-card max-w-2xl">
                        <div className="card-header">
                            <div className="card-title">Edit Segment</div>
                        </div>
                        <div className="space-y-3 p-3">
                            <div className="field">
                                <label className="label">Name</label>
                                <input
                                    className="input"
                                    placeholder="Segment name"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    disabled={isGuest}
                                />
                            </div>

                            <div className="field">
                                <label className="label">Description</label>
                                <textarea
                                    className="textarea"
                                    rows={3}
                                    placeholder="Optional description"
                                    value={editingDescription}
                                    onChange={(e) => setEditingDescription(e.target.value)}
                                    disabled={isGuest}
                                />
                            </div>

                            <div className="field">
                                <label className="label">Criteria (JSON)</label>
                                <textarea
                                    className="textarea font-mono text-xs"
                                    rows={10}
                                    value={editingCriteriaText}
                                    onChange={(e) => setEditingCriteriaText(e.target.value)}
                                    disabled={isGuest}
                                />
                                <div className="help-text">
                                    Provide demographics and behavior rules. Example: {"{ \"age_range\": \"25-44\", \"geography\": { \"country\": \"US\" }, \"purchases\": { \"min\": 1 } }"}
                                </div>
                            </div>
                        </div>
                        <div className="card-footer">
                            <button className="btn btn-secondary" onClick={() => setEditingOpen(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveEditAsync} disabled={isGuest}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}