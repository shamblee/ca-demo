import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Eye, Trash2, Play, Pause, Filter } from "lucide-react";
import { useUserInfo, useStoreMatchingItems } from "@/lib/hooks";
import { store } from "@/lib/store";
import { cn } from "@/lib/util";
import { SignInRequired } from "@/components/SignInRequired";
import { typeDefs, Agent, Segment, MessageCategory } from "@/lib/schema";

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "created_desc" | "created_asc" | "name_asc" | "name_desc";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const freqLabels: Record<string, string> = {
    daily: "Daily",
    six_per_week: "6×/week",
    five_per_week: "5×/week",
    weekly: "Weekly",
    biweekly: "Every 2 weeks",
    monthly: "Monthly",
};
const timeLabels: Record<string, string> = {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
};

function formatDate(d?: string) {
    if (!d) return "—";
    try {
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return d;
        return dt.toLocaleDateString();
    } catch {
        return d;
    }
}

export default function DecisioningPage() {
    const userInfo = useUserInfo();
    if (userInfo === undefined) {
        // Not signed in
        return (
            <div className="page--DecisioningPage container-page">
                <SignInRequired message="Please sign in to view your decisioning agents." />
            </div>
        );
    }
    if (userInfo === null) {
        // Loading user info skeleton
        return (
            <div className="page--DecisioningPage container-page space-y-4">
                <header className="flex items-center justify-between">
                    <h1 className="section-title text-xl">Decisioning</h1>
                </header>
                <div className="card p-6 skeleton h-[240px]" />
            </div>
        );
    }

    const account = userInfo.account;
    const role = userInfo.role; // 'admin'|'standard'|'guest' per app mapping; manager treated as standard in app logic
    const isGuest = role === "guest";

    const agents = useStoreMatchingItems<Agent>(
        typeDefs.Agent,
        account ? { account_id: account.id } : null,
        { orderBy: "created_at", orderByDesc: true }
    );
    const segments = useStoreMatchingItems<Segment>(
        typeDefs.Segment,
        account ? { account_id: account.id } : null
    );
    const categories = useStoreMatchingItems<MessageCategory>(
        typeDefs.MessageCategory,
        account ? { account_id: account.id } : null
    );

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [sortKey, setSortKey] = useState<SortKey>("created_desc");
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const segNameById = useMemo(() => {
        const map = new Map<string, string>();
        if (segments && Array.isArray(segments)) {
            for (const s of segments) map.set(s.id, s.name);
        }
        return map;
    }, [segments]);

    const catNameById = useMemo(() => {
        const map = new Map<string, string>();
        if (categories && Array.isArray(categories)) {
            for (const c of categories) map.set(c.id, c.name);
        }
        return map;
    }, [categories]);

    const filteredAgents = useMemo(() => {
        if (!agents || !Array.isArray(agents)) return agents;
        let rows = [...agents];

        const q = search.trim().toLowerCase();
        if (q) {
            rows = rows.filter((a) => a.name.toLowerCase().includes(q));
        }

        if (statusFilter !== "all") {
            rows = rows.filter((a) => (statusFilter === "active" ? a.is_active : !a.is_active));
        }

        rows.sort((a, b) => {
            switch (sortKey) {
                case "created_desc":
                    return (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0);
                case "created_asc":
                    return (new Date(a.created_at).getTime() || 0) - (new Date(b.created_at).getTime() || 0);
                case "name_asc":
                    return a.name.localeCompare(b.name);
                case "name_desc":
                    return b.name.localeCompare(a.name);
                default:
                    return 0;
            }
        });

        return rows;
    }, [agents, search, statusFilter, sortKey]);

    async function toggleActive(agent: Agent) {
        if (!account || isGuest) return;
        try {
            setBusyId(agent.id);
            const now = new Date().toISOString();
            await store().updateAsync(
                typeDefs.Agent,
                agent.id,
                agent.is_active
                    ? { is_active: false, deactivated_at: now }
                    : { is_active: true, activated_at: now, deactivated_at: null as any }
            );
        } catch (err) {
            console.error("Failed to toggle agent", err);
        } finally {
            setBusyId(null);
        }
    }

    async function confirmDelete(agentId: string) {
        if (!account || isGuest) return;
        try {
            setBusyId(agentId);
            await store().deleteAsync(typeDefs.Agent, agentId);
            setConfirmDeleteId(null);
        } catch (err) {
            console.error("Failed to delete agent", err);
        } finally {
            setBusyId(null);
        }
    }

    const isLoading = agents === null || segments === null || categories === null;

    return (
        <div className="page--DecisioningPage">
            <div className="container-page space-y-4">
                <header className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h1 className="section-title text-xl">Decisioning</h1>
                        <span className="text-[var(--text-3)]">
                            {Array.isArray(agents) ? `${agents.length} agents` : ""}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                className="input pl-9 w-64"
                                placeholder="Search agents"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search agents"
                            />
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                        </div>

                        <select
                            className="select"
                            aria-label="Filter by status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        >
                            <option value="all">All statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <select
                            className="select"
                            aria-label="Sort agents"
                            value={sortKey}
                            onChange={(e) => setSortKey(e.target.value as SortKey)}
                        >
                            <option value="created_desc">Newest</option>
                            <option value="created_asc">Oldest</option>
                            <option value="name_asc">Name A–Z</option>
                            <option value="name_desc">Name Z–A</option>
                        </select>

                        <Link
                            href="/create-agent"
                            className={cn("btn btn-primary", isGuest && "pointer-events-none opacity-60")}
                            aria-disabled={isGuest}
                            title={isGuest ? "Guests have view-only access" : "Create new agent"}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Agent
                        </Link>
                    </div>
                </header>

                <section className="content-2col">
                    <div className="space-y-3">
                        <div className="alert info">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-[var(--purple)]" />
                                <div className="font-semibold">Governance</div>
                            </div>
                            <div className="text-[var(--text-2)]">
                                Messages are imported from GardenIQ. Authoring is disabled in-app. Agents must use assigned categories.
                            </div>
                        </div>

                        {isLoading && (
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">Agents</div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="skeleton h-10 rounded" />
                                    <div className="skeleton h-10 rounded" />
                                    <div className="skeleton h-10 rounded" />
                                </div>
                            </div>
                        )}

                        {!isLoading && Array.isArray(agents) && agents.length === 0 && (
                            <div className="card p-6 highlight">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="card-title">No agents yet</div>
                                        <div className="text-[var(--text-2)] mt-1">
                                            Create your first AI decisioning agent to automatically select messages, channels, and send times for a segment.
                                        </div>
                                        <div className="mt-4">
                                            <Link
                                                href="/create-agent"
                                                className={cn("btn btn-primary", isGuest && "pointer-events-none opacity-60")}
                                                aria-disabled={isGuest}
                                                title={isGuest ? "Guests have view-only access" : "Create agent"}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Create Agent
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isLoading && Array.isArray(filteredAgents) && filteredAgents.length > 0 && (
                            <div className="table-wrap card">
                                <div className="card-header">
                                    <div className="card-title">Agents</div>
                                    <div className="text-[var(--text-3)]">{filteredAgents.length} shown</div>
                                </div>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Status</th>
                                            <th>Segment</th>
                                            <th>Category</th>
                                            <th>Schedule</th>
                                            <th>Holdout</th>
                                            <th>Created</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAgents.map((a) => (
                                            <tr key={a.id} className="hover:bg-[var(--surface-2)]">
                                                <td className="td-base">
                                                    <div className="flex flex-col">
                                                        <Link href={`/agent-detail?id=${encodeURIComponent(a.id)}`} className="link font-medium">
                                                            {a.name}
                                                        </Link>
                                                        {a.desired_outcome_description && (
                                                            <div className="text-[var(--text-3)] text-xs mt-0.5 line-clamp-1">
                                                                {a.desired_outcome_description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="td-base">
                                                    <span className={cn("status", a.is_active ? "success" : undefined)}>
                                                        {a.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                </td>
                                                <td className="td-base">
                                                    {a.segment_id ? (
                                                        <Link
                                                            className="link"
                                                            href={`/segment-detail?id=${encodeURIComponent(a.segment_id)}`}
                                                        >
                                                            {segNameById.get(a.segment_id) ?? "Segment"}
                                                        </Link>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                                <td className="td-base">
                                                    {a.message_category_id ? (
                                                        <Link
                                                            className="link"
                                                            href={`/message-category?id=${encodeURIComponent(a.message_category_id)}`}
                                                        >
                                                            {catNameById.get(a.message_category_id) ?? "Category"}
                                                        </Link>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                                <td className="td-base">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <span className="chip">{freqLabels[a.send_frequency] ?? a.send_frequency}</span>
                                                        {/* Days */}
                                                        <div className="flex flex-wrap gap-1">
                                                            {Array.isArray(a.send_days) &&
                                                                a.send_days.map((d) => (
                                                                    <span key={`${a.id}-d-${d}`} className="chip text-xs">
                                                                        {dayLabels[d] ?? d}
                                                                    </span>
                                                                ))}
                                                        </div>
                                                        {/* Time windows */}
                                                        <div className="flex flex-wrap gap-1">
                                                            {Array.isArray(a.send_time_windows) &&
                                                                a.send_time_windows.map((t) => (
                                                                    <span key={`${a.id}-t-${t}`} className="chip text-xs">
                                                                        {timeLabels[t] ?? t}
                                                                    </span>
                                                                ))}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="td-base">{typeof a.holdout_percentage === "number" ? `${a.holdout_percentage}%` : "—"}</td>
                                                <td className="td-base">{formatDate(a.created_at)}</td>
                                                <td className="td-base">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Link
                                                            href={`/agent-detail?id=${encodeURIComponent(a.id)}`}
                                                            className="btn btn-secondary btn-icon"
                                                            title="View details"
                                                            aria-label="View details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Link>

                                                        <button
                                                            className={cn(
                                                                "btn btn-secondary btn-icon",
                                                                (isGuest || busyId === a.id) && "pointer-events-none opacity-60"
                                                            )}
                                                            onClick={() => toggleActive(a)}
                                                            aria-label={a.is_active ? "Deactivate agent" : "Activate agent"}
                                                            title={isGuest ? "Guests have view-only access" : a.is_active ? "Deactivate agent" : "Activate agent"}
                                                        >
                                                            {a.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                        </button>

                                                        <button
                                                            className={cn(
                                                                "btn btn-danger btn-icon",
                                                                (isGuest || busyId === a.id) && "pointer-events-none opacity-60"
                                                            )}
                                                            onClick={() => setConfirmDeleteId(a.id)}
                                                            aria-label="Delete agent"
                                                            title={isGuest ? "Guests have view-only access" : "Delete agent"}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    <aside className="right-rail space-y-3">
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Tips</div>
                            </div>
                            <div className="p-4 space-y-2 text-[var(--text-2)]">
                                <div className="alert info">
                                    Configure desired outcomes per agent. Map events to Worst → Best to guide optimization.
                                </div>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Schedule frequency, days, and time windows.</li>
                                    <li>Use holdout groups to measure lift.</li>
                                    <li>View decision logs for reasoning and auditing.</li>
                                </ul>
                                <div className="mt-2 text-sm">
                                    Learn more:{" "}
                                    <a className="link" href="/dashboard">
                                        Attribution and ROI
                                    </a>
                                </div>
                            </div>
                        </div>
                    </aside>
                </section>
            </div>

            {confirmDeleteId && (
                <div className="modal" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="card-header">
                            <div className="card-title">Delete Agent</div>
                        </div>
                        <div className="p-4">
                            <div className="text-[var(--text-2)]">
                                This action cannot be undone. Are you sure you want to delete this agent?
                            </div>
                        </div>
                        <div className="card-footer">
                            <button className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>
                                Cancel
                            </button>
                            <button
                                className={cn("btn btn-danger", busyId === confirmDeleteId && "pointer-events-none opacity-60")}
                                onClick={() => confirmDelete(confirmDeleteId)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}