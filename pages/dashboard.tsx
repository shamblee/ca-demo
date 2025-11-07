import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useCurrentUser, useStoreMatchingItems } from "@/lib/hooks";
import { cn } from "@/lib/util";
import {
    typeDefs,
    Event as DbEvent,
    Agent as DbAgent,
    Message as DbMessage,
    Segment as DbSegment,
    MessageCategory as DbMessageCategory,
} from "@/lib/schema";
import { SignInRequired } from "@/components/SignInRequired";
import {
    Activity,
    ArrowUpRight,
    BarChart3,
    Calendar,
    Download,
    ExternalLink,
    Layers,
    LineChart,
    Plus,
    RefreshCw,
    SlidersHorizontal,
} from "lucide-react";

type TabKey = "web" | "messaging" | "ecommerce" | "attribution";
type DatePreset = "7d" | "30d" | "90d" | "custom";
type Granularity = "hour" | "day" | "week";
type Channel = "email" | "sms" | "push";

interface FilterState {
    datePreset: DatePreset;
    customStart?: string;
    customEnd?: string;
    granularity: Granularity;
    agentId?: string;
    messageId?: string;
    messageCategoryId?: string;
    segmentId?: string;
    channel?: Channel;
    stackedSeries: boolean;
}

function addDays(d: Date, delta: number) {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + delta);
    return nd;
}

function startOfDay(d: Date) {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    return nd;
}
function endOfDay(d: Date) {
    const nd = new Date(d);
    nd.setHours(23, 59, 59, 999);
    return nd;
}

function startOfWeek(d: Date) {
    const nd = new Date(d);
    const day = nd.getDay(); // 0 Sun ... 6 Sat
    const offset = (day + 6) % 7; // Monday as 0
    nd.setDate(nd.getDate() - offset);
    return startOfDay(nd);
}

function formatNumber(n: number) {
    return Intl.NumberFormat().format(n);
}
function formatCurrency(n: number, currency = "USD") {
    return Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}
function pct(n: number, d: number) {
    if (!d) return 0;
    return (n / d) * 100;
}

function toDate(value?: string) {
    return value ? new Date(value) : undefined;
}

function getDateRange(preset: DatePreset, customStart?: string, customEnd?: string) {
    const now = new Date();
    if (preset === "custom" && customStart && customEnd) {
        const s = startOfDay(new Date(customStart));
        const e = endOfDay(new Date(customEnd));
        return { start: s, end: e };
    }
    const map: Record<Exclude<DatePreset, "custom">, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const days = map[preset === "custom" ? "7d" : preset] ?? 7;
    const end = endOfDay(now);
    const start = startOfDay(addDays(now, -days + 1));
    return { start, end };
}

function buildBuckets(start: Date, end: Date, granularity: Granularity): Date[] {
    const buckets: Date[] = [];
    const cur = new Date(start);
    if (granularity === "hour") {
        cur.setMinutes(0, 0, 0);
        while (cur <= end) {
            buckets.push(new Date(cur));
            cur.setHours(cur.getHours() + 1);
        }
    } else if (granularity === "day") {
        const s = startOfDay(cur);
        while (s <= end) {
            buckets.push(new Date(s));
            s.setDate(s.getDate() + 1);
        }
    } else {
        // week: use Monday starts
        let w = startOfWeek(cur);
        while (w <= end) {
            buckets.push(new Date(w));
            w.setDate(w.getDate() + 7);
        }
    }
    return buckets;
}

function sameBucket(a: Date, b: Date, granularity: Granularity) {
    if (granularity === "hour") {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate() &&
            a.getHours() === b.getHours()
        );
    } else if (granularity === "day") {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    } else {
        const aa = startOfWeek(a);
        const bb = startOfWeek(b);
        return (
            aa.getFullYear() === bb.getFullYear() &&
            aa.getMonth() === bb.getMonth() &&
            aa.getDate() === bb.getDate()
        );
    }
}

function csvDownload(filename: string, headers: string[], rows: (string | number)[][]) {
    const escape = (v: any) => {
        const s = String(v ?? "");
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };
    const body = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
    const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function MiniBarChart({
    series,
    stacked,
    height = 120,
}: {
    series: { key: string; colorVar: string; values: number[]; visible?: boolean }[];
    stacked: boolean;
    height?: number;
}) {
    const max = useMemo(() => {
        if (stacked) {
            const sums = series[0]?.values.map((_, i) => series.reduce((acc, s) => (s.visible === false ? acc : acc + (s.values[i] || 0)), 0)) || [0];
            return Math.max(1, ...sums);
        }
        return Math.max(
            1,
            ...series.flatMap((s) => (s.visible === false ? [0] : s.values)).filter((v) => Number.isFinite(v))
        );
    }, [series, stacked]);

    const columns = series[0]?.values.length || 0;

    return (
        <div className="w-full overflow-x-auto">
            <div className="flex items-end gap-1" style={{ height }}>
                {Array.from({ length: columns }).map((_, i) => {
                    const colValues = series
                        .filter((s) => s.visible !== false)
                        .map((s) => ({ colorVar: s.colorVar, value: s.values[i] || 0 }));
                    const total = stacked ? colValues.reduce((acc, v) => acc + v.value, 0) : undefined;
                    return (
                        <div key={i} className="flex-1 min-w-[8px] flex items-end">
                            {stacked ? (
                                <div className="flex flex-col justify-end w-full">
                                    {colValues.map((cv, idx) => {
                                        const h = total ? Math.round((cv.value / (max || 1)) * height) : 0;
                                        return (
                                            <div
                                                key={idx}
                                                className="w-full"
                                                style={{
                                                    height: `${h}px`,
                                                    background: `var(${cv.colorVar})`,
                                                    opacity: 0.9,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="w-full relative" style={{ height: Math.round(height * 0.95) }}>
                                    {colValues.map((cv, idx) => {
                                        const h = Math.round((cv.value / (max || 1)) * height);
                                        return (
                                            <div
                                                key={idx}
                                                className="absolute bottom-0 w-[70%] left-1/2 -translate-x-1/2 rounded"
                                                style={{
                                                    height: `${h}px`,
                                                    background: `var(${cv.colorVar})`,
                                                    opacity: 0.8 - idx * 0.15,
                                                    transform: `translateX(calc(-50% + ${idx * 4 - (colValues.length - 1) * 2}px))`,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function LegendItem({
    active,
    label,
    colorVar,
    onToggle,
}: {
    active: boolean;
    label: string;
    colorVar: string;
    onToggle: () => void;
}) {
    return (
        <button
            className={cn("legend item rounded-full px-3 py-1 flex items-center gap-2", active ? "highlight" : "border")}
            onClick={onToggle}
        >
            <span className="swatch w-3 h-3 rounded" style={{ background: `var(${colorVar})` }} />
            <span className="text-sm">{label}</span>
        </button>
    );
}

export default function DashboardPage() {
    const user = useCurrentUser();
    const account = useAccount();

    const [tab, setTab] = useState<TabKey>("web");
    const [filters, setFilters] = useState<FilterState>({
        datePreset: "30d",
        granularity: "day",
        stackedSeries: true,
    });

    // Load entities scoped to current account
    const events = useStoreMatchingItems<DbEvent>(
        typeDefs.Event,
        account?.id ? { account_id: account.id } : undefined,
        { limit: 5000, orderBy: "occurred_at", orderByDesc: true }
    );
    const agents = useStoreMatchingItems<DbAgent>(
        typeDefs.Agent,
        account?.id ? { account_id: account.id } : undefined,
        { orderBy: "created_at", orderByDesc: true, limit: 200 }
    );
    const messages = useStoreMatchingItems<DbMessage>(
        typeDefs.Message,
        account?.id ? { account_id: account.id } : undefined,
        { orderBy: "created_at", orderByDesc: true, limit: 500 }
    );
    const categories = useStoreMatchingItems<DbMessageCategory>(
        typeDefs.MessageCategory,
        account?.id ? { account_id: account.id } : undefined,
        { orderBy: "name" }
    );
    const segments = useStoreMatchingItems<DbSegment>(
        typeDefs.Segment,
        account?.id ? { account_id: account.id } : undefined,
        { orderBy: "created_at", orderByDesc: true }
    );

    const loading =
        user === null ||
        account === null ||
        events === null ||
        agents === null ||
        messages === null ||
        categories === null ||
        segments === null;

    const { start, end } = getDateRange(filters.datePreset, filters.customStart, filters.customEnd);

    const messageById = useMemo(() => {
        const map = new Map<string, DbMessage>();
        (messages || []).forEach((m) => map.set(m.id, m));
        return map;
    }, [messages]);

    const filteredEvents = useMemo(() => {
        if (!events || !account) return [];
        const startMs = start.getTime();
        const endMs = end.getTime();
        const catId = filters.messageCategoryId;
        const allowedMessageIds =
            catId && messages ? new Set(messages.filter((m) => m.category_id === catId).map((m) => m.id)) : undefined;

        return events.filter((e) => {
            const t = toDate(e.occurred_at)?.getTime() ?? 0;
            if (t < startMs || t > endMs) return false;
            if (filters.channel && e.channel && e.channel !== filters.channel) return false;
            if (filters.agentId && e.agent_id && e.agent_id !== filters.agentId) return false;
            if (filters.messageId && e.message_id && e.message_id !== filters.messageId) return false;
            if (allowedMessageIds && e.message_id && !allowedMessageIds.has(e.message_id)) return false;
            // Segment-level filter is not directly available on events; would require join. Skipping for now.
            return true;
        });
    }, [events, start, end, filters.channel, filters.agentId, filters.messageId, filters.messageCategoryId, messages, account]);

    // Simple aggregations per tab
    const webTypes = new Set(["page_view", "session_start", "form_submit"]);
    const msgTypes = new Set(["message_sent", "message_open", "message_click", "message_bounce", "subscriber_new", "subscriber_removed"]);
    const ecommerceTypes = new Set(["add_to_cart", "favorite", "checkout_started", "checkout_abandoned", "purchase"]);

    function bucketize(evts: DbEvent[], types: string[], granularity: Granularity) {
        const buckets = buildBuckets(start, end, granularity);
        const seriesMap: Record<string, number[]> = {};
        types.forEach((t) => (seriesMap[t] = Array(buckets.length).fill(0)));

        evts.forEach((e) => {
            if (!types.includes(e.event_type)) return;
            const od = new Date(e.occurred_at);
            // find bucket index
            const idx = buckets.findIndex((b) => sameBucket(b, od, granularity));
            if (idx >= 0) {
                seriesMap[e.event_type][idx] += 1;
            }
        });

        return { buckets, seriesMap };
    }

    // KPI computations
    const kpi = useMemo(() => {
        // Current period
        const cur = filteredEvents;
        // Previous period (same length)
        const prevStart = addDays(start, -(Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1));
        const prevEnd = addDays(start, -1);
        const prev = (events || []).filter((e) => {
            const t = toDate(e.occurred_at)?.getTime() ?? 0;
            if (t < prevStart.getTime() || t > endOfDay(prevEnd).getTime()) return false;
            if (filters.channel && e.channel && e.channel !== filters.channel) return false;
            if (filters.agentId && e.agent_id && e.agent_id !== filters.agentId) return false;
            if (filters.messageId && e.message_id && e.message_id !== filters.messageId) return false;
            return true;
        });

        const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

        const webCur = cur.filter((e) => webTypes.has(e.event_type));
        const webPrev = prev.filter((e) => webTypes.has(e.event_type));
        const webViews = webCur.filter((e) => e.event_type === "page_view").length;
        const sessions = webCur.filter((e) => e.event_type === "session_start").length;
        const forms = webCur.filter((e) => e.event_type === "form_submit").length;
        const webViewsPrev = webPrev.filter((e) => e.event_type === "page_view").length;

        const msgCur = cur.filter((e) => msgTypes.has(e.event_type));
        const sent = msgCur.filter((e) => e.event_type === "message_sent").length;
        const opened = msgCur.filter((e) => e.event_type === "message_open").length;
        const clicked = msgCur.filter((e) => e.event_type === "message_click").length;
        const bounces = msgCur.filter((e) => e.event_type === "message_bounce").length;
        const sentPrev = prev.filter((e) => e.event_type === "message_sent").length;

        const ecoCur = cur.filter((e) => ecommerceTypes.has(e.event_type));
        const purchases = ecoCur.filter((e) => e.event_type === "purchase").length;
        const revenue = sum(ecoCur.filter((e) => e.event_type === "purchase").map((e) => e.revenue || 0));
        const ecoPrev = prev.filter((e) => e.event_type === "purchase");
        const prevRevenue = sum(ecoPrev.map((e) => e.revenue || 0));

        const attributionRevenue = revenue; // simplified for now

        return {
            web: [
                { label: "Page views", value: webViews, delta: webViewsPrev ? (webViews - webViewsPrev) / Math.max(1, webViewsPrev) : 0 },
                { label: "Sessions", value: sessions, delta: 0 },
                { label: "Form submits", value: forms, delta: 0 },
                { label: "Eng. rate", valueStr: sent ? `${Math.round(pct(opened, sent))}%` : "–", delta: 0 },
            ],
            messaging: [
                { label: "Sent", value: sent, delta: sentPrev ? (sent - sentPrev) / Math.max(1, sentPrev) : 0 },
                { label: "Opened", value: opened, delta: 0 },
                { label: "Clicked", value: clicked, delta: 0 },
                { label: "Bounced", value: bounces, delta: 0 },
            ],
            ecommerce: [
                { label: "Purchases", value: purchases, delta: 0 },
                { label: "Revenue", valueStr: formatCurrency(revenue), delta: prevRevenue ? (revenue - prevRevenue) / Math.max(1, prevRevenue) : 0 },
                { label: "AOV", valueStr: purchases ? formatCurrency(revenue / purchases) : "–", delta: 0 },
                { label: "Conv. rate", valueStr: sessions ? `${Math.round(pct(purchases, sessions))}%` : "–", delta: 0 },
            ],
            attribution: [
                { label: "Revenue (attr.)", valueStr: formatCurrency(attributionRevenue), delta: 0 },
                { label: "Orders", value: purchases, delta: 0 },
                { label: "AOV", valueStr: purchases ? formatCurrency(revenue / purchases) : "–", delta: 0 },
                { label: "ROI", valueStr: purchases ? `${(revenue / Math.max(1, sent)).toFixed(2)}x` : "–", delta: 0 },
            ],
        };
    }, [filteredEvents, events, start, end, filters.channel, filters.agentId, filters.messageId]);

    // Messaging legend toggles
    const [legend, setLegend] = useState<Record<string, boolean>>({
        page_view: true,
        session_start: true,
        form_submit: true,
        message_sent: true,
        message_open: true,
        message_click: true,
        message_bounce: true,
        email: true,
        sms: true,
        push: true,
        add_to_cart: true,
        checkout_started: true,
        checkout_abandoned: true,
        purchase: true,
    });

    useEffect(() => {
        // reset on account change
        setLegend((l) => ({ ...l }));
    }, [account?.id]);

    if (user === undefined) {
        return (
            <div className="page--DashboardPage container-page">
                <SignInRequired message="Please sign in to view your analytics dashboard." />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="page--DashboardPage container-page space-y-4">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <LineChart className="w-5 h-5 text-[var(--text-3)]" />
                        <h1 className="section-title text-xl">Dashboard</h1>
                    </div>
                </header>

                <section className="card p-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="kpi">
                                <div className="kpi-label skeleton h-4 w-24 rounded" />
                                <div className="kpi-value skeleton h-6 w-32 rounded mt-2" />
                                <div className="kpi-delta skeleton h-3 w-16 rounded mt-1" />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="content-2col">
                    <div className="space-y-3">
                        <div className="card p-3">
                            <div className="skeleton h-8 w-64 rounded mb-4" />
                            <div className="skeleton h-40 w-full rounded" />
                        </div>
                    </div>
                    <aside className="right-rail space-y-3">
                        <div className="card p-3">
                            <div className="skeleton h-6 w-36 rounded mb-2" />
                            <div className="flex gap-2">
                                <div className="skeleton h-9 w-28 rounded" />
                                <div className="skeleton h-9 w-28 rounded" />
                            </div>
                        </div>
                    </aside>
                </section>
            </div>
        );
    }

    // Helper: top pages/messages/products
    const topPages = useMemo(() => {
        const counts = new Map<string, number>();
        filteredEvents
            .filter((e) => e.event_type === "page_view" && e.page_url)
            .forEach((e) => counts.set(e.page_url!, (counts.get(e.page_url!) || 0) + 1));
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    }, [filteredEvents]);

    const topMessages = useMemo(() => {
        const stats = new Map<
            string,
            { name: string; sent: number; opens: number; clicks: number; bounces: number; lastCreatedAt?: string }
        >();
        filteredEvents
            .filter((e) => e.message_id && msgTypes.has(e.event_type))
            .forEach((e) => {
                const id = e.message_id!;
                const m = messageById.get(id);
                const row = stats.get(id) || {
                    name: m?.name || id,
                    sent: 0,
                    opens: 0,
                    clicks: 0,
                    bounces: 0,
                    lastCreatedAt: m?.created_at,
                };
                if (e.event_type === "message_sent") row.sent += 1;
                if (e.event_type === "message_open") row.opens += 1;
                if (e.event_type === "message_click") row.clicks += 1;
                if (e.event_type === "message_bounce") row.bounces += 1;
                stats.set(id, row);
            });
        return Array.from(stats.entries())
            .map(([id, s]) => ({ id, ...s }))
            .sort((a, b) => b.clicks - a.clicks || b.opens - a.opens)
            .slice(0, 10);
    }, [filteredEvents, messageById]);

    const topProducts = useMemo(() => {
        const counts = new Map<string, { adds: number; purchases: number; revenue: number }>();
        filteredEvents
            .filter((e) => e.product_id && (e.event_type === "add_to_cart" || e.event_type === "purchase"))
            .forEach((e) => {
                const id = e.product_id!;
                const row = counts.get(id) || { adds: 0, purchases: 0, revenue: 0 };
                if (e.event_type === "add_to_cart") row.adds += 1;
                if (e.event_type === "purchase") {
                    row.purchases += 1;
                    row.revenue += e.revenue || 0;
                }
                counts.set(id, row);
            });
        return Array.from(counts.entries())
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => b.revenue - a.revenue || b.purchases - a.purchases)
            .slice(0, 10);
    }, [filteredEvents]);

    // Series for tabs
    const webSeries = useMemo(() => {
        const types = ["page_view", "session_start", "form_submit"];
        const { buckets, seriesMap } = bucketize(filteredEvents, types, filters.granularity);
        return {
            buckets,
            series: [
                { key: "Page views", type: "page_view", colorVar: "--chart-1", visible: legend.page_view !== false },
                { key: "Sessions", type: "session_start", colorVar: "--chart-2", visible: legend.session_start !== false },
                { key: "Form submits", type: "form_submit", colorVar: "--chart-3", visible: legend.form_submit !== false },
            ].map((s) => ({ key: s.key, colorVar: s.colorVar, visible: s.visible, values: seriesMap[s.type] || [] })),
        };
    }, [filteredEvents, filters.granularity, legend.page_view, legend.session_start, legend.form_submit]);

    const msgSeriesByChannel = useMemo(() => {
        // time-series stacked by channel for "message_sent"
        const channels: Channel[] = ["email", "sms", "push"];
        const byCh = channels.map((ch) => {
            const chEvents = filteredEvents.filter((e) => e.event_type === "message_sent" && e.channel === ch);
            const { buckets, seriesMap } = bucketize(chEvents, ["message_sent"], filters.granularity);
            return {
                ch,
                buckets,
                values: seriesMap["message_sent"] || [],
            };
        });
        const buckets = byCh[0]?.buckets || buildBuckets(start, end, filters.granularity);
        return {
            buckets,
            series: byCh.map((s, i) => ({
                key: s.ch,
                colorVar: i === 0 ? "--chart-1" : i === 1 ? "--chart-2" : "--chart-3",
                values: s.values,
                visible: legend[s.ch] !== false,
            })),
        };
    }, [filteredEvents, filters.granularity, start, end, legend.email, legend.sms, legend.push]);

    const ecoSeries = useMemo(() => {
        const types = ["add_to_cart", "checkout_started", "checkout_abandoned", "purchase"];
        const { buckets, seriesMap } = bucketize(filteredEvents, types, filters.granularity);
        return {
            buckets,
            series: [
                { key: "Add to cart", type: "add_to_cart", colorVar: "--chart-1", visible: legend.add_to_cart !== false },
                { key: "Checkout started", type: "checkout_started", colorVar: "--chart-2", visible: legend.checkout_started !== false },
                { key: "Abandoned", type: "checkout_abandoned", colorVar: "--chart-4", visible: legend.checkout_abandoned !== false },
                { key: "Purchases", type: "purchase", colorVar: "--chart-3", visible: legend.purchase !== false },
            ].map((s) => ({ key: s.key, colorVar: s.colorVar, visible: s.visible, values: seriesMap[s.type] || [] })),
        };
    }, [filteredEvents, filters.granularity, legend.add_to_cart, legend.checkout_started, legend.checkout_abandoned, legend.purchase]);

    // Attribution dimension compare
    const [attrDim, setAttrDim] = useState<"agent" | "message">("agent");
    const [compareA, setCompareA] = useState<string | undefined>(undefined);
    const [compareB, setCompareB] = useState<string | undefined>(undefined);
    const attributionRows = useMemo(() => {
        const isAgent = attrDim === "agent";
        const byKey = new Map<string, { revenue: number; orders: number; sends: number }>();
        filteredEvents.forEach((e) => {
            const key = isAgent ? e.agent_id : e.message_id;
            if (!key) return;
            const row = byKey.get(key) || { revenue: 0, orders: 0, sends: 0 };
            if (e.event_type === "purchase") {
                row.revenue += e.revenue || 0;
                row.orders += 1;
            }
            if (e.event_type === "message_sent") row.sends += 1;
            byKey.set(key, row);
        });
        const rows = Array.from(byKey.entries()).map(([id, r]) => ({
            id,
            name:
                (isAgent ? agents?.find((a) => a.id === id)?.name : messages?.find((m) => m.id === id)?.name) ||
                id ||
                "Unknown",
            revenue: r.revenue,
            orders: r.orders,
            aov: r.orders ? r.revenue / r.orders : 0,
            roiX: r.sends ? r.revenue / r.sends : 0,
        }));
        rows.sort((a, b) => b.revenue - a.revenue);
        return rows;
    }, [filteredEvents, attrDim, agents, messages]);

    const compareAStats = useMemo(() => attributionRows.find((r) => r.id === compareA), [attributionRows, compareA]);
    const compareBStats = useMemo(() => attributionRows.find((r) => r.id === compareB), [attributionRows, compareB]);

    // Deliverability
    const msgSent = filteredEvents.filter((e) => e.event_type === "message_sent").length;
    const msgBounced = filteredEvents.filter((e) => e.event_type === "message_bounce").length;
    const deliverability = msgSent ? 1 - msgBounced / msgSent : 0;

    return (
        <div className="page--DashboardPage container-page space-y-4">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-[var(--text-3)]" />
                    <h1 className="section-title text-xl">Dashboard</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/create-agent" className="btn btn-primary flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        New Agent
                    </Link>
                    <button className="btn btn-secondary btn-icon" aria-label="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <section className="card p-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[var(--text-2)]">Date</span>
                        <div className="flex gap-1">
                            {(["7d", "30d", "90d", "custom"] as DatePreset[]).map((p) => (
                                <button
                                    key={p}
                                    className={cn("chip", filters.datePreset === p && "chip brand")}
                                    onClick={() => setFilters((f) => ({ ...f, datePreset: p }))}
                                >
                                    {p === "7d" ? "7d" : p === "30d" ? "30d" : p === "90d" ? "90d" : "Custom"}
                                </button>
                            ))}
                        </div>
                        {filters.datePreset === "custom" && (
                            <div className="flex items-center gap-2">
                                <input
                                    className="input"
                                    type="date"
                                    value={filters.customStart || ""}
                                    onChange={(e) => setFilters((f) => ({ ...f, customStart: e.target.value }))}
                                />
                                <span>–</span>
                                <input
                                    className="input"
                                    type="date"
                                    value={filters.customEnd || ""}
                                    onChange={(e) => setFilters((f) => ({ ...f, customEnd: e.target.value }))}
                                />
                            </div>
                        )}
                        <div className="divider mx-2 hidden md:block" />
                        <span className="text-[var(--text-2)]">Granularity</span>
                        <select
                            className="select"
                            value={filters.granularity}
                            onChange={(e) => setFilters((f) => ({ ...f, granularity: e.target.value as Granularity }))}
                        >
                            <option value="hour">Hour</option>
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                        </select>
                        <div className="divider mx-2 hidden md:block" />
                        <span className="text-[var(--text-2)] flex items-center gap-2">
                            <SlidersHorizontal className="w-4 h-4" />
                            Filters
                        </span>
                        <select
                            className="select"
                            value={filters.agentId || ""}
                            onChange={(e) => setFilters((f) => ({ ...f, agentId: e.target.value || undefined }))}
                        >
                            <option value="">Agent: All</option>
                            {(agents || []).map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                        <select
                            className="select"
                            value={filters.messageCategoryId || ""}
                            onChange={(e) => setFilters((f) => ({ ...f, messageCategoryId: e.target.value || undefined }))}
                        >
                            <option value="">Category: All</option>
                            {(categories || []).map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <select
                            className="select"
                            value={filters.messageId || ""}
                            onChange={(e) => setFilters((f) => ({ ...f, messageId: e.target.value || undefined }))}
                        >
                            <option value="">Message: All</option>
                            {(messages || []).map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                        <select
                            className="select"
                            value={filters.segmentId || ""}
                            onChange={(e) => setFilters((f) => ({ ...f, segmentId: e.target.value || undefined }))}
                        >
                            <option value="">Segment: All</option>
                            {(segments || []).map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                        <select
                            className="select"
                            value={filters.channel || ""}
                            onChange={(e) => setFilters((f) => ({ ...f, channel: (e.target.value || undefined) as Channel | undefined }))}
                        >
                            <option value="">Channel: All</option>
                            <option value="email">Email</option>
                            <option value="sms">SMS</option>
                            <option value="push">Push</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[var(--text-3)]" />
                        <div className="text-[var(--text-2)]">
                            {start.toLocaleDateString()} – {end.toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </section>

            {/* KPI strip (varies by tab) */}
            <section className="card p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 kpi-grid">
                    {(tab === "web" ? kpi.web : tab === "messaging" ? kpi.messaging : tab === "ecommerce" ? kpi.ecommerce : kpi.attribution).map(
                        (it, idx) => (
                            <div key={idx} className="kpi">
                                <div className="kpi-label">{it.label}</div>
                                {"value" in it ? (
                                    <div className="kpi-value">{formatNumber((it as any).value)}</div>
                                ) : (
                                    <div className="kpi-value">{(it as any).valueStr}</div>
                                )}
                                <div className={cn("kpi-delta", (it.delta || 0) >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                                    {(it.delta || 0) === 0 ? "–" : `${(it.delta * 100 > 0 ? "+" : "")}${(it.delta * 100).toFixed(1)}%`}
                                </div>
                            </div>
                        )
                    )}
                </div>
            </section>

            {/* Tabs */}
            <section className="card p-0">
                <div className="card-header px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <button className={cn("tab", tab === "web" && "active")} onClick={() => setTab("web")}>
                            Web
                        </button>
                        <button className={cn("tab", tab === "messaging" && "active")} onClick={() => setTab("messaging")}>
                            Messaging
                        </button>
                        <button className={cn("tab", tab === "ecommerce" && "active")} onClick={() => setTab("ecommerce")}>
                            Ecommerce
                        </button>
                        <button className={cn("tab", tab === "attribution" && "active")} onClick={() => setTab("attribution")}>
                            Attribution
                        </button>
                    </div>

                    <div className="flex items-center gap-2 pr-2">
                        <Layers className="w-4 h-4 text-[var(--text-3)]" />
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                className="checkbox"
                                checked={filters.stackedSeries}
                                onChange={(e) => setFilters((f) => ({ ...f, stackedSeries: e.target.checked }))}
                            />
                            <span className="text-[var(--text-2)]">Stacked</span>
                        </label>
                    </div>
                </div>

                {/* Two-column layout for content + right rail */}
                <div className="content-2col p-3">
                    {/* Primary content per tab */}
                    <div className="space-y-4">
                        {tab === "web" && (
                            <>
                                <div className="card p-3">
                                    <div className="card-header items-center justify-between">
                                        <div className="card-title flex items-center gap-2">
                                            <Activity className="w-4 h-4" />
                                            Traffic & Engagement
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <LegendItem
                                                label="Page views"
                                                colorVar="--chart-1"
                                                active={legend.page_view !== false}
                                                onToggle={() =>
                                                    setLegend((l) => ({ ...l, page_view: l.page_view === false ? true : false }))
                                                }
                                            />
                                            <LegendItem
                                                label="Sessions"
                                                colorVar="--chart-2"
                                                active={legend.session_start !== false}
                                                onToggle={() =>
                                                    setLegend((l) => ({
                                                        ...l,
                                                        session_start: l.session_start === false ? true : false,
                                                    }))
                                                }
                                            />
                                            <LegendItem
                                                label="Form submits"
                                                colorVar="--chart-3"
                                                active={legend.form_submit !== false}
                                                onToggle={() =>
                                                    setLegend((l) => ({
                                                        ...l,
                                                        form_submit: l.form_submit === false ? true : false,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>
                                    <MiniBarChart series={webSeries.series} stacked={filters.stackedSeries} height={140} />
                                </div>

                                <div className="card p-3">
                                    <div className="card-title mb-3">Top Pages</div>
                                    <div className="table-wrap">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Page URL</th>
                                                    <th>Views</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {topPages.map(([url, count]) => (
                                                    <tr key={url}>
                                                        <td className="td-base">
                                                            <a className="link" href={url} target="_blank" rel="noreferrer">
                                                                {url}
                                                                <ExternalLink className="w-3.5 h-3.5 inline ml-1" />
                                                            </a>
                                                        </td>
                                                        <td className="td-base">{formatNumber(count)}</td>
                                                    </tr>
                                                ))}
                                                {topPages.length === 0 && (
                                                    <tr>
                                                        <td className="td-base text-[var(--text-3)]" colSpan={2}>
                                                            No page view data for the selected filters.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="card-footer">
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() =>
                                                csvDownload(
                                                    "top-pages.csv",
                                                    ["page_url", "views"],
                                                    topPages.map(([u, c]) => [u, c])
                                                )
                                            }
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Export CSV
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {tab === "messaging" && (
                            <>
                                <div className="card p-3">
                                    <div className="card-header items-center justify-between">
                                        <div className="card-title flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4" />
                                            Sends by Channel
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <LegendItem
                                                label="Email"
                                                colorVar="--chart-1"
                                                active={legend.email !== false}
                                                onToggle={() => setLegend((l) => ({ ...l, email: l.email === false ? true : false }))}
                                            />
                                            <LegendItem
                                                label="SMS"
                                                colorVar="--chart-2"
                                                active={legend.sms !== false}
                                                onToggle={() => setLegend((l) => ({ ...l, sms: l.sms === false ? true : false }))}
                                            />
                                            <LegendItem
                                                label="Push"
                                                colorVar="--chart-3"
                                                active={legend.push !== false}
                                                onToggle={() => setLegend((l) => ({ ...l, push: l.push === false ? true : false }))}
                                            />
                                        </div>
                                    </div>
                                    <MiniBarChart series={msgSeriesByChannel.series} stacked={filters.stackedSeries} height={140} />
                                </div>

                                <div className="grid gap-3 md:grid-cols-3">
                                    <div className="card p-3">
                                        <div className="text-[var(--text-2)]">Deliverability</div>
                                        <div className="text-2xl font-semibold mt-1">
                                            {msgSent ? `${(deliverability * 100).toFixed(1)}%` : "–"}
                                        </div>
                                        <div className="text-[var(--text-3)] mt-1">
                                            Sent: {formatNumber(msgSent)} · Bounced: {formatNumber(msgBounced)}
                                        </div>
                                    </div>
                                    <div className="card p-3">
                                        <div className="text-[var(--text-2)]">Open rate</div>
                                        <div className="text-2xl font-semibold mt-1">
                                            {(() => {
                                                const opens = filteredEvents.filter((e) => e.event_type === "message_open").length;
                                                return msgSent ? `${(pct(opens, msgSent)).toFixed(1)}%` : "–";
                                            })()}
                                        </div>
                                    </div>
                                    <div className="card p-3">
                                        <div className="text-[var(--text-2)]">Click-through</div>
                                        <div className="text-2xl font-semibold mt-1">
                                            {(() => {
                                                const clicks = filteredEvents.filter((e) => e.event_type === "message_click").length;
                                                return msgSent ? `${(pct(clicks, msgSent)).toFixed(1)}%` : "–";
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div className="card p-3">
                                    <div className="card-title mb-3">Top Messages</div>
                                    <div className="table-wrap">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Sent</th>
                                                    <th>Opens</th>
                                                    <th>Clicks</th>
                                                    <th>Bounces</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {topMessages.map((m) => (
                                                    <tr key={m.id}>
                                                        <td className="td-base">{m.name}</td>
                                                        <td className="td-base">{formatNumber(m.sent)}</td>
                                                        <td className="td-base">{formatNumber(m.opens)}</td>
                                                        <td className="td-base">{formatNumber(m.clicks)}</td>
                                                        <td className="td-base">{formatNumber(m.bounces)}</td>
                                                        <td className="td-base">
                                                            <div className="flex gap-2">
                                                                <Link className="btn btn-secondary" href="/message-detail">
                                                                    View <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                                                                </Link>
                                                                <Link className="btn btn-secondary" href="/message-category">
                                                                    Category
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {topMessages.length === 0 && (
                                                    <tr>
                                                        <td className="td-base text-[var(--text-3)]" colSpan={6}>
                                                            No messaging data for the selected filters.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="card-footer">
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() =>
                                                csvDownload(
                                                    "top-messages.csv",
                                                    ["id", "name", "sent", "opens", "clicks", "bounces"],
                                                    topMessages.map((m) => [m.id, m.name, m.sent, m.opens, m.clicks, m.bounces])
                                                )
                                            }
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Export CSV
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {tab === "ecommerce" && (
                            <>
                                <div className="card p-3">
                                    <div className="card-header items-center justify-between">
                                        <div className="card-title flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4" />
                                            Ecommerce Funnel & Trends
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <LegendItem
                                                label="Add to cart"
                                                colorVar="--chart-1"
                                                active={legend.add_to_cart !== false}
                                                onToggle={() =>
                                                    setLegend((l) => ({ ...l, add_to_cart: l.add_to_cart === false ? true : false }))
                                                }
                                            />
                                            <LegendItem
                                                label="Checkout started"
                                                colorVar="--chart-2"
                                                active={legend.checkout_started !== false}
                                                onToggle={() =>
                                                    setLegend((l) => ({
                                                        ...l,
                                                        checkout_started: l.checkout_started === false ? true : false,
                                                    }))
                                                }
                                            />
                                            <LegendItem
                                                label="Abandoned"
                                                colorVar="--chart-4"
                                                active={legend.checkout_abandoned !== false}
                                                onToggle={() =>
                                                    setLegend((l) => ({
                                                        ...l,
                                                        checkout_abandoned: l.checkout_abandoned === false ? true : false,
                                                    }))
                                                }
                                            />
                                            <LegendItem
                                                label="Purchases"
                                                colorVar="--chart-3"
                                                active={legend.purchase !== false}
                                                onToggle={() =>
                                                    setLegend((l) => ({ ...l, purchase: l.purchase === false ? true : false }))
                                                }
                                            />
                                        </div>
                                    </div>
                                    <MiniBarChart series={ecoSeries.series} stacked={filters.stackedSeries} height={140} />
                                </div>

                                {/* Funnel summary */}
                                <div className="grid md:grid-cols-4 gap-3">
                                    {(() => {
                                        const adds = filteredEvents.filter((e) => e.event_type === "add_to_cart").length;
                                        const starts = filteredEvents.filter((e) => e.event_type === "checkout_started").length;
                                        const abandons = filteredEvents.filter((e) => e.event_type === "checkout_abandoned").length;
                                        const orders = filteredEvents.filter((e) => e.event_type === "purchase").length;
                                        const revenue = filteredEvents
                                            .filter((e) => e.event_type === "purchase")
                                            .reduce((sum, e) => sum + (e.revenue || 0), 0);

                                        return (
                                            <>
                                                <div className="card p-3">
                                                    <div className="text-[var(--text-2)]">Adds to cart</div>
                                                    <div className="text-2xl font-semibold">{formatNumber(adds)}</div>
                                                </div>
                                                <div className="card p-3">
                                                    <div className="text-[var(--text-2)]">Checkout started</div>
                                                    <div className="text-2xl font-semibold">{formatNumber(starts)}</div>
                                                </div>
                                                <div className="card p-3">
                                                    <div className="text-[var(--text-2)]">Abandoned</div>
                                                    <div className="text-2xl font-semibold">{formatNumber(abandons)}</div>
                                                </div>
                                                <div className="card p-3">
                                                    <div className="text-[var(--text-2)]">Purchases · Revenue</div>
                                                    <div className="text-2xl font-semibold">{formatNumber(orders)}</div>
                                                    <div className="text-[var(--text-2)]">{formatCurrency(revenue)}</div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {/* Top products */}
                                <div className="card p-3">
                                    <div className="card-title mb-3">Top Products</div>
                                    <div className="table-wrap">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Product ID</th>
                                                    <th>Adds</th>
                                                    <th>Purchases</th>
                                                    <th>Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {topProducts.map((p) => (
                                                    <tr key={p.id}>
                                                        <td className="td-base">{p.id}</td>
                                                        <td className="td-base">{formatNumber(p.adds)}</td>
                                                        <td className="td-base">{formatNumber(p.purchases)}</td>
                                                        <td className="td-base">{formatCurrency(p.revenue)}</td>
                                                    </tr>
                                                ))}
                                                {topProducts.length === 0 && (
                                                    <tr>
                                                        <td className="td-base text-[var(--text-3)]" colSpan={4}>
                                                            No product data for the selected filters.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="card-footer">
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() =>
                                                csvDownload(
                                                    "top-products.csv",
                                                    ["product_id", "adds", "purchases", "revenue"],
                                                    topProducts.map((p) => [p.id, p.adds, p.purchases, p.revenue])
                                                )
                                            }
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Export CSV
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {tab === "attribution" && (
                            <>
                                <div className="card p-3 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[var(--text-2)]">Dimension</span>
                                        <select
                                            className="select"
                                            value={attrDim}
                                            onChange={(e) => {
                                                setAttrDim(e.target.value as "agent" | "message");
                                                setCompareA(undefined);
                                                setCompareB(undefined);
                                            }}
                                        >
                                            <option value="agent">Agent</option>
                                            <option value="message">Message</option>
                                        </select>

                                        <div className="divider mx-2" />

                                        <span className="text-[var(--text-2)]">Compare</span>
                                        <select
                                            className="select"
                                            value={compareA || ""}
                                            onChange={(e) => setCompareA(e.target.value || undefined)}
                                        >
                                            <option value="">Select A</option>
                                            {attributionRows.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            className="select"
                                            value={compareB || ""}
                                            onChange={(e) => setCompareB(e.target.value || undefined)}
                                        >
                                            <option value="">Select B</option>
                                            {attributionRows.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-3">
                                        <div className="card p-3">
                                            <div className="text-[var(--text-2)]">Selection A</div>
                                            {compareAStats ? (
                                                <div className="mt-2 space-y-1">
                                                    <div className="font-semibold">{compareAStats.name}</div>
                                                    <div>Revenue: {formatCurrency(compareAStats.revenue)}</div>
                                                    <div>Orders: {formatNumber(compareAStats.orders)}</div>
                                                    <div>AOV: {formatCurrency(compareAStats.aov)}</div>
                                                    <div>ROI: {compareAStats.roiX.toFixed(2)}x</div>
                                                    <div className="mt-2">
                                                        {attrDim === "agent" ? (
                                                            <Link className="link" href="/agent-detail">
                                                                View decision log
                                                            </Link>
                                                        ) : (
                                                            <Link className="link" href="/message-detail">
                                                                View message
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-[var(--text-3)] mt-2">Choose a selection.</div>
                                            )}
                                        </div>
                                        <div className="card p-3">
                                            <div className="text-[var(--text-2)]">Selection B</div>
                                            {compareBStats ? (
                                                <div className="mt-2 space-y-1">
                                                    <div className="font-semibold">{compareBStats.name}</div>
                                                    <div>Revenue: {formatCurrency(compareBStats.revenue)}</div>
                                                    <div>Orders: {formatNumber(compareBStats.orders)}</div>
                                                    <div>AOV: {formatCurrency(compareBStats.aov)}</div>
                                                    <div>ROI: {compareBStats.roiX.toFixed(2)}x</div>
                                                    <div className="mt-2">
                                                        {attrDim === "agent" ? (
                                                            <Link className="link" href="/agent-detail">
                                                                View decision log
                                                            </Link>
                                                        ) : (
                                                            <Link className="link" href="/message-detail">
                                                                View message
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-[var(--text-3)] mt-2">Choose a selection.</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card p-3">
                                        <div className="card-title mb-2">
                                            {attrDim === "agent" ? "Revenue by Agent" : "Revenue by Message"}
                                        </div>
                                        <div className="table-wrap">
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>{attrDim === "agent" ? "Agent" : "Message"}</th>
                                                        <th>Revenue</th>
                                                        <th>Orders</th>
                                                        <th>AOV</th>
                                                        <th>ROI (rev/send)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {attributionRows.slice(0, 20).map((r) => (
                                                        <tr key={r.id}>
                                                            <td className="td-base">
                                                                <div className="flex items-center gap-2">
                                                                    <span>{r.name}</span>
                                                                    {attrDim === "agent" ? (
                                                                        <Link className="chip" href="/agent-detail">
                                                                            Log
                                                                        </Link>
                                                                    ) : (
                                                                        <Link className="chip" href="/message-detail">
                                                                            Preview
                                                                        </Link>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="td-base">{formatCurrency(r.revenue)}</td>
                                                            <td className="td-base">{formatNumber(r.orders)}</td>
                                                            <td className="td-base">{formatCurrency(r.aov)}</td>
                                                            <td className="td-base">{r.roiX.toFixed(2)}x</td>
                                                        </tr>
                                                    ))}
                                                    {attributionRows.length === 0 && (
                                                        <tr>
                                                            <td className="td-base text-[var(--text-3)]" colSpan={5}>
                                                                No attribution data for the selected filters.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="card-footer">
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() =>
                                                    csvDownload(
                                                        `attribution-${attrDim}.csv`,
                                                        [attrDim, "revenue", "orders", "aov", "roi"],
                                                        attributionRows.map((r) => [
                                                            r.name,
                                                            r.revenue,
                                                            r.orders,
                                                            r.aov.toFixed(2),
                                                            r.roiX.toFixed(2),
                                                        ])
                                                    )
                                                }
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Export CSV
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right rail */}
                    <aside className="right-rail space-y-3">
                        <div className="card p-3">
                            <div className="card-title">Quick Actions</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Link href="/create-agent" className="btn btn-primary">
                                    Create Agent
                                </Link>
                                <Link href="/decisioning" className="btn btn-secondary">
                                    Manage Agents
                                </Link>
                                <Link href="/messages" className="btn btn-secondary">
                                    Browse Messages
                                </Link>
                            </div>
                        </div>

                        <div className="card p-3">
                            <div className="card-title">Recent Activity</div>
                            <div className="mt-2 space-y-2">
                                {(filteredEvents || [])
                                    .slice(-6)
                                    .reverse()
                                    .map((e) => (
                                        <div key={e.id} className="flex items-center justify-between">
                                            <div className="text-sm">
                                                <span className="badge">{e.event_type}</span>
                                                {e.message_id && (
                                                    <span className="ml-2 text-[var(--text-2)]">
                                                        {(messageById.get(e.message_id)?.name || "Message")}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {e.agent_id && (
                                                    <Link className="chip" href="/agent-detail">
                                                        Agent
                                                    </Link>
                                                )}
                                                {e.message_id && (
                                                    <Link className="chip" href="/message-detail">
                                                        Preview
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                {filteredEvents.length === 0 && (
                                    <div className="text-[var(--text-3)] text-sm">No recent events in the selected range.</div>
                                )}
                            </div>
                        </div>

                        <div className="alert info">
                            <div className="font-semibold">Note</div>
                            <div className="text-[var(--text-2)]">
                                Agents only use messages imported from GardenIQ. Authoring is disabled in-app.
                            </div>
                        </div>
                    </aside>
                </div>
            </section>
        </div>
    );
}