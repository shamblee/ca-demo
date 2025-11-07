import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, RefreshCw, FolderOpen } from "lucide-react";
import { SignInRequired } from "@/components/SignInRequired";
import { useUserInfo, useStoreMatchingItems, useFileUrl } from "@/lib/hooks";
import { store } from "@/lib/store";
import { cn } from "@/lib/util";
import { typeDefs, MessageCategory, Message } from "@/lib/schema";

interface RenameState {
    open: boolean;
    category?: MessageCategory;
    name: string;
    saving: boolean;
    error?: string;
}

function RenameCategoryModal({ state, onClose }: { state: RenameState; onClose: () => void }) {
    if (!state.open || !state.category) return null;

    return (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="rename-category-title">
            <div className="modal-card max-w-lg w-full">
                <div className="card-header">
                    <div className="card-title" id="rename-category-title">Rename Category</div>
                </div>
                <div className="space-y-3 p-4 pt-0">
                    <div className={cn("field", state.error && "invalid")}>
                        <label className="label">New name</label>
                        <input
                            className="input"
                            value={state.name}
                            placeholder="Enter category name"
                            onChange={e => {
                                state.name = e.target.value;
                                // force refresh by setState via indirect method not available here
                            }}
                        />
                        {state.error && <div className="help-text">{state.error}</div>}
                    </div>
                </div>
                <div className="card-footer">
                    <button className="btn btn-secondary" disabled={state.saving} onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        disabled={state.saving || !state.name.trim()}
                        onClick={async () => {
                            try {
                                state.saving = true;
                                const newName = state.name.trim();
                                if (!newName) {
                                    throw new Error("Please provide a category name.");
                                }
                                await store().updateAsync(typeDefs.MessageCategory, state.category!.id, { name: newName });
                                onClose();
                            } catch (err: any) {
                                state.saving = false;
                                state.error = err?.message ?? "Failed to rename category.";
                                // trigger re-render by dispatching an event — this component relies on parent state updates
                            }
                        }}
                    >
                        {state.saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CategoryTile({
    category,
    count,
    onRename
}: {
    category: MessageCategory;
    count: number;
    onRename: (c: MessageCategory) => void;
}) {
    const thumbUrl = useFileUrl(category.thumbnail_image_path);
    return (
        <div className="tile group">
            <div className="tile-header">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex-shrink-0 w-5 h-5 text-[var(--text-3)]">
                        <FolderOpen className="w-5 h-5" />
                    </div>
                    <div className="font-semibold truncate" title={category.name}>{category.name}</div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="badge brand" aria-label={`${count} messages`}>{count}</span>
                    <button
                        className="btn btn-secondary btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Rename ${category.name}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onRename(category);
                        }}
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <Link href={`/message-category?id=${encodeURIComponent(category.id)}`} className="no-underline">
                <div className="tile-body">
                    <div className="aspect-[16/9] w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center">
                        {thumbUrl === null && <div className="skeleton w-full h-full" />}
                        {thumbUrl === undefined && (
                            <div className="text-[var(--text-3)] text-sm">No thumbnail</div>
                        )}
                        {typeof thumbUrl === "string" && (
                            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                        )}
                    </div>
                </div>
                <div className="tile-meta">
                    <span className="subtle">Created {new Date(category.created_at).toLocaleDateString()}</span>
                </div>
            </Link>
        </div>
    );
}

function SkeletonTile() {
    return (
        <div className="tile">
            <div className="tile-header">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-[var(--surface-3)]" />
                    <div className="skeleton h-4 w-32" />
                </div>
                <span className="badge brand">–</span>
            </div>
            <div className="tile-body">
                <div className="aspect-[16/9] w-full rounded-md skeleton" />
            </div>
            <div className="tile-meta">
                <div className="skeleton h-3 w-24" />
            </div>
        </div>
    );
}

export default function Messages() {
    const userInfo = useUserInfo();

    // Simple refresh key to retrigger queries if needed
    const [refreshKey, setRefreshKey] = useState(0);

    const accountId = userInfo?.account?.id;

    const categories = useStoreMatchingItems<MessageCategory>(
        typeDefs.MessageCategory,
        accountId ? { account_id: accountId } : null,
        { disabled: !accountId, orderBy: "created_at", orderByDesc: true, offset: refreshKey }
    );

    const messages = useStoreMatchingItems<Message>(
        typeDefs.Message,
        accountId ? { account_id: accountId } : null,
        { disabled: !accountId, offset: refreshKey }
    );

    const messageCounts = useMemo(() => {
        const map = new Map<string, number>();
        if (messages && Array.isArray(messages)) {
            for (const m of messages) {
                if (!m.category_id) continue;
                map.set(m.category_id, (map.get(m.category_id) ?? 0) + 1);
            }
        }
        return map;
    }, [messages]);

    const [renameState, setRenameState] = useState<RenameState>({
        open: false,
        category: undefined,
        name: "",
        saving: false,
    });

    // Keep renameState in sync when opening
    const openRename = (cat: MessageCategory) => {
        setRenameState({
            open: true,
            category: cat,
            name: cat.name,
            saving: false,
        });
    };
    const closeRename = () => setRenameState({ open: false, name: "", saving: false });

    // Loading states
    const loadingUser = userInfo === null;
    const loadingCats = categories === null;
    const loadingMsgs = messages === null;

    if (userInfo === undefined) {
        return (
            <div className="page--Messages">
                <main className="container-page space-y-4">
                    <SignInRequired message="Please sign in to view your message categories." />
                </main>
            </div>
        );
    }

    return (
        <div className="page--Messages">
            <main className="container-page space-y-4">
                <header className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <h1 className="section-title text-xl">Messages</h1>
                        <div className="text-[var(--text-3)]">Browse your categories imported from GardenIQ</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setRefreshKey(v => v + 1)}
                            aria-label="Refresh"
                            title="Refresh"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span className="ml-2 hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </header>

                {(loadingUser || loadingCats || loadingMsgs) && (
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <SkeletonTile key={i} />
                        ))}
                    </section>
                )}

                {!loadingUser && !loadingCats && categories && categories.length === 0 && (
                    <section className="card">
                        <div className="card-header">
                            <div className="card-title">No message categories yet</div>
                        </div>
                        <div className="space-y-2">
                            <div className="alert info">
                                <div className="font-semibold">Messages are imported from GardenIQ</div>
                                <div className="text-[var(--text-2)]">
                                    Authoring is not available in-app. Ensure your GardenIQ integration is connected and imports have run.
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Link className="btn btn-primary" href="/account">Check Integrations</Link>
                                <button className="btn btn-secondary" onClick={() => setRefreshKey(v => v + 1)}>Retry</button>
                            </div>
                        </div>
                    </section>
                )}

                {!loadingCats && categories && categories.length > 0 && (
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {categories.map(cat => (
                            <CategoryTile
                                key={cat.id}
                                category={cat}
                                count={messageCounts.get(cat.id) ?? 0}
                                onRename={openRename}
                            />
                        ))}
                    </section>
                )}
            </main>

            {/* Rename modal */}
            <RenameCategoryModal
                state={renameState}
                onClose={closeRename}
            />
        </div>
    );
}