import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    useAccount,
    useCurrentUser,
    useUserRole,
    useStoreFirstMatchingItem,
    useStoreMatchingItems,
    useFileUrl,
} from "@/lib/hooks";
import { SignInRequired } from "@/components/SignInRequired";
import { cn } from "@/lib/util";
import { store } from "@/lib/store";
import {
    typeDefs,
    Message,
    Message_insert,
    MessageVariant,
    MessageVariant_insert,
    MessageCategory,
} from "@/lib/schema";
import {
    AlertCircle,
    Search,
    MoreHorizontal,
    Copy,
    FolderSymlink,
    Trash2,
    Mail,
    MessageSquareText,
    Bell,
    Image as ImageIcon,
    ChevronDown,
    ChevronUp,
    FolderOpen,
    Plus,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

type SortField = "created_at" | "name";
type SortOrder = "asc" | "desc";

interface MoveState {
    targetCategoryId: string | null;
}

interface DuplicateState {
    name: string;
}

export function ChannelChips({ channels }: { channels: Set<string> }) {
    const hasEmail = channels.has("email");
    const hasSms = channels.has("sms");
    const hasPush = channels.has("push");
    return (
        <div className="flex items-center gap-1">
            {hasEmail && <span className="channel email">Email</span>}
            {hasSms && <span className="channel sms">SMS</span>}
            {hasPush && <span className="channel push">Push</span>}
        </div>
    );
}

export function MessagePreviewThumb({
    message,
    variants,
}: {
    message: Message;
    variants: MessageVariant[] | null | undefined;
}) {
    // Select best available preview image from variants. Prefer email > push > sms if multiple previews exist
    const bestPreview = useMemo(() => {
        if (!variants) return undefined;
        const withPreview = variants.filter((v) => !!v.preview_image_path);
        if (withPreview.length === 0) return undefined;
        const score = (v: MessageVariant) =>
            v.channel === "email" ? 3 : v.channel === "push" ? 2 : 1;
        return withPreview.sort((a, b) => score(b) - score(a))[0];
    }, [variants]);

    const previewUrl = useFileUrl(bestPreview?.preview_image_path);

    return (
        <div className="relative overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)] aspect-[4/3]">
            {previewUrl === null ? (
                <div className="w-full h-full skeleton" />
            ) : previewUrl ? (
                <img
                    src={previewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-3)]">
                    <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="w-6 h-6" />
                        <div className="text-xs">No preview</div>
                    </div>
                </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-black/20 pointer-events-none" />
        </div>
    );
}

export function MessageTile({
    message,
    canManage,
    onDuplicate,
    onMove,
    onDelete,
}: {
    message: Message;
    canManage: boolean;
    onDuplicate: (m: Message) => void;
    onMove: (m: Message) => void;
    onDelete: (m: Message) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    // Fetch variants for channel chips and preview
    const variants = useStoreMatchingItems<MessageVariant>(
        typeDefs.MessageVariant,
        { message_id: message.id, account_id: message.account_id },
        { limit: 50 }
    );

    const channels = useMemo(() => {
        const set = new Set<string>();
        if (variants && Array.isArray(variants)) {
            variants.forEach((v) => set.add(v.channel));
        }
        return set;
    }, [variants]);

    const createdLabel = useMemo(() => {
        const d = new Date(message.created_at);
        if (isNaN(d.getTime())) return message.created_at;
        return d.toISOString().slice(0, 10);
    }, [message.created_at]);

    return (
        <div className="tile group relative">
            <div className="tile-header">
                <div className="font-semibold truncate" title={message.name}>
                    {message.name}
                </div>
                <div className="relative">
                    <button
                        className={cn(
                            "btn btn-secondary btn-icon",
                            !canManage && "opacity-50 cursor-not-allowed"
                        )}
                        aria-label="More actions"
                        onClick={(e) => {
                            e.preventDefault();
                            if (!canManage) return;
                            setMenuOpen((v) => !v);
                        }}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen && canManage && (
                        <div className="absolute right-0 mt-2 z-40 card p-1 min-w-[10rem]">
                            <button
                                className="navlink w-full text-left flex items-center gap-2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpen(false);
                                    onDuplicate(message);
                                }}
                            >
                                <Copy className="w-4 h-4" />
                                Duplicate
                            </button>
                            <button
                                className="navlink w-full text-left flex items-center gap-2"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpen(false);
                                    onMove(message);
                                }}
                            >
                                <FolderSymlink className="w-4 h-4" />
                                Move
                            </button>
                            <button
                                className="navlink w-full text-left flex items-center gap-2 text-[var(--danger)]"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpen(false);
                                    onDelete(message);
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <Link href={`/message-detail?id=${message.id}`} className="no-underline">
                <MessagePreviewThumb message={message} variants={variants ?? undefined} />
            </Link>

            <div className="tile-body">
                <ChannelChips channels={channels} />
            </div>

            <div className="tile-meta">
                <span className="subtle">Created {createdLabel}</span>
                {channels.size > 1 ? (
                    <span className="badge accent">{channels.size} channels</span>
                ) : channels.size === 1 ? (
                    <span className="badge">{Array.from(channels)[0]}</span>
                ) : (
                    <span className="badge">Message</span>
                )}
            </div>
        </div>
    );
}

function useCategoryIdFromQuery(): string | undefined {
    const router = useRouter();
    const { id, categoryId } = router.query || {};
    const value =
        (Array.isArray(categoryId) ? categoryId[0] : categoryId) ??
        (Array.isArray(id) ? id[0] : id);
    return value ?? undefined;
}

function formatDateISO(dateStr?: string): string | undefined {
    if (!dateStr) return undefined;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().slice(0, 10);
}

export default function MessageCategoryPage() {
    const user = useCurrentUser();
    const account = useAccount();
    const role = useUserRole();
    const canManage = !!role && role !== "guest";

    const categoryId = useCategoryIdFromQuery();

    // Load category
    const category = useStoreFirstMatchingItem<MessageCategory>(
        typeDefs.MessageCategory,
        categoryId && account ? { id: categoryId, account_id: account.id } : null
    );

    // Load messages under this category
    const [sortField, setSortField] = useState<SortField>("created_at");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [search, setSearch] = useState("");

    const messagesRaw = useStoreMatchingItems<Message>(
        typeDefs.Message,
        category && account ? { account_id: account.id, category_id: category.id } : null,
        { orderBy: sortField, orderByDesc: sortOrder === "desc" }
    );

    // All categories for Move action
    const categories = useStoreMatchingItems<MessageCategory>(
        typeDefs.MessageCategory,
        account ? { account_id: account.id } : null,
        { orderBy: "name", orderByDesc: false, limit: 200 }
    );

    const messages = useMemo(() => {
        if (!messagesRaw || !Array.isArray(messagesRaw)) return messagesRaw;
        let list = [...messagesRaw];
        if (search.trim().length > 0) {
            const q = search.trim().toLowerCase();
            list = list.filter((m) => m.name.toLowerCase().includes(q));
        }
        // If server didn't sort, apply client sort to be safe
        list.sort((a, b) => {
            if (sortField === "created_at") {
                const da = new Date(a.created_at).getTime();
                const db = new Date(b.created_at).getTime();
                return sortOrder === "asc" ? da - db : db - da;
            }
            const na = a.name.toLowerCase();
            const nb = b.name.toLowerCase();
            if (na < nb) return sortOrder === "asc" ? -1 : 1;
            if (na > nb) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });
        return list;
    }, [messagesRaw, search, sortField, sortOrder]);

    // Right rail summary
    const totalMessages = messages?.length ?? 0;
    const lastUpdated = useMemo(() => {
        if (!messages || !Array.isArray(messages) || messages.length === 0) return undefined;
        const max = messages.reduce((acc, m) => {
            const t = new Date(m.created_at).getTime();
            return Math.max(acc, isNaN(t) ? 0 : t);
        }, 0);
        return max ? formatDateISO(new Date(max).toISOString()) : undefined;
    }, [messages]);

    // Actions and modals state
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [showDuplicate, setShowDuplicate] = useState(false);
    const [showMove, setShowMove] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [dupState, setDupState] = useState<DuplicateState>({ name: "" });
    const [moveState, setMoveState] = useState<MoveState>({ targetCategoryId: null });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedMessage && showDuplicate) {
            setDupState({ name: `${selectedMessage.name} (Copy)` });
        }
    }, [selectedMessage, showDuplicate]);

    function openDuplicate(m: Message) {
        setSelectedMessage(m);
        setShowDuplicate(true);
        setError(null);
    }
    function openMove(m: Message) {
        setSelectedMessage(m);
        setMoveState({ targetCategoryId: null });
        setShowMove(true);
        setError(null);
    }
    function openDelete(m: Message) {
        setSelectedMessage(m);
        setShowDelete(true);
        setError(null);
    }
    function resetModals() {
        setShowDuplicate(false);
        setShowMove(false);
        setShowDelete(false);
        setSelectedMessage(null);
        setBusy(false);
        setError(null);
    }

    async function handleDuplicateAsync() {
        if (!account || !selectedMessage) return;
        if (!dupState.name.trim()) {
            setError("Please provide a name for the duplicated message.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            // Create new Message with copied properties
            const newMessageId = uuidv4();
            const now = new Date().toISOString();
            const newMessage: Message_insert = {
                id: newMessageId,
                created_at: now,
                account_id: account.id,
                category_id: selectedMessage.category_id,
                name: dupState.name.trim(),
                external_source: selectedMessage.external_source,
                external_id: undefined,
                tags: selectedMessage.tags ?? [],
            };
            await store().insertAsync(typeDefs.Message, newMessage);

            // Copy variants
            const existingVariants = await store().selectMatchesAsync<MessageVariant>(
                typeDefs.MessageVariant,
                { account_id: account.id, message_id: selectedMessage.id }
            );
            for (const v of existingVariants as MessageVariant[]) {
                const newVariant: MessageVariant_insert = {
                    id: uuidv4(),
                    created_at: now,
                    account_id: account.id,
                    message_id: newMessageId,
                    channel: v.channel,
                    email_subject: v.email_subject,
                    email_html: v.email_html,
                    email_text: v.email_text,
                    sms_text: v.sms_text,
                    push_title: v.push_title,
                    push_body: v.push_body,
                    preview_image_path: v.preview_image_path,
                };
                await store().insertAsync(typeDefs.MessageVariant, newVariant);
            }

            resetModals();
        } catch (e: any) {
            setError(e?.message ?? "Failed to duplicate message.");
            setBusy(false);
        }
    }

    async function handleMoveAsync() {
        if (!account || !selectedMessage) return;
        if (!moveState.targetCategoryId) {
            setError("Select a target category.");
            return;
        }
        if (moveState.targetCategoryId === selectedMessage.category_id) {
            setError("Message is already in the selected category.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await store().updateAsync<Message>(typeDefs.Message, selectedMessage.id, {
                category_id: moveState.targetCategoryId,
            });
            resetModals();
        } catch (e: any) {
            setError(e?.message ?? "Failed to move message.");
            setBusy(false);
        }
    }

    async function handleDeleteAsync() {
        if (!account || !selectedMessage) return;
        setBusy(true);
        setError(null);
        try {
            // Attempt to delete variants first
            const existingVariants = await store().selectMatchesAsync<MessageVariant>(
                typeDefs.MessageVariant,
                { account_id: account.id, message_id: selectedMessage.id }
            );
            for (const v of existingVariants as MessageVariant[]) {
                await store().deleteAsync(typeDefs.MessageVariant, v.id);
            }
            // Delete message
            await store().deleteAsync(typeDefs.Message, selectedMessage.id);
            resetModals();
        } catch (e: any) {
            setError(e?.message ?? "Failed to delete message.");
            setBusy(false);
        }
    }

    // Access control for signed-in users
    if (user === undefined) {
        // While loading user is null, undefined => not signed in
    }
    if (user === undefined) {
        // explicit no-op
    }

    if (user === null) {
        // still loading user
        return (
            <div className="page--MessageCategoryPage container-page">
                <div className="card">
                    <div className="skeleton h-8 w-48" />
                    <div className="mt-3 skeleton h-5 w-full" />
                </div>
            </div>
        );
    }

    if (user === undefined) {
        // not signed in
        return (
            <div className="page--MessageCategoryPage container-page">
                <SignInRequired message="You must sign in to view message categories." />
            </div>
        );
    }

    if (!categoryId) {
        return (
            <div className="page--MessageCategoryPage container-page space-y-4">
                <div className="alert info">
                    <div className="font-semibold">No category selected</div>
                    <div className="text-[var(--text-2)]">
                        Choose a category from the Messages page.
                    </div>
                </div>
                <Link href="/messages" className="btn btn-primary w-max">
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Browse Categories
                </Link>
            </div>
        );
    }

    if (category === null) {
        // loading
        return (
            <div className="page--MessageCategoryPage container-page space-y-3">
                <div className="skeleton h-6 w-56" />
                <div className="alert info">
                    <div className="skeleton h-4 w-64" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="tile">
                            <div className="tile-header">
                                <div className="skeleton h-4 w-32" />
                                <div className="skeleton h-8 w-8 rounded" />
                            </div>
                            <div className="aspect-[4/3] skeleton rounded" />
                            <div className="tile-body">
                                <div className="skeleton h-4 w-24" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (category === undefined) {
        return (
            <div className="page--MessageCategoryPage container-page space-y-4">
                <div className="alert danger">
                    <div className="font-semibold">Category not found</div>
                    <div className="text-[var(--text-2)]">
                        The requested category could not be found or you do not have access.
                    </div>
                </div>
                <Link href="/messages" className="btn btn-secondary w-max">
                    Back to Messages
                </Link>
            </div>
        );
    }

    const railHidden = false;

    return (
        <div className={cn("page--MessageCategoryPage")}>
            <main className={cn("container-page space-y-4")}>
                {/* Header */}
                <header className="card">
                    <div className="card-header">
                        <div className="flex flex-col gap-1">
                            <div className="section-title text-xl">{category.name}</div>
                            {category.description ? (
                                <div className="text-[var(--text-2)]">{category.description}</div>
                            ) : (
                                <div className="text-[var(--text-3)]">Content library</div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Link
                                href={`/create-agent?categoryId=${encodeURIComponent(category.id)}`}
                                className="btn btn-primary"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Use in Agent
                            </Link>
                        </div>
                    </div>
                    <div className="mt-2 alert info">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-[var(--purple)]" />
                            <div className="text-[var(--text-2)]">
                                Messages are imported from GardenIQ. Authoring is disabled. You can duplicate,
                                move, or delete messages to organize your library.
                            </div>
                        </div>
                    </div>
                </header>

                {/* Controls and grid in two-column layout */}
                <section className={cn("content-2col", railHidden && "rail-hidden")}>
                    <div className="space-y-3">
                        {/* Utilities: search, sort */}
                        <div className="card">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
                                <div className="flex items-center gap-2 w-full md:max-w-md">
                                    <div className="relative flex-1">
                                        <input
                                            className="input pl-9"
                                            placeholder="Search messages"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="field">
                                        <label className="label sr-only">Sort by</label>
                                        <select
                                            className="select"
                                            value={sortField}
                                            onChange={(e) => setSortField(e.target.value as SortField)}
                                        >
                                            <option value="created_at">Created</option>
                                            <option value="name">Name</option>
                                        </select>
                                    </div>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                        aria-label="Toggle sort order"
                                    >
                                        {sortOrder === "asc" ? (
                                            <>
                                                <ChevronUp className="w-4 h-4 mr-2" />
                                                Asc
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="w-4 h-4 mr-2" />
                                                Desc
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Empty state or grid */}
                        {messages === null ? (
                            <div className="card">
                                <div className="skeleton h-6 w-40 mb-3" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div key={i} className="tile">
                                            <div className="tile-header">
                                                <div className="skeleton h-4 w-32" />
                                                <div className="skeleton h-8 w-8 rounded" />
                                            </div>
                                            <div className="aspect-[4/3] skeleton rounded" />
                                            <div className="tile-body">
                                                <div className="skeleton h-4 w-24" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (messages?.length ?? 0) === 0 ? (
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">No messages in this category</div>
                                </div>
                                <div className="text-[var(--text-2)]">
                                    This category does not contain any messages yet. Messages are imported from
                                    GardenIQ; use your integrations to add content. You can manage categories in
                                    the Messages page.
                                </div>
                                <div className="card-footer">
                                    <Link href="/messages" className="btn btn-secondary">
                                        <FolderOpen className="w-4 h-4 mr-2" />
                                        Go to Messages
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {messages!.map((m) => (
                                    <MessageTile
                                        key={m.id}
                                        message={m}
                                        canManage={canManage}
                                        onDuplicate={openDuplicate}
                                        onMove={openMove}
                                        onDelete={openDelete}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right rail */}
                    <aside className="right-rail space-y-3">
                        <div className="card">
                            <div className="card-title">Category Info</div>
                            <div className="mt-3 space-y-2 text-[var(--text-2)]">
                                <div className="flex items-center justify-between">
                                    <span>Total messages</span>
                                    <span className="badge">{totalMessages}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Last updated</span>
                                    <span>{lastUpdated ?? "—"}</span>
                                </div>
                                <div className="divider my-2" />
                                <div className="text-[var(--text-3)]">
                                    Organize your library by moving messages between categories. Categories can be
                                    assigned to AI agents to power automated decisions.
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-title">Tip</div>
                            <div className="mt-2 text-[var(--text-2)]">
                                Use this category as the content source for an AI decisioning agent.
                            </div>
                            <div className="card-footer">
                                <Link
                                    href={`/create-agent?categoryId=${encodeURIComponent(category.id)}`}
                                    className="btn btn-primary"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Agent
                                </Link>
                            </div>
                        </div>
                    </aside>
                </section>
            </main>

            {/* Duplicate Modal */}
            {showDuplicate && selectedMessage && (
                <div className="modal" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="card-header">
                            <div className="card-title">Duplicate Message</div>
                        </div>
                        <div className="space-y-3">
                            <div className="field">
                                <label className="label">New name</label>
                                <input
                                    className="input"
                                    placeholder="Enter new message name"
                                    value={dupState.name}
                                    onChange={(e) => setDupState({ name: e.target.value })}
                                />
                            </div>
                            {error && (
                                <div className="alert danger">
                                    <div className="text-[var(--text-2)]">{error}</div>
                                </div>
                            )}
                        </div>
                        <div className="card-footer">
                            <button className="btn btn-secondary" onClick={resetModals} disabled={busy}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleDuplicateAsync}
                                disabled={busy || !canManage}
                            >
                                {busy ? "Duplicating..." : "Duplicate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move Modal */}
            {showMove && selectedMessage && (
                <div className="modal" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="card-header">
                            <div className="card-title">Move Message</div>
                        </div>
                        <div className="space-y-3">
                            <div className="field">
                                <label className="label">Target category</label>
                                <select
                                    className="select"
                                    value={moveState.targetCategoryId ?? ""}
                                    onChange={(e) =>
                                        setMoveState({ targetCategoryId: e.target.value || null })
                                    }
                                >
                                    <option value="">Select a category</option>
                                    {(categories ?? []).map((c) => (
                                        <option
                                            key={c.id}
                                            value={c.id}
                                            disabled={c.id === selectedMessage.category_id}
                                        >
                                            {c.name}
                                            {c.id === selectedMessage.category_id ? " (current)" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {error && (
                                <div className="alert danger">
                                    <div className="text-[var(--text-2)]">{error}</div>
                                </div>
                            )}
                        </div>
                        <div className="card-footer">
                            <button className="btn btn-secondary" onClick={resetModals} disabled={busy}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleMoveAsync}
                                disabled={busy || !canManage}
                            >
                                {busy ? "Moving..." : "Move"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDelete && selectedMessage && (
                <div className="modal" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="card-header">
                            <div className="card-title">Delete Message</div>
                        </div>
                        <div className="space-y-3">
                            <div className="text-[var(--text-2)]">
                                Are you sure you want to delete “{selectedMessage.name}”? This will remove the
                                message and its channel variants from your account’s library. Historical analytics
                                remain intact.
                            </div>
                            {error && (
                                <div className="alert danger">
                                    <div className="text-[var(--text-2)]">{error}</div>
                                </div>
                            )}
                        </div>
                        <div className="card-footer">
                            <button className="btn btn-secondary" onClick={resetModals} disabled={busy}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteAsync}
                                disabled={busy || !canManage}
                            >
                                {busy ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}