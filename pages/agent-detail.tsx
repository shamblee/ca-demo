import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    useAccount,
    useCurrentUser,
    useStoreItem,
    useStoreMatchingItems,
} from "@/lib/hooks";
import { store } from "@/lib/store";
import { cn } from "@/lib/util";
import { SignInRequired } from "@/components/SignInRequired";
import {
    typeDefs,
    Agent as AgentType,
    AgentDecision as AgentDecisionType,
    Segment as SegmentType,
    MessageCategory as MessageCategoryType,
    OutcomeMapping as OutcomeMappingType,
    Message as MessageType,
    Profile as ProfileType,
    MessageVariant as MessageVariantType,
} from "@/lib/schema";
import {
    AlertTriangle,
    Bell,
    Calendar,
    CalendarRange,
    Check,
    ChevronDown,
    Clock,
    Copy,
    Download,
    ExternalLink,
    FileText,
    Filter,
    Mail,
    MessageSquare,
    Play,
    RefreshCw,
    Search,
    Square,
    User as UserIcon,
    XCircle,
} from "lucide-react";

type Channel = "email" | "sms" | "push";
type StatusFilter = "all" | "sent" | "skipped" | "failed" | "holdout";
type DateRange = "24h" | "7d" | "30d" | "all";
type SortOrder = "newest" | "oldest";

function formatDateTime(value?: string) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString();
}
function formatTimeOnly(value?: string) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function timeWindowFromDate(value?: string): "morning" | "afternoon" | "evening" | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    const h = d.getHours();
    if (h >= 5 && h < 12) return "morning";
    if (h >= 12 && h < 18) return "afternoon";
    if (h >= 18 && h < 23) return "evening";
    return undefined;
}
function dayNameFromIndex(idx: number) {
    const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return names[idx] ?? String(idx);
}
function computeStatus(dec: AgentDecisionType) {
    if (dec.is_holdout) return { key: "holdout", label: "Holdout", variant: "accent" as const };
    if (dec.send_error) return { key: "failed", label: "Failed", variant: "danger" as const };
    if (dec.was_sent) return { key: "sent", label: "Sent", variant: "success" as const };
    return { key: "skipped", label: "Skipped", variant: "warning" as const };
}
function channelIcon(channel?: string) {
    switch (channel) {
        case "email":
            return <Mail className="w-4 h-4" />;
        case "sms":
            return <MessageSquare className="w-4 h-4" />;
        case "push":
            return <Bell className="w-4 h-4" />;
        default:
            return null;
    }
}
function statusBadgeClass(variant: "accent" | "danger" | "success" | "warning" | "default") {
    switch (variant) {
        case "accent":
            return "badge accent";
        case "danger":
            return "badge danger";
        case "success":
            return "badge success";
        case "warning":
            return "badge warning";
        default:
            return "badge";
    }
}
function windowChip(window?: "morning" | "afternoon" | "evening") {
    if (!window) return null;
    const label = window.charAt(0).toUpperCase() + window.slice(1);
    return <span className="chip">{label}</span>;
}

function useMessageMap(categoryId?: string) {
    const messages = useStoreMatchingItems<MessageType>(
        typeDefs.Message,
        categoryId ? { category_id: categoryId } : null
    );
    return useMemo(() => {
        if (!messages || messages === null) return {} as Record<string, MessageType>;
        const map: Record<string, MessageType> = {};
        for (const m of messages) map[m.id] = m;
        return map;
    }, [messages]);
}

function DecisionRow({
    decision,
    messageMap,
    onCopy,
}: {
    decision: AgentDecisionType;
    messageMap: Record<string, MessageType>;
    onCopy: (text: string) => void;
}) {
    const profile = useStoreItem<ProfileType>(typeDefs.Profile, decision.profile_id);
    const variant = useStoreItem<MessageVariantType>(typeDefs.MessageVariant, decision.message_variant_id ?? undefined);
    const msg = decision.message_id ? messageMap[decision.message_id] : undefined;

    const status = computeStatus(decision);
    const sendWindow = timeWindowFromDate(decision.scheduled_send_at);
    const profileLabel = useMemo(() => {
        if (profile === null) return "Loading profile…";
        if (profile === undefined) return `Profile ${decision.profile_id}`;
        const parts = [
            [profile.first_name, profile.last_name].filter(Boolean).join(" ") || undefined,
            profile.email,
            profile.phone,
            profile.device_id,
        ].filter(Boolean);
        return parts[0] ?? `Profile ${decision.profile_id}`;
    }, [profile, decision.profile_id]);

    const [expanded, setExpanded] = useState(false);

    return (
        <div className="card">
            <div className="card-header items-start">
                <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm text-[var(--text-3)]">{formatDateTime(decision.decisioned_at)}</div>
                        {decision.scheduled_send_at && (
                            <div className="flex items-center gap-1 text-sm text-[var(--text-3)]">
                                <Clock className="w-4 h-4" />
                                <span>Scheduled {formatTimeOnly(decision.scheduled_send_at)}</span>
                            </div>
                        )}
                        <span className={statusBadgeClass(status.variant)}>{status.label}</span>
                        {decision.is_holdout && <span className="badge">Control</span>}
                        {windowChip(sendWindow)}
                    </div>
                    <div className="text-[var(--text-2)] mt-1">
                        Profile:{" "}
                        <Link className="link" href={`/profile-detail?id=${decision.profile_id}`}>
                            {profileLabel}
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="btn btn-secondary btn-icon"
                        aria-label="Copy IDs"
                        onClick={() => onCopy(`decision_id=${decision.id}; profile_id=${decision.profile_id}; message_id=${decision.message_id ?? ""}`)}
                        title="Copy IDs"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    <Link
                        href={`/profile-detail?id=${decision.profile_id}`}
                        className="btn btn-secondary btn-icon"
                        aria-label="View Profile"
                        title="View Profile"
                    >
                        <UserIcon className="w-4 h-4" />
                    </Link>
                    {!!decision.message_id && (
                        <Link
                            href={`/message-detail?id=${decision.message_id}`}
                            className="btn btn-secondary btn-icon"
                            aria-label="View Message"
                            title="View Message"
                        >
                            <FileText className="w-4 h-4" />
                        </Link>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-[var(--text-3)]">Message:</span>
                    {decision.is_holdout ? (
                        <span className="chip">None — Holdout</span>
                    ) : !!decision.message_id ? (
                        <Link className="chip no-underline" href={`/message-detail?id=${decision.message_id}`}>
                            {msg?.name ?? `Message ${decision.message_id}`}
                            <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                    ) : (
                        <span className="chip">None</span>
                    )}

                    {decision.channel && (
                        <span className={cn("channel flex items-center gap-1", decision.channel)}>
                            {channelIcon(decision.channel)}
                            <span className="capitalize">{decision.channel}</span>
                        </span>
                    )}
                    {!!variant && variant !== null && (
                        <span className="chip">Variant: {variant?.id.slice(0, 8)}</span>
                    )}
                    {!!decision.send_error && (
                        <span className="status danger flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Error
                        </span>
                    )}
                </div>

                {decision.reasoning && (
                    <div className="reason text-[var(--text-2)]">
                        <div className={cn(!expanded && "line-clamp-2")}>{decision.reasoning}</div>
                        <button className="btn btn-secondary mt-2" onClick={() => setExpanded((v) => !v)}>
                            {expanded ? "Show less" : "Show more"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AgentDetailPage() {
    const router = useRouter();
    const { id: agentId } = router.query as { id?: string };

    const user = useCurrentUser();
    const account = useAccount();

    const agent = useStoreItem<AgentType>(typeDefs.Agent, agentId);
    const segment = useStoreItem<SegmentType>(typeDefs.Segment, agent?.segment_id);
    const category = useStoreItem<MessageCategoryType>(typeDefs.MessageCategory, agent?.message_category_id);
    const outcomes = useStoreMatchingItems<OutcomeMappingType>(
        typeDefs.OutcomeMapping,
        agentId ? { agent_id: agentId } : null
    );

    const [dateRange, setDateRange] = useState<DateRange>("7d");
    const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [search, setSearch] = useState("");
    const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const pageSize = 25;

    // Decisions
    const decisions = useStoreMatchingItems<AgentDecisionType>(
        typeDefs.AgentDecision,
        agentId ? { agent_id: agentId } : null,
        {
            orderBy: "decisioned_at",
            orderByDesc: sortOrder === "newest",
            limit: undefined,
        }
    );

    // Message lookup within the agent's category
    const messageMap = useMessageMap(agent?.message_category_id);

    // Apply filters
    const now = Date.now();
    const filteredDecisions = useMemo(() => {
        if (!decisions) return null;
        let list = decisions.slice();

        // Date range
        const cutoff = (() => {
            switch (dateRange) {
                case "24h":
                    return now - 24 * 60 * 60 * 1000;
                case "7d":
                    return now - 7 * 24 * 60 * 60 * 1000;
                case "30d":
                    return now - 30 * 24 * 60 * 60 * 1000;
                default:
                    return 0;
            }
        })();

        if (dateRange !== "all") {
            list = list.filter((d) => {
                const t = new Date(d.decisioned_at).getTime();
                return isFinite(t) && t >= cutoff;
            });
        }

        // Channel
        if (channelFilter !== "all") {
            list = list.filter((d) => (d.channel ?? "none") === channelFilter);
        }

        // Status
        if (statusFilter !== "all") {
            list = list.filter((d) => computeStatus(d).key === statusFilter);
        }

        // Search (by profile id and message name/id best-effort)
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((d) => {
                const msgName = d.message_id ? messageMap[d.message_id]?.name?.toLowerCase() : "";
                return (
                    d.profile_id.toLowerCase().includes(q) ||
                    (d.message_id?.toLowerCase().includes(q) ?? false) ||
                    (msgName ? msgName.includes(q) : false)
                );
            });
        }

        // Sort
        list.sort((a, b) => {
            const ta = new Date(a.decisioned_at).getTime();
            const tb = new Date(b.decisioned_at).getTime();
            return sortOrder === "newest" ? tb - ta : ta - tb;
        });

        return list;
    }, [decisions, dateRange, channelFilter, statusFilter, search, sortOrder, messageMap, now, refreshKey]);

    const pagedDecisions = useMemo(() => {
        if (!filteredDecisions) return null;
        return filteredDecisions.slice(0, page * pageSize);
    }, [filteredDecisions, page]);

    useEffect(() => {
        // Reset page when filters change
        setPage(1);
    }, [dateRange, channelFilter, statusFilter, search, sortOrder, agentId]);

    // Actions
    async function toggleAgentActiveAsync() {
        if (!agent || agent === null || agent === undefined) return;
        await store().updateAsync(typeDefs.Agent, agent.id, {
            is_active: !agent.is_active,
            activated_at: !agent.is_active ? new Date().toISOString() : agent.activated_at,
            deactivated_at: agent.is_active ? new Date().toISOString() : agent.deactivated_at,
        });
    }

    function triggerRefresh() {
        setRefreshKey((k) => k + 1);
    }

    function copyToClipboard(text: string) {
        navigator.clipboard?.writeText(text).catch(() => {});
    }

    function exportCsv() {
        if (!filteredDecisions) return;
        const rows = [
            [
                "decision_id",
                "decisioned_at",
                "scheduled_send_at",
                "agent_id",
                "profile_id",
                "message_id",
                "channel",
                "is_holdout",
                "was_sent",
                "sent_at",
                "status",
                "error",
                "reasoning",
            ],
        ];
        for (const d of filteredDecisions) {
            const st = computeStatus(d);
            rows.push([
                d.id,
                d.decisioned_at ?? "",
                d.scheduled_send_at ?? "",
                d.agent_id,
                d.profile_id,
                d.message_id ?? "",
                d.channel ?? "",
                String(!!d.is_holdout),
                String(!!d.was_sent),
                d.sent_at ?? "",
                st.label,
                (d.send_error ?? "").replace(/\n/g, " "),
                (d.reasoning ?? "").replace(/\n/g, " "),
            ]);
        }
        const csv = rows.map((r) =>
            r
                .map((cell) => {
                    const v = String(cell ?? "");
                    if (/[",\n]/.test(v)) {
                        return `"${v.replace(/"/g, '""')}"`;
                    }
                    return v;
                })
                .join(",")
        ).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `agent-${agent?.name ?? agentId}-decisions.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Auth gate
    if (user === undefined) {
        return (
            <div className="page--AgentDetailPage container-page">
                <SignInRequired message="Please sign in to view agent details." />
            </div>
        );
    }

    // Loading states (user or account still loading)
    if (user === null || account === null) {
        return (
            <div className="page--AgentDetailPage container-page space-y-4">
                <div className="skeleton h-8 w-64" />
                <section className="content-2col">
                    <div className="space-y-3">
                        <div className="card">
                            <div className="card-header">
                                <div className="skeleton h-5 w-40" />
                                <div className="flex items-center gap-2">
                                    <div className="skeleton h-8 w-24" />
                                    <div className="skeleton h-8 w-10" />
                                    <div className="skeleton h-8 w-28" />
                                </div>
                            </div>
                            <div className="p-3">
                                <div className="skeleton h-10 w-full" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="card p-4">
                                    <div className="skeleton h-4 w-1/3 mb-2" />
                                    <div className="skeleton h-4 w-2/3" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <aside className="right-rail space-y-3">
                        <div className="card p-4">
                            <div className="skeleton h-5 w-32 mb-2" />
                            <div className="skeleton h-4 w-24" />
                        </div>
                        <div className="card p-4">
                            <div className="skeleton h-5 w-36 mb-2" />
                            <div className="skeleton h-4 w-20" />
                        </div>
                    </aside>
                </section>
            </div>
        );
    }

    // Agent selection guard
    if (!agentId) {
        return (
            <div className="page--AgentDetailPage container-page space-y-4">
                <header className="flex items-center justify-between">
                    <h1 className="section-title text-xl">Agent Details</h1>
                </header>

                <div className="alert info">
                    <div className="font-semibold">No agent selected</div>
                    <div className="text-[var(--text-2)]">
                        Choose an agent from the Decisioning page to view its decision log.
                    </div>
                    <div className="mt-2">
                        <Link className="btn btn-primary" href="/decisioning">
                            Go to Decisioning
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const inactive = !!agent && agent !== null && agent !== undefined && !agent.is_active;

    return (
        <div className="page--AgentDetailPage space-y-4">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="section-title text-xl">
                        {agent === null ? "Loading…" : agent === undefined ? "Agent not found" : agent.name}
                    </h1>
                    {agent && agent !== null && (
                        <span className={cn("status", agent.is_active ? "success" : "warning")}>
                            {agent.is_active ? "Active" : "Inactive"}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {agent && agent !== null && (
                        <button
                            className={cn("btn", agent.is_active ? "btn-danger" : "btn-primary")}
                            onClick={toggleAgentActiveAsync}
                        >
                            {agent.is_active ? (
                                <>
                                    <Square className="w-4 h-4 mr-2" />
                                    Deactivate
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Activate
                                </>
                            )}
                        </button>
                    )}
                    <button className="btn btn-secondary btn-icon" aria-label="Refresh" onClick={triggerRefresh} title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button className="btn btn-secondary" onClick={exportCsv}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </button>
                </div>
            </header>

            {inactive && (
                <div className="alert info">
                    <div className="font-semibold">Agent is inactive</div>
                    <div className="text-[var(--text-2)]">
                        Activate the agent to resume making decisions and logging activity.
                    </div>
                </div>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
                {segment && segment !== null && (
                    <Link className="chip no-underline" href={`/segment-detail?id=${segment.id}`} title="View segment">
                        Segment: {segment?.name ?? segment?.id}
                        <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                )}
                {agent && agent !== null && (
                    <span className="chip">Holdout: {agent.holdout_percentage ?? 0}%</span>
                )}
                {category && category !== null && (
                    <Link className="chip no-underline" href={`/message-category?id=${category.id}`} title="View message category">
                        Category: {category?.name ?? category?.id}
                        <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                )}
            </div>

            <section className="content-2col">
                {/* Primary column */}
                <div className="space-y-3">
                    {/* Decision toolbar */}
                    <div className="card">
                        <div className="card-header">
                            <div className="flex items-center gap-2 text-[var(--text-2)]">
                                <Filter className="w-4 h-4" />
                                Filters
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <CalendarRange className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                                    <select
                                        className="select pl-9"
                                        value={dateRange}
                                        onChange={(e) => setDateRange(e.target.value as DateRange)}
                                        aria-label="Date range"
                                    >
                                        <option value="24h">Last 24 hours</option>
                                        <option value="7d">Last 7 days</option>
                                        <option value="30d">Last 30 days</option>
                                        <option value="all">All time</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        className={cn("tab", channelFilter === "all" && "active")}
                                        onClick={() => setChannelFilter("all")}
                                    >
                                        All
                                    </button>
                                    <button
                                        className={cn("tab flex items-center gap-1", channelFilter === "email" && "active")}
                                        onClick={() => setChannelFilter("email")}
                                        title="Email"
                                    >
                                        <Mail className="w-4 h-4" /> Email
                                    </button>
                                    <button
                                        className={cn("tab flex items-center gap-1", channelFilter === "sms" && "active")}
                                        onClick={() => setChannelFilter("sms")}
                                        title="SMS"
                                    >
                                        <MessageSquare className="w-4 h-4" /> SMS
                                    </button>
                                    <button
                                        className={cn("tab flex items-center gap-1", channelFilter === "push" && "active")}
                                        onClick={() => setChannelFilter("push")}
                                        title="Push"
                                    >
                                        <Bell className="w-4 h-4" /> Push
                                    </button>
                                </div>

                                <select
                                    className="select"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                    aria-label="Status filter"
                                >
                                    <option value="all">All statuses</option>
                                    <option value="sent">Sent</option>
                                    <option value="skipped">Skipped</option>
                                    <option value="failed">Failed</option>
                                    <option value="holdout">Holdout</option>
                                </select>

                                <div className="relative w-[18rem] max-w-[40vw]">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                                    <input
                                        className="input pl-9"
                                        placeholder="Search profile/message…"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>

                                <select
                                    className="select"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                                    aria-label="Sort"
                                >
                                    <option value="newest">Newest first</option>
                                    <option value="oldest">Oldest first</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Decision list */}
                    {!decisions ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="card p-4">
                                    <div className="skeleton h-4 w-1/4 mb-2" />
                                    <div className="skeleton h-4 w-2/3" />
                                </div>
                            ))}
                        </div>
                    ) : filteredDecisions && filteredDecisions.length === 0 ? (
                        <div className="card p-4">
                            <div className="flex items-center gap-2 text-[var(--text-2)]">
                                <XCircle className="w-5 h-5 text-[var(--text-3)]" />
                                No decisions match the current filters.
                            </div>
                            <div className="mt-2">
                                <button className="btn btn-secondary" onClick={() => {
                                    setDateRange("7d");
                                    setChannelFilter("all");
                                    setStatusFilter("all");
                                    setSearch("");
                                    setSortOrder("newest");
                                }}>
                                    Reset filters
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {pagedDecisions?.map((d) => (
                                    <DecisionRow
                                        key={d.id}
                                        decision={d}
                                        messageMap={messageMap}
                                        onCopy={copyToClipboard}
                                    />
                                ))}
                            </div>
                            {filteredDecisions && pagedDecisions && filteredDecisions.length > pagedDecisions.length && (
                                <div className="flex justify-center">
                                    <button className="btn btn-secondary" onClick={() => setPage((p) => p + 1)}>
                                        Load more
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Right rail */}
                <aside className="right-rail space-y-3">
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Agent Summary</div>
                        </div>
                        <div className="p-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-3)]">Segment</span>
                                {segment && segment !== null ? (
                                    <Link className="link" href={`/segment-detail?id=${segment.id}`}>
                                        {segment.name}
                                    </Link>
                                ) : (
                                    <span className="text-[var(--text-3)]">—</span>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-3)]">Holdout %</span>
                                <span>{agent?.holdout_percentage ?? 0}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-3)]">Category</span>
                                {category && category !== null ? (
                                    <Link className="link" href={`/message-category?id=${category.id}`}>
                                        {category.name}
                                    </Link>
                                ) : (
                                    <span className="text-[var(--text-3)]">—</span>
                                )}
                            </div>
                            <div className="divider my-2" />
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-3)]">Frequency</span>
                                <span className="capitalize">{(agent?.send_frequency ?? "—").replaceAll("_", " ")}</span>
                            </div>
                            <div>
                                <div className="text-[var(--text-3)] mb-1">Allowed days</div>
                                <div className="flex flex-wrap gap-1">
                                    {(agent?.send_days ?? []).length > 0 ? (
                                        agent?.send_days?.map((d, i) => (
                                            <span className="chip" key={`${d}-${i}`}>{dayNameFromIndex(d)}</span>
                                        ))
                                    ) : (
                                        <span className="text-[var(--text-3)]">Any</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="text-[var(--text-3)] mb-1">Time windows</div>
                                <div className="flex flex-wrap gap-1">
                                    {(agent?.send_time_windows ?? []).length > 0 ? (
                                        agent?.send_time_windows?.map((tw, i) => (
                                            <span className="chip capitalize" key={`${tw}-${i}`}>{tw}</span>
                                        ))
                                    ) : (
                                        <span className="text-[var(--text-3)]">Any</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Outcomes</div>
                        </div>
                        <div className="p-3 space-y-2 text-sm">
                            {!outcomes ? (
                                <div className="skeleton h-5 w-1/2" />
                            ) : outcomes.length === 0 ? (
                                <div className="text-[var(--text-3)]">No outcome mappings configured.</div>
                            ) : (
                                outcomes.map((om) => (
                                    <div className="flex items-center justify-between" key={om.id}>
                                        <span className="text-[var(--text-2)]">{om.event_type}</span>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "badge",
                                                    om.outcome === "best" && "success",
                                                    om.outcome === "very_good" && "brand",
                                                    om.outcome === "good" && "accent",
                                                    om.outcome === "worst" && "warning"
                                                )}
                                            >
                                                {om.outcome.replaceAll("_", " ")}
                                            </span>
                                            {typeof om.weight === "number" && (
                                                <span className="chip">w={om.weight}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Quick filters</div>
                        </div>
                        <div className="p-3 flex flex-col gap-2">
                            <button
                                className={cn("btn", statusFilter === "failed" ? "btn-primary" : "btn-secondary")}
                                onClick={() => setStatusFilter((cur) => (cur === "failed" ? "all" : "failed"))}
                            >
                                Errors only
                            </button>
                            <button
                                className={cn("btn", statusFilter === "holdout" ? "btn-primary" : "btn-secondary")}
                                onClick={() => setStatusFilter((cur) => (cur === "holdout" ? "all" : "holdout"))}
                            >
                                Holdout only
                            </button>
                            <button
                                className={cn("btn", statusFilter === "sent" ? "btn-primary" : "btn-secondary")}
                                onClick={() => setStatusFilter((cur) => (cur === "sent" ? "all" : "sent"))}
                            >
                                Sends only
                            </button>
                        </div>
                    </div>

                    <div className="alert info">
                        <div className="font-semibold">Content source</div>
                        <div className="text-[var(--text-2)]">
                            Messages are imported from GardenIQ. Authoring is disabled in this app.
                        </div>
                    </div>
                </aside>
            </section>
        </div>
    );
}