import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { SignInRequired } from "@/components/SignInRequired";
import { useAccount, useCurrentUser, useStoreMatchingItems } from "@/lib/hooks";
import { cn } from "@/lib/util";
import { store } from "@/lib/store";
import { typeDefs, Agent_insert, OutcomeMapping_insert, Segment, MessageCategory } from "@/lib/schema";
import { ChevronRight, ChevronLeft, Info, Check, AlertTriangle } from "lucide-react";

type SendFrequency = "daily" | "six_per_week" | "five_per_week" | "weekly" | "biweekly" | "monthly";
type SendTimeWindow = "morning" | "afternoon" | "evening";
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
type OutcomeRank = "worst" | "good" | "very_good" | "best";

interface WizardState {
    step: 1 | 2 | 3;

    // Step 1 — Basics
    name: string;
    defaultEmailFrom: string;
    defaultSmsFrom: string;
    segmentId: string;
    holdoutPercentage: number | "";
    messageCategoryId: string;

    // Step 2 — Schedule
    sendFrequency: SendFrequency | "";
    sendDays: number[]; // 0 = Mon ... 6 = Sun
    sendTimeWindows: SendTimeWindow[];

    // Step 3 — Outcomes
    desiredOutcomeDescription: string;
    outcomeWorst?: EventType;
    outcomeGood?: EventType;
    outcomeVeryGood?: EventType;
    outcomeBest?: EventType;

    // Submission
    submitting: boolean;
    submitError?: string;
}

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeWindowLabels: { key: SendTimeWindow; label: string }[] = [
    { key: "morning", label: "Morning" },
    { key: "afternoon", label: "Afternoon" },
    { key: "evening", label: "Evening" },
];
const frequencyOptions: { key: SendFrequency; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "six_per_week", label: "6x/week" },
    { key: "five_per_week", label: "5x/week" },
    { key: "weekly", label: "Weekly" },
    { key: "biweekly", label: "Every 2 weeks" },
    { key: "monthly", label: "Monthly" },
];
const eventTypeOptions: { key: EventType; label: string; group: "Web" | "Messaging" | "Ecommerce" }[] = [
    { key: "page_view", label: "Page view", group: "Web" },
    { key: "session_start", label: "Session start", group: "Web" },
    { key: "form_submit", label: "Form submit", group: "Web" },
    { key: "message_sent", label: "Message sent", group: "Messaging" },
    { key: "message_open", label: "Message open", group: "Messaging" },
    { key: "message_click", label: "Message click", group: "Messaging" },
    { key: "message_bounce", label: "Message bounce", group: "Messaging" },
    { key: "subscriber_new", label: "New subscriber", group: "Messaging" },
    { key: "subscriber_removed", label: "Unsubscriber", group: "Messaging" },
    { key: "push_open", label: "Push open", group: "Messaging" },
    { key: "add_to_cart", label: "Add to cart", group: "Ecommerce" },
    { key: "favorite", label: "Favorite/Save", group: "Ecommerce" },
    { key: "checkout_started", label: "Checkout started", group: "Ecommerce" },
    { key: "checkout_abandoned", label: "Checkout abandoned", group: "Ecommerce" },
    { key: "purchase", label: "Purchase", group: "Ecommerce" },
];

function useAccountScopedLists(accountId: string | undefined) {
    const segments = useStoreMatchingItems<Segment>(
        accountId ? typeDefs.Segment : null,
        accountId ? { account_id: accountId } as Partial<Segment> : null,
        { orderBy: "created_at", orderByDesc: true }
    );

    const categories = useStoreMatchingItems<MessageCategory>(
        accountId ? typeDefs.MessageCategory : null,
        accountId ? { account_id: accountId } as Partial<MessageCategory> : null,
        { orderBy: "created_at", orderByDesc: true }
    );

    return { segments, categories };
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
    return (
        <div className="steps">
            <div className={cn("step", step === 1 && "active")}>1. Basics</div>
            <div className={cn("step", step === 2 && "active")}>2. Schedule</div>
            <div className={cn("step", step === 3 && "active")}>3. Outcomes</div>
        </div>
    );
}

function isStep1Valid(s: WizardState) {
    const percentOk =
        s.holdoutPercentage === "" ? false : s.holdoutPercentage >= 0 && s.holdoutPercentage <= 100;
    return Boolean(s.name.trim() && s.segmentId && s.messageCategoryId && percentOk);
}

function isStep2Valid(s: WizardState) {
    return Boolean(s.sendFrequency && s.sendDays.length > 0 && s.sendTimeWindows.length > 0);
}

function isStep3Valid(s: WizardState) {
    const ranks: (EventType | undefined)[] = [s.outcomeWorst, s.outcomeGood, s.outcomeVeryGood, s.outcomeBest];
    if (ranks.some((r) => !r)) return false;
    const set = new Set(ranks as EventType[]);
    return set.size === 4;
}

function SelectedName<T extends { id: string; name: string }>(arr: T[] | null, id?: string) {
    if (!arr || !id) return "";
    const found = arr.find((x) => x.id === id);
    return found?.name ?? "";
}

export default function CreateAgentPage() {
    const user = useCurrentUser();
    const account = useAccount();
    const router = useRouter();

    const [state, setState] = useState<WizardState>({
        step: 1,
        name: "",
        defaultEmailFrom: "",
        defaultSmsFrom: "",
        segmentId: "",
        holdoutPercentage: 10,
        messageCategoryId: "",
        sendFrequency: "",
        sendDays: [],
        sendTimeWindows: [],
        desiredOutcomeDescription: "",
        submitting: false,
    });

    const { segments, categories } = useAccountScopedLists(account?.id);

    useEffect(() => {
        // Ensure any submit error is cleared when moving between steps
        setState((s) => ({ ...s, submitError: undefined }));
    }, [state.step]);

    if (user === undefined) {
        // Not signed in
        return (
            <div className="page--CreateAgentPage container-page">
                <SignInRequired message="You must sign in to create an agent." />
            </div>
        );
    }
    if (user === null || account === null) {
        // Loading user/account
        return (
            <div className="page--CreateAgentPage container-page space-y-4">
                <header className="flex items-center justify-between">
                    <StepIndicator step={state.step} />
                    <div className="skeleton w-24 h-9 rounded-full" />
                </header>
                <section className="card">
                    <div className="card-header">
                        <div className="card-title">Create Agent</div>
                        <div className="card-subtitle">Loading account...</div>
                    </div>
                    <div className="space-y-3">
                        <div className="skeleton h-10 rounded" />
                        <div className="skeleton h-10 rounded" />
                        <div className="skeleton h-10 rounded" />
                        <div className="skeleton h-10 rounded" />
                    </div>
                </section>
            </div>
        );
    }
    if (!account) {
        return (
            <div className="page--CreateAgentPage container-page">
                <div className="alert info">
                    <div className="font-semibold">No account</div>
                    <div className="text-[var(--text-2)]">We could not find an account for your user.</div>
                </div>
            </div>
        );
    }

    const segmentsList = segments ?? null;
    const categoriesList = categories ?? null;

    const duplicateOutcome =
        (() => {
            const values = [
                state.outcomeWorst,
                state.outcomeGood,
                state.outcomeVeryGood,
                state.outcomeBest,
            ].filter(Boolean) as EventType[];
            const seen = new Set<EventType>();
            for (const v of values) {
                if (seen.has(v)) return v;
                seen.add(v);
            }
            return undefined;
        })() || undefined;

    const canContinue =
        state.step === 1 ? isStep1Valid(state) : state.step === 2 ? isStep2Valid(state) : isStep3Valid(state);
    const canActivate = isStep1Valid(state) && isStep2Valid(state) && isStep3Valid(state) && !state.submitting;

    async function handleActivateAsync() {
        if (!account?.id) return;
        if (!canActivate) return;

        try {
            setState((s) => ({ ...s, submitting: true, submitError: undefined }));

            const payload: Agent_insert = {
                account_id: account.id,
                name: state.name.trim(),
                default_email_from: state.defaultEmailFrom.trim() || undefined,
                default_sms_from: state.defaultSmsFrom.trim() || undefined,
                segment_id: state.segmentId,
                holdout_percentage:
                    typeof state.holdoutPercentage === "number" ? state.holdoutPercentage : 0,
                message_category_id: state.messageCategoryId,
                send_frequency: state.sendFrequency as string,
                send_days: state.sendDays,
                send_time_windows: state.sendTimeWindows as string[],
                is_active: true,
                activated_at: new Date().toISOString(),
                desired_outcome_description: state.desiredOutcomeDescription.trim() || undefined,
            };

            const inserted = await store().insertAsync(typeDefs.Agent, payload);

            // Insert outcome mappings (required four)
            const mappings: OutcomeMapping_insert[] = [
                {
                    account_id: account.id,
                    agent_id: (inserted as any).id,
                    event_type: state.outcomeWorst as string,
                    outcome: "worst",
                },
                {
                    account_id: account.id,
                    agent_id: (inserted as any).id,
                    event_type: state.outcomeGood as string,
                    outcome: "good",
                },
                {
                    account_id: account.id,
                    agent_id: (inserted as any).id,
                    event_type: state.outcomeVeryGood as string,
                    outcome: "very_good",
                },
                {
                    account_id: account.id,
                    agent_id: (inserted as any).id,
                    event_type: state.outcomeBest as string,
                    outcome: "best",
                },
            ];
            // Fire sequentially to keep it simple
            for (const m of mappings) {
                await store().insertAsync(typeDefs.OutcomeMapping, m);
            }

            // Navigate to agent detail
            router.push(`/agent-detail?id=${(inserted as any).id}`);
        } catch (err: any) {
            setState((s) => ({
                ...s,
                submitting: false,
                submitError: err?.message ?? "Failed to create agent.",
            }));
        }
    }

    function Step1Basics() {
        const percentInvalid =
            state.holdoutPercentage === "" ||
            Number.isNaN(Number(state.holdoutPercentage)) ||
            (typeof state.holdoutPercentage === "number" &&
                (state.holdoutPercentage < 0 || state.holdoutPercentage > 100));

        return (
            <section className="card">
                <div className="card-header">
                    <div className="flex flex-col">
                        <div className="card-title">Step 1: Basics</div>
                        <div className="card-subtitle">Name and assign segment and content library</div>
                    </div>
                </div>

                <div className="alert info">
                    <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 text-[var(--purple)]" />
                        <div className="space-y-1">
                            <div className="font-semibold">About holdout and messages</div>
                            <div className="text-[var(--text-2)]">
                                A holdout is excluded from sends for control/measurement. Messages are imported from GardenIQ and are read-only in this app.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="field md:col-span-2">
                        <label className="label">Agent name</label>
                        <input
                            className="input"
                            placeholder="e.g., Promo Optimizer"
                            value={state.name}
                            onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
                        />
                    </div>

                    <div className="field">
                        <label className="label">Default email from address</label>
                        <input
                            className="input"
                            placeholder="marketing@brand.com"
                            value={state.defaultEmailFrom}
                            onChange={(e) =>
                                setState((s) => ({ ...s, defaultEmailFrom: e.target.value }))
                            }
                        />
                        <div className="help-text">Used when email is chosen for a send.</div>
                    </div>

                    <div className="field">
                        <label className="label">Default SMS from number</label>
                        <input
                            className="input"
                            placeholder="+1 555 555 1234"
                            value={state.defaultSmsFrom}
                            onChange={(e) =>
                                setState((s) => ({ ...s, defaultSmsFrom: e.target.value }))
                            }
                        />
                        <div className="help-text">Used when SMS is chosen for a send.</div>
                    </div>

                    <div className="field">
                        <label className="label">Segment</label>
                        <select
                            className="select"
                            value={state.segmentId}
                            onChange={(e) => setState((s) => ({ ...s, segmentId: e.target.value }))}
                        >
                            <option value="">Select a segment</option>
                            {segmentsList?.map((seg) => (
                                <option key={seg.id} value={seg.id}>
                                    {seg.name}
                                </option>
                            ))}
                        </select>
                        {state.segmentId && (
                            <div className="help-text">
                                <Link
                                    className="link"
                                    href={`/segment-detail?id=${state.segmentId}`}
                                    target="_blank"
                                >
                                    View segment details
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className={cn("field", percentInvalid && "invalid")}>
                        <label className="label">Holdout %</label>
                        <input
                            className="input"
                            inputMode="numeric"
                            placeholder="e.g., 10"
                            value={state.holdoutPercentage}
                            onChange={(e) => {
                                const v = e.target.value.trim();
                                if (v === "") {
                                    setState((s) => ({ ...s, holdoutPercentage: "" }));
                                    return;
                                }
                                const n = Number(v);
                                setState((s) => ({
                                    ...s,
                                    holdoutPercentage: Number.isNaN(n) ? (s.holdoutPercentage ?? 0) : n,
                                }));
                            }}
                        />
                        <div className="help-text">
                            {percentInvalid
                                ? "Enter a number between 0 and 100."
                                : "Percentage of the segment excluded from sends."}
                        </div>
                    </div>

                    <div className="field md:col-span-2">
                        <label className="label">Message Category</label>
                        <select
                            className="select"
                            value={state.messageCategoryId}
                            onChange={(e) =>
                                setState((s) => ({ ...s, messageCategoryId: e.target.value }))
                            }
                        >
                            <option value="">Select a category</option>
                            {categoriesList?.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        {state.messageCategoryId && (
                            <div className="help-text">
                                <Link
                                    className="link"
                                    href={`/message-category?id=${state.messageCategoryId}`}
                                    target="_blank"
                                >
                                    Open category library
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card-footer">
                    <div className="flex gap-2">
                        <button
                            className="btn btn-secondary"
                            onClick={(e) => {
                                e.preventDefault();
                                router.push("/decisioning");
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="btn btn-primary"
                            disabled={!isStep1Valid(state)}
                            onClick={(e) => {
                                e.preventDefault();
                                setState((s) => ({ ...s, step: 2 }));
                            }}
                        >
                            Continue
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    function Step2Schedule() {
        const toggleDay = (idx: number) => {
            setState((s) => {
                const has = s.sendDays.includes(idx);
                return { ...s, sendDays: has ? s.sendDays.filter((d) => d !== idx) : [...s.sendDays, idx] };
            });
        };
        const toggleWindow = (w: SendTimeWindow) => {
            setState((s) => {
                const has = s.sendTimeWindows.includes(w);
                return {
                    ...s,
                    sendTimeWindows: has ? s.sendTimeWindows.filter((x) => x !== w) : [...s.sendTimeWindows, w],
                };
            });
        };

        return (
            <section className="card">
                <div className="card-header">
                    <div className="flex flex-col">
                        <div className="card-title">Step 2: Schedule</div>
                        <div className="card-subtitle">Cadence and delivery constraints</div>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div className="field">
                        <label className="label">Sending frequency</label>
                        <div className="flex flex-wrap gap-2">
                            {frequencyOptions.map((f) => (
                                <button
                                    key={f.key}
                                    className={cn(
                                        "chip",
                                        state.sendFrequency === f.key && "chip-selected border-brand-subtle"
                                    )}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setState((s) => ({ ...s, sendFrequency: f.key }));
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="field">
                        <label className="label">Allowed days</label>
                        <div className="flex flex-wrap gap-2">
                            {dayLabels.map((d, idx) => {
                                const active = state.sendDays.includes(idx);
                                return (
                                    <label
                                        key={idx}
                                        className={cn(
                                            "chip cursor-pointer select-none",
                                            active && "chip-selected border-brand-subtle"
                                        )}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleDay(idx);
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            className="checkbox hidden"
                                            checked={active}
                                            onChange={() => toggleDay(idx)}
                                        />
                                        {d}
                                    </label>
                                );
                            })}
                        </div>
                        <div className="help-text">Pick at least one day.</div>
                    </div>

                    <div className="field">
                        <label className="label">Allowed time windows</label>
                        <div className="flex flex-wrap gap-2">
                            {timeWindowLabels.map((t) => {
                                const active = state.sendTimeWindows.includes(t.key);
                                return (
                                    <label
                                        key={t.key}
                                        className={cn(
                                            "chip cursor-pointer select-none",
                                            active && "chip-selected border-brand-subtle"
                                        )}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleWindow(t.key);
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            className="checkbox hidden"
                                            checked={active}
                                            onChange={() => toggleWindow(t.key)}
                                        />
                                        {t.label}
                                    </label>
                                );
                            })}
                        </div>
                        <div className="help-text">Choose one or more time windows.</div>
                    </div>
                </div>

                <div className="card-footer">
                    <div className="flex gap-2">
                        <button
                            className="btn btn-secondary"
                            onClick={(e) => {
                                e.preventDefault();
                                setState((s) => ({ ...s, step: 1 }));
                            }}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Back
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={(e) => {
                                e.preventDefault();
                                router.push("/decisioning");
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="btn btn-primary"
                            disabled={!isStep2Valid(state)}
                            onClick={(e) => {
                                e.preventDefault();
                                setState((s) => ({ ...s, step: 3 }));
                            }}
                        >
                            Continue
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    function Step3Outcomes() {
        const summarySegment = SelectedName(segmentsList ?? null, state.segmentId);
        const summaryCategory = SelectedName(categoriesList ?? null, state.messageCategoryId);

        const eventSelect = (value: EventType | undefined, onChange: (v?: EventType) => void, id: string) => (
            <select
                id={id}
                className="select"
                value={value ?? ""}
                onChange={(e) => onChange((e.target.value || undefined) as EventType | undefined)}
            >
                <option value="">Select event</option>
                <optgroup label="Messaging">
                    {eventTypeOptions
                        .filter((o) => o.group === "Messaging")
                        .map((o) => (
                            <option key={o.key} value={o.key}>
                                {o.label}
                            </option>
                        ))}
                </optgroup>
                <optgroup label="Ecommerce">
                    {eventTypeOptions
                        .filter((o) => o.group === "Ecommerce")
                        .map((o) => (
                            <option key={o.key} value={o.key}>
                                {o.label}
                            </option>
                        ))}
                </optgroup>
                <optgroup label="Web">
                    {eventTypeOptions
                        .filter((o) => o.group === "Web")
                        .map((o) => (
                            <option key={o.key} value={o.key}>
                                {o.label}
                            </option>
                        ))}
                </optgroup>
            </select>
        );

        return (
            <section className="card">
                <div className="card-header">
                    <div className="flex flex-col">
                        <div className="card-title">Step 3: Outcomes</div>
                        <div className="card-subtitle">Define success and map events to outcomes</div>
                    </div>
                </div>

                <div className="grid gap-4">
                    <div className="alert info">
                        <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 mt-0.5 text-[var(--purple)]" />
                            <div className="text-[var(--text-2)]">
                                Map exactly one event to each outcome ranking. The agent optimizes towards higher-ranked outcomes based on observed events.
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="field">
                            <label className="label">Worst</label>
                            {eventSelect(state.outcomeWorst, (v) => setState((s) => ({ ...s, outcomeWorst: v })), "out-worst")}
                            <div className="help-text">e.g., unsubscribe or bounce</div>
                        </div>
                        <div className="field">
                            <label className="label">Good</label>
                            {eventSelect(state.outcomeGood, (v) => setState((s) => ({ ...s, outcomeGood: v })), "out-good")}
                            <div className="help-text">e.g., message open</div>
                        </div>
                        <div className="field">
                            <label className="label">Very Good</label>
                            {eventSelect(
                                state.outcomeVeryGood,
                                (v) => setState((s) => ({ ...s, outcomeVeryGood: v })),
                                "out-very-good"
                            )}
                            <div className="help-text">e.g., message click</div>
                        </div>
                        <div className="field">
                            <label className="label">Best</label>
                            {eventSelect(state.outcomeBest, (v) => setState((s) => ({ ...s, outcomeBest: v })), "out-best")}
                            <div className="help-text">e.g., purchase</div>
                        </div>

                        <div className="md:col-span-2 field">
                            <label className="label">Desired outcome strategy (optional)</label>
                            <textarea
                                className="textarea"
                                rows={3}
                                placeholder="Short description for future reference..."
                                value={state.desiredOutcomeDescription}
                                onChange={(e) =>
                                    setState((s) => ({ ...s, desiredOutcomeDescription: e.target.value }))
                                }
                            />
                        </div>
                    </div>

                    {duplicateOutcome && (
                        <div className="alert warning">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5 text-[var(--warning)]" />
                                <div className="text-[var(--text-2)]">
                                    Each ranking must map to a unique event. Duplicate selected: {duplicateOutcome}.
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="divider"></div>

                    <div className="grid gap-3">
                        <div className="font-semibold">Summary</div>
                        <div className="grid md:grid-cols-2 gap-3">
                            <div className="p-3 rounded border border-[var(--border)]">
                                <div className="text-[var(--text-2)]">Agent</div>
                                <div className="mt-1">{state.name || "—"}</div>
                            </div>
                            <div className="p-3 rounded border border-[var(--border)]">
                                <div className="text-[var(--text-2)]">Segment</div>
                                <div className="mt-1">{summarySegment || "—"}</div>
                            </div>
                            <div className="p-3 rounded border border-[var(--border)]">
                                <div className="text-[var(--text-2)]">Holdout</div>
                                <div className="mt-1">
                                    {typeof state.holdoutPercentage === "number"
                                        ? `${state.holdoutPercentage}%`
                                        : "—"}
                                </div>
                            </div>
                            <div className="p-3 rounded border border-[var(--border)]">
                                <div className="text-[var(--text-2)]">Message Category</div>
                                <div className="mt-1">{summaryCategory || "—"}</div>
                            </div>
                            <div className="p-3 rounded border border-[var(--border)]">
                                <div className="text-[var(--text-2)]">Frequency</div>
                                <div className="mt-1">
                                    {frequencyOptions.find((f) => f.key === state.sendFrequency)?.label ?? "—"}
                                </div>
                            </div>
                            <div className="p-3 rounded border border-[var(--border)]">
                                <div className="text-[var(--text-2)]">Days</div>
                                <div className="mt-1">
                                    {state.sendDays.length > 0
                                        ? state.sendDays
                                              .sort((a, b) => a - b)
                                              .map((i) => dayLabels[i])
                                              .join(", ")
                                        : "—"}
                                </div>
                            </div>
                            <div className="p-3 rounded border border-[var(--border)]">
                                <div className="text-[var(--text-2)]">Time windows</div>
                                <div className="mt-1">
                                    {state.sendTimeWindows.length > 0
                                        ? state.sendTimeWindows
                                              .map((w) => timeWindowLabels.find((t) => t.key === w)?.label || w)
                                              .join(", ")
                                        : "—"}
                                </div>
                            </div>
                            <div className="p-3 rounded border border-[var(--border)]">
                                <div className="text-[var(--text-2)]">Outcome mapping</div>
                                <div className="mt-1 text-sm space-y-1">
                                    <div>
                                        <span className="badge">Worst</span>{" "}
                                        {eventTypeOptions.find((o) => o.key === state.outcomeWorst)?.label ?? "—"}
                                    </div>
                                    <div>
                                        <span className="badge">Good</span>{" "}
                                        {eventTypeOptions.find((o) => o.key === state.outcomeGood)?.label ?? "—"}
                                    </div>
                                    <div>
                                        <span className="badge">Very Good</span>{" "}
                                        {eventTypeOptions.find((o) => o.key === state.outcomeVeryGood)?.label ?? "—"}
                                    </div>
                                    <div>
                                        <span className="badge">Best</span>{" "}
                                        {eventTypeOptions.find((o) => o.key === state.outcomeBest)?.label ?? "—"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {state.submitError && (
                        <div className="alert danger">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5" />
                                <div>{state.submitError}</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="card-footer">
                    <div className="flex gap-2">
                        <button
                            className="btn btn-secondary"
                            onClick={(e) => {
                                e.preventDefault();
                                setState((s) => ({ ...s, step: 2 }));
                            }}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Back
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={(e) => {
                                e.preventDefault();
                                router.push("/decisioning");
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="btn btn-primary"
                            disabled={!canActivate}
                            onClick={(e) => {
                                e.preventDefault();
                                handleActivateAsync();
                            }}
                        >
                            {state.submitting ? "Activating..." : "Activate Agent"}
                            {!state.submitting && <Check className="w-4 h-4 ml-1" />}
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <div className="page--CreateAgentPage container-page space-y-4">
            <header className="flex items-center justify-between">
                <StepIndicator step={state.step} />
                <button
                    className="btn btn-secondary"
                    onClick={() => router.push("/decisioning")}
                >
                    Cancel
                </button>
            </header>

            {state.step === 1 && <Step1Basics />}

            {state.step === 2 && <Step2Schedule />}

            {state.step === 3 && <Step3Outcomes />}
        </div>
    );
}