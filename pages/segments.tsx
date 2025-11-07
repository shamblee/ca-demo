import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Search, RefreshCw, Plus, Info, ArrowUp, ArrowDown, Bot } from "lucide-react";
import { useAccount, useCurrentUser, useUserRole } from "@/lib/hooks";
import { cn } from "@/lib/util";
import { SignInRequired } from "@/components/SignInRequired";
import { store } from "@/lib/store";
import {
    typeDefs,
    Segment as SegmentType,
    Segment_insert,
    SegmentProfile as SegmentProfileType,
} from "@/lib/schema";

type SortKey = "name" | "profiles" | "growth";
type SortDir = "asc" | "desc";

interface Metrics {
    profiles: number;
    growth30d: number;
}

export default function Segments() {
    const router = useRouter();
    const user = useCurrentUser();
    const account = useAccount();
    const role = useUserRole();

    const [segments, setSegments] = useState<SegmentType[] | null>(null);
    const [metricsMap, setMetricsMap] = useState<Record<string, Metrics>>({});
    const [loadingMetrics, setLoadingMetrics] = useState(false);

    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("name");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [refreshTick, setRefreshTick] = useState(0);

    const [creating, setCreating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState<{ name: string; is_dynamic: boolean; description?: string }>({
        name: "",
        is_dynamic: true,
        description: "",
    });
    const canCreate = role && role !== "guest";

    // Auth gating
    if (user === undefined) {
        return (
            <div className="page--Segments">
                <main className="container-page">
                    <SignInRequired message="Please sign in to view Segments." />
                </main>
            </div>
        );
    }
    if (user === null || account === null || role === null) {
        return (
            <div className="page--Segments">
                <main className="container-page space-y-4">
                    <Header
                        search={search}
                        onSearchChange={setSearch}
                        onRefresh={() => setRefreshTick((x) => x + 1)}
                        onOpenCreate={() => setShowCreateModal(true)}
                        showCreate={!!canCreate}
                    />
                    <div className="card p-4">
                        <div className="skeleton h-6 w-40 mb-4" />
                        <div className="skeleton h-9 w-full mb-3" />
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Profiles</th>
                                        <th>
                                            <div className="inline-flex items-center gap-1">
                                                Growth 30d <Info className="w-4 h-4 text-[var(--text-3)]" />
                                            </div>
                                        </th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i}>
                                            <td className="td-base">
                                                <div className="skeleton h-5 w-48" />
                                            </td>
                                            <td className="td-base">
                                                <div className="skeleton h-5 w-16" />
                                            </td>
                                            <td className="td-base">
                                                <div className="skeleton h-5 w-20" />
                                            </td>
                                            <td className="td-base text-right">
                                                <div className="skeleton h-8 w-8 ml-auto rounded-full" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        );
    }
    if (!account) {
        return (
            <div className="page--Segments">
                <main className="container-page space-y-4">
                    <Header
                        search={search}
                        onSearchChange={setSearch}
                        onRefresh={() => setRefreshTick((x) => x + 1)}
                        onOpenCreate={() => setShowCreateModal(true)}
                        showCreate={!!canCreate}
                    />
                    <div className="card p-6">
                        <div className="card-title">No account found</div>
                        <div className="text-[var(--text-2)]">Join or create an account to view segments.</div>
                    </div>
                </main>
            </div>
        );
    }

    // Load segments (account-scoped)
    useEffect(() => {
        let cancelled = false;
        async function loadAsync() {
            setSegments(null);
            const rows = (await store().selectMatchesAsync<SegmentType>(
                typeDefs.Segment,
                { account_id: account.id },
                { orderBy: "created_at", orderByDesc: true }
            )) as SegmentType[];
            if (!cancelled) {
                setSegments(rows || []);
            }
        }
        loadAsync();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account?.id, refreshTick]);

    // Load metrics for each segment
    useEffect(() => {
        let cancelled = false;
        async function loadMetricsAsync() {
            if (!segments || segments.length === 0) {
                setMetricsMap({});
                return;
            }
            setLoadingMetrics(true);
            try {
                const now = new Date();
                const cutoff = new Date(now);
                cutoff.setDate(now.getDate() - 30);

                const entries = await Promise.all(
                    segments.map(async (s) => {
                        const memberships = (await store().selectMatchesAsync<SegmentProfileType>(
                            typeDefs.SegmentProfile,
                            { account_id: account.id, segment_id: s.id }
                        )) as SegmentProfileType[];

                        const total = memberships?.length || 0;
                        const growth = (memberships || []).filter((m) => {
                            const d = new Date(m.added_at);
                            return !Number.isNaN(d.getTime()) && d >= cutoff;
                        }).length;

                        return [s.id, { profiles: total, growth30d: growth }] as [string, Metrics];
                    })
                );

                if (!cancelled) {
                    const map: Record<string, Metrics> = {};
                    for (const [id, metrics] of entries) {
                        map[id] = metrics;
                    }
                    setMetricsMap(map);
                }
            } finally {
                if (!cancelled) setLoadingMetrics(false);
            }
        }
        loadMetricsAsync();
        return () => {
            cancelled = true;
        };
    }, [segments, account?.id]);

    const filteredAndSorted = useMemo(() => {
        const list = (segments || []).filter((s) =>
            s.name.toLowerCase().includes(search.trim().toLowerCase())
        );

        const withMetrics = list.map((s) => {
            const metrics = metricsMap[s.id] || { profiles: 0, growth30d: 0 };
            return { segment: s, ...metrics };
        });

        const dir = sortDir === "asc" ? 1 : -1;

        withMetrics.sort((a, b) => {
            switch (sortKey) {
                case "name":
                    return a.segment.name.localeCompare(b.segment.name) * dir;
                case "profiles":
                    return (a.profiles - b.profiles) * dir;
                case "growth":
                    return (a.growth30d - b.growth30d) * dir;
                default:
                    return 0;
            }
        });

        return withMetrics;
    }, [segments, metricsMap, search, sortKey, sortDir]);

    const isLoading = segments === null || loadingMetrics;

    async function handleCreateAsync() {
        if (!account) return;
        const name = createForm.name.trim();
        if (!name) return;

        setCreating(true);
        try {
            const value: Segment_insert = {
                account_id: account.id,
                name,
                description: createForm.description?.trim() || undefined,
                is_dynamic: createForm.is_dynamic,
                criteria: {},
            };
            await store().insertAsync(typeDefs.Segment, value);
            setShowCreateModal(false);
            setCreateForm({ name: "", is_dynamic: true, description: "" });
            setRefreshTick((x) => x + 1);
        } finally {
            setCreating(false);
        }
    }

    function toggleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir(key === "name" ? "asc" : "desc");
        }
    }

    return (
        <div className="page--Segments">
            <main className="container-page space-y-4">
                <Header
                    search={search}
                    onSearchChange={setSearch}
                    onRefresh={() => setRefreshTick((x) => x + 1)}
                    onOpenCreate={() => setShowCreateModal(true)}
                    showCreate={!!canCreate}
                />

                <div className="alert info">
                    <div className="font-semibold">How Growth 30d works</div>
                    <div className="text-[var(--text-2)]">
                        Growth counts profiles added to the segment in the last 30 days.
                    </div>
                </div>

                <div className="card">
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>
                                        <button
                                            className="link inline-flex items-center gap-1"
                                            onClick={() => toggleSort("name")}
                                            title="Sort by name"
                                        >
                                            Name {renderSort(sortKey === "name" ? sortDir : undefined)}
                                        </button>
                                    </th>
                                    <th className="w-[140px]">
                                        <button
                                            className="link inline-flex items-center gap-1"
                                            onClick={() => toggleSort("profiles")}
                                            title="Sort by profiles"
                                        >
                                            Profiles {renderSort(sortKey === "profiles" ? sortDir : undefined)}
                                        </button>
                                    </th>
                                    <th className="w-[160px]">
                                        <button
                                            className="link inline-flex items-center gap-1"
                                            onClick={() => toggleSort("growth")}
                                            title="Sort by growth (30 days)"
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                Growth 30d
                                                <Info
                                                    className="w-4 h-4 text-[var(--text-3)]"
                                                    title="Profiles added in the last 30 days"
                                                />
                                            </span>
                                            {renderSort(sortKey === "growth" ? sortDir : undefined)}
                                        </button>
                                    </th>
                                    <th className="text-right w-[120px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={`skeleton-${i}`}>
                                            <td className="td-base">
                                                <div className="skeleton h-5 w-48" />
                                            </td>
                                            <td className="td-base">
                                                <div className="skeleton h-5 w-16" />
                                            </td>
                                            <td className="td-base">
                                                <div className="skeleton h-5 w-20" />
                                            </td>
                                            <td className="td-base text-right">
                                                <div className="skeleton h-8 w-8 ml-auto rounded-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredAndSorted.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="td-base">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[var(--text-2)]">No segments found.</div>
                                                {canCreate && (
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={() => setShowCreateModal(true)}
                                                    >
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        Create Segment
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSorted.map(({ segment, profiles, growth30d }) => {
                                        const chip = segment.is_dynamic ? (
                                            <span className="chip">Dynamic</span>
                                        ) : (
                                            <span className="chip">Static</span>
                                        );

                                        return (
                                            <tr
                                                key={segment.id}
                                                className="cursor-pointer hover:bg-[var(--surface-2)]"
                                                onClick={() =>
                                                    router.push(`/segment-detail?segmentId=${encodeURIComponent(segment.id)}`)
                                                }
                                            >
                                                <td className="td-base">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            className="link"
                                                            href={`/segment-detail?segmentId=${encodeURIComponent(segment.id)}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {segment.name}
                                                        </Link>
                                                        {chip}
                                                    </div>
                                                </td>
                                                <td className="td-base">{formatNumber(profiles)}</td>
                                                <td className={cn("td-base", growth30d > 0 && "text-[var(--success)]")}>
                                                    {growth30d > 0 ? `+${formatNumber(growth30d)}` : formatNumber(growth30d)}
                                                </td>
                                                <td className="td-base text-right">
                                                    <Link
                                                        href={`/create-agent?segmentId=${encodeURIComponent(segment.id)}`}
                                                        className="btn btn-secondary btn-icon"
                                                        aria-label="Create agent for this segment"
                                                        onClick={(e) => e.stopPropagation()}
                                                        title="Create Agent with this segment preselected"
                                                    >
                                                        <Bot className="w-4 h-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {showCreateModal && (
                <div className="modal" role="dialog" aria-modal="true" onClick={() => !creating && setShowCreateModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="card-header">
                            <div className="card-title">Create Segment</div>
                        </div>

                        <div className="space-y-3 p-4">
                            <div className="field">
                                <label className="label">Name</label>
                                <input
                                    className="input"
                                    placeholder="e.g., High Intent Visitors"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                                />
                            </div>
                            <div className="field">
                                <label className="label">Description</label>
                                <textarea
                                    className="textarea"
                                    placeholder="Optional description"
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                                />
                            </div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={createForm.is_dynamic}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, is_dynamic: e.target.checked }))}
                                />
                                <span className="text-[var(--text-2)]">Dynamic membership</span>
                            </label>
                            <div className="help-text">
                                Criteria can be configured later in Segment Detail.
                            </div>
                        </div>

                        <div className="card-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowCreateModal(false)}
                                disabled={creating}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCreateAsync}
                                disabled={creating || !createForm.name.trim()}
                            >
                                {creating ? "Creating..." : "Create Segment"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Header({
    search,
    onSearchChange,
    onRefresh,
    onOpenCreate,
    showCreate,
}: {
    search: string;
    onSearchChange: (v: string) => void;
    onRefresh: () => void;
    onOpenCreate: () => void;
    showCreate: boolean;
}) {
    return (
        <header className="flex items-center justify-between gap-3">
            <h1 className="section-title text-xl">Segments</h1>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                    <input
                        className="input pl-9"
                        placeholder="Search segments"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <button className="btn btn-secondary btn-icon" aria-label="Refresh" onClick={onRefresh} title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                </button>
                {showCreate && (
                    <button className="btn btn-primary" onClick={onOpenCreate}>
                        <Plus className="w-4 h-4 mr-1" />
                        Create Segment
                    </button>
                )}
            </div>
        </header>
    );
}

function renderSort(dir?: SortDir) {
    if (!dir) return null;
    return dir === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
}

function formatNumber(n: number) {
    return new Intl.NumberFormat().format(n);
}