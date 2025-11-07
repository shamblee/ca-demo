import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
    useCurrentUser,
    useUserRole,
    useStoreItem,
    useStoreMatchingItems,
    useStoreFirstMatchingItem,
    useFileUrl,
    useFullPage,
} from "@/lib/hooks";
import { typeDefs, Message, MessageVariant, MessageCategory } from "@/lib/schema";
import { store } from "@/lib/store";
import { SignInRequired } from "@/components/SignInRequired";
import { cn } from "@/lib/util";
import {
    Copy,
    Download,
    Maximize2,
    Minimize2,
    ChevronLeft,
    ChevronRight,
    Smartphone,
    Monitor,
    Code2,
    Image as ImageIcon,
    MoreHorizontal,
    ExternalLink,
    Folder,
    Trash2,
    ArrowRightLeft,
    BadgeCheck,
    AlertCircle,
} from "lucide-react";

type TabKey = "email" | "sms" | "push";
type EmailDevice = "desktop" | "mobile";
type EmailView = "html" | "text" | "image";
type PushOS = "ios" | "android";

function useQueryId(): string | undefined {
    const router = useRouter();
    const q = router.query?.id;
    return typeof q === "string" ? q : undefined;
}

function formatDate(d?: string): string {
    if (!d) return "";
    try {
        const dt = new Date(d);
        return dt.toLocaleString();
    } catch {
        return d;
    }
}

function copyToClipboard(text: string) {
    if (!text) return;
    try {
        navigator.clipboard.writeText(text);
    } catch {
        // ignore
    }
}

function downloadFile(filename: string, content: string, type = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function estimateSmsSegments(text: string): { chars: number; segments: number } {
    const len = text?.length ?? 0;
    if (len <= 160) return { chars: len, segments: len > 0 ? 1 : 0 };
    const perSeg = 153; // concatenated
    const segments = Math.ceil(len / perSeg);
    return { chars: len, segments };
}

function getPrimaryFieldForCopy(tab: TabKey, variantsByChannel: Record<TabKey, MessageVariant | undefined>) {
    if (tab === "email") {
        const v = variantsByChannel.email;
        return (v?.email_subject || "").trim();
    }
    if (tab === "sms") {
        const v = variantsByChannel.sms;
        return (v?.sms_text || "").trim();
    }
    const v = variantsByChannel.push;
    const title = (v?.push_title || "").trim();
    const body = (v?.push_body || "").trim();
    return [title, body].filter(Boolean).join(" — ");
}

export default function MessageDetailPage() {
    const user = useCurrentUser();
    const role = useUserRole();
    const messageId = useQueryId();
    const router = useRouter();

    const message = useStoreItem<Message>(typeDefs.Message, messageId);
    const variants = useStoreMatchingItems<MessageVariant>(
        typeDefs.MessageVariant,
        message ? { message_id: message.id } : undefined
    );

    const category = useStoreItem<MessageCategory>(typeDefs.MessageCategory, message?.category_id);

    // Messages in same category (for prev/next)
    const siblings = useStoreMatchingItems<Message>(
        typeDefs.Message,
        message?.category_id ? { category_id: message.category_id } : undefined,
        { orderBy: "created_at", orderByDesc: false }
    );

    // Modal + menu states
    const [manageOpen, setManageOpen] = useState(false);
    const [moveOpen, setMoveOpen] = useState(false);
    const [moveCategoryId, setMoveCategoryId] = useState<string | undefined>(undefined);

    // Fullscreen preview
    const [fullscreen, setFullscreen] = useState(false);
    useFullPage(fullscreen);

    // Tabs and per-tab controls
    const [tab, setTab] = useState<TabKey>("email");

    // Email controls
    const [emailDevice, setEmailDevice] = useState<EmailDevice>("desktop");
    const [emailScale, setEmailScale] = useState<number>(1);
    const [emailView, setEmailView] = useState<EmailView>("html");

    // Push controls
    const [pushOS, setPushOS] = useState<PushOS>("ios");
    const [pushExpanded, setPushExpanded] = useState(true);

    // Categories for move
    const allCategories = useStoreMatchingItems<MessageCategory>(typeDefs.MessageCategory, {});

    // Compute variant by channel
    const byChannel = useMemo(() => {
        const list = variants ?? [];
        const map: Record<TabKey, MessageVariant | undefined> = {
            email: list.find((v) => v.channel === "email"),
            sms: list.find((v) => v.channel === "sms"),
            push: list.find((v) => v.channel === "push"),
        };
        return map;
    }, [variants]);

    // Resolve preview image if provided
    const emailPreviewImageUrl = useFileUrl(byChannel.email?.preview_image_path);

    // Choose default email view depending on available assets
    useEffect(() => {
        if (!byChannel.email) return;
        const v = byChannel.email;
        if (v?.email_html) {
            setEmailView("html");
        } else if (v?.preview_image_path) {
            setEmailView("image");
        } else if (v?.email_text) {
            setEmailView("text");
        }
    }, [byChannel.email?.id]);

    // Keyboard shortcuts
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
            if (e.target && (e.target as HTMLElement).tagName === "TEXTAREA") return;

            const key = e.key.toLowerCase();
            if (key === "e") {
                setTab("email");
            } else if (key === "s") {
                setTab("sms");
            } else if (key === "p") {
                setTab("push");
            } else if (key === "1" && tab === "email") {
                setEmailDevice("desktop");
            } else if (key === "2" && tab === "email") {
                setEmailDevice("mobile");
            } else if (key === "f") {
                setFullscreen((v) => !v);
            } else if ((e.ctrlKey || e.metaKey) && key === "c") {
                const text = getPrimaryFieldForCopy(tab, byChannel);
                if (text) {
                    copyToClipboard(text);
                }
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [tab, byChannel]);

    // Prev/Next navigation within category
    const { prevId, nextId } = useMemo(() => {
        if (!siblings || !message) return { prevId: undefined, nextId: undefined };
        const idx = siblings.findIndex((m) => m.id === message.id);
        const prev = idx > 0 ? siblings[idx - 1] : undefined;
        const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : undefined;
        return { prevId: prev?.id, nextId: next?.id };
    }, [siblings, message?.id]);

    // Loading and auth gates
    if (user === null || message === null || variants === null) {
        return (
            <div className="page--MessageDetailPage container-page space-y-4">
                <div className="animate-pulse h-8 w-48 bg-[var(--surface-3)] rounded" />
                <section className="content-2col">
                    <div className="space-y-3">
                        <div className="card h-[24rem]" />
                    </div>
                    <aside className="right-rail space-y-3">
                        <div className="card h-64" />
                    </aside>
                </section>
            </div>
        );
    }
    if (user === undefined) {
        return (
            <div className="page--MessageDetailPage container-page space-y-4">
                <SignInRequired message="Sign in to view message details." />
            </div>
        );
    }
    if (message === undefined) {
        return (
            <div className="page--MessageDetailPage container-page space-y-4">
                <div className="alert info">
                    <div className="font-semibold">Message not found</div>
                    <div className="text-[var(--text-2)]">The requested message could not be located.</div>
                </div>
            </div>
        );
    }

    const canManage = role !== "guest";

    const emailAvailable = !!byChannel.email && !!(byChannel.email.email_html || byChannel.email.preview_image_path || byChannel.email.email_text);
    const smsAvailable = !!byChannel.sms && !!byChannel.sms.sms_text;
    const pushAvailable = !!byChannel.push && !!(byChannel.push.push_title || byChannel.push.push_body);

    function openRawEmailHtml() {
        const html = byChannel.email?.email_html;
        if (!html) return;
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 30000);
    }

    function downloadEmail() {
        const v = byChannel.email;
        if (!v) return;
        if (v.email_html) {
            downloadFile(`${message.name || "email"}.html`, v.email_html, "text/html;charset=utf-8");
        } else if (v.email_text) {
            downloadFile(`${message.name || "email"}.txt`, v.email_text, "text/plain;charset=utf-8");
        }
    }

    function downloadSms() {
        const txt = byChannel.sms?.sms_text ?? "";
        downloadFile(`${message.name || "sms"}.txt`, txt, "text/plain;charset=utf-8");
    }

    function downloadPush() {
        const v = byChannel.push;
        const payload = {
            title: v?.push_title ?? "",
            body: v?.push_body ?? "",
            os: pushOS,
        };
        downloadFile(`${message.name || "push"}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    }

    async function duplicateMessageAsync() {
        if (!canManage || !message) return;
        const newMsg = await store().insertAsync(typeDefs.Message, {
            account_id: message.account_id,
            name: `${message.name} (Copy)`,
            category_id: message.category_id,
            external_source: message.external_source,
            external_id: message.external_id,
            tags: message.tags,
        });
        const vList = variants || [];
        for (const v of vList) {
            await store().insertAsync(typeDefs.MessageVariant, {
                account_id: v.account_id,
                message_id: (newMsg as Message).id,
                channel: v.channel,
                email_subject: v.email_subject,
                email_html: v.email_html,
                email_text: v.email_text,
                sms_text: v.sms_text,
                push_title: v.push_title,
                push_body: v.push_body,
                preview_image_path: v.preview_image_path,
            });
        }
        router.push(`/message-detail?id=${(newMsg as Message).id}`);
    }

    async function deleteMessageAsync() {
        if (!canManage || !message) return;
        const confirmed = window.confirm("Delete this message? This cannot be undone.");
        if (!confirmed) return;
        await store().deleteAsync(typeDefs.Message, message.id);
        router.push(`/message-category?id=${message.category_id ?? ""}`);
    }

    async function moveMessageAsync() {
        if (!canManage || !message || !moveCategoryId) return;
        await store().updateAsync(typeDefs.Message, message.id, { category_id: moveCategoryId });
        setMoveOpen(false);
        router.push(`/message-category?id=${moveCategoryId}`);
    }

    const smsStats = estimateSmsSegments(byChannel.sms?.sms_text ?? "");

    // Renderers for previews
    function renderEmailPreview() {
        const v = byChannel.email;
        if (!v || !emailAvailable) {
            return (
                <div className="alert info">
                    <div className="font-semibold">Email variant unavailable</div>
                    <div className="text-[var(--text-2)]">
                        This message has no email preview available. Manage content in GardenIQ.
                    </div>
                </div>
            );
        }

        const frameWidth = emailDevice === "desktop" ? 800 : 390;
        const subject = v.email_subject ?? "(No subject)";
        const preheader = (v.email_text || "").split("\n").map((s) => s.trim()).find(Boolean) || "";
        const hasHtml = !!v.email_html;
        const hasText = !!v.email_text;
        const hasImage = !!v.preview_image_path && !!emailPreviewImageUrl;

        const currentView: EmailView =
            emailView === "html" && hasHtml
                ? "html"
                : emailView === "image" && hasImage
                ? "image"
                : hasText
                ? "text"
                : hasHtml
                ? "html"
                : hasImage
                ? "image"
                : "text";

        return (
            <div className="space-y-3">
                <div className="card">
                    <div className="card-header">
                        <div className="flex flex-col">
                            <div className="card-title">Email Preview</div>
                            <div className="card-subtitle">{subject}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                className={cn("btn btn-secondary btn-icon", emailDevice === "desktop" && "ring-1 ring-[var(--blue)]")}
                                aria-label="Desktop width"
                                onClick={() => setEmailDevice("desktop")}
                                title="Desktop (1)"
                            >
                                <Monitor className="w-4 h-4" />
                            </button>
                            <button
                                className={cn("btn btn-secondary btn-icon", emailDevice === "mobile" && "ring-1 ring-[var(--blue)]")}
                                aria-label="Mobile width"
                                onClick={() => setEmailDevice("mobile")}
                                title="Mobile (2)"
                            >
                                <Smartphone className="w-4 h-4" />
                            </button>

                            <div className="divider mx-1" />

                            <button
                                disabled={!hasHtml}
                                className={cn(
                                    "btn btn-secondary",
                                    currentView === "html" && "ring-1 ring-[var(--blue)]",
                                    !hasHtml && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => setEmailView("html")}
                                title="HTML view"
                            >
                                <Code2 className="w-4 h-4 mr-2" />
                                HTML
                            </button>
                            <button
                                disabled={!hasText}
                                className={cn(
                                    "btn btn-secondary",
                                    currentView === "text" && "ring-1 ring-[var(--blue)]",
                                    !hasText && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => setEmailView("text")}
                                title="Plain text"
                            >
                                <span className="w-4 h-4 mr-2 inline-block">¶</span>
                                Text
                            </button>
                            <button
                                disabled={!hasImage}
                                className={cn(
                                    "btn btn-secondary",
                                    currentView === "image" && "ring-1 ring-[var(--blue)]",
                                    !hasImage && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => setEmailView("image")}
                                title="Preview image"
                            >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Image
                            </button>

                            <div className="divider mx-1" />

                            <select
                                className="select"
                                value={emailScale}
                                onChange={(e) => setEmailScale(parseFloat(e.target.value))}
                                title="Scale"
                            >
                                <option value={0.75}>75%</option>
                                <option value={1}>100%</option>
                                <option value={1.25}>125%</option>
                            </select>

                            <button className="btn btn-secondary" onClick={() => copyToClipboard(subject)} title="Copy subject">
                                <Copy className="w-4 h-4 mr-2" />
                                Subject
                            </button>
                            <button className="btn btn-secondary" onClick={downloadEmail} title="Download">
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </button>
                            {hasHtml && (
                                <button className="btn btn-secondary" onClick={openRawEmailHtml} title="Open raw HTML in new window">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open HTML
                                </button>
                            )}
                            <button
                                className="btn btn-primary"
                                onClick={() => setFullscreen((v) => !v)}
                                title="Fullscreen (F)"
                            >
                                {fullscreen ? (
                                    <>
                                        <Minimize2 className="w-4 h-4 mr-2" /> Exit Fullscreen
                                    </>
                                ) : (
                                    <>
                                        <Maximize2 className="w-4 h-4 mr-2" /> Fullscreen
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="p-3">
                        <div className="text-[var(--text-3)] mb-2">
                            From: GardenIQ via your brand • Preheader: {preheader || "—"}
                        </div>

                        <div
                            className="mx-auto bg-[var(--surface-2)] border border-[var(--border)] rounded overflow-hidden"
                            style={{ width: frameWidth }}
                        >
                            <div className="p-3 border-b border-[var(--border)] font-semibold">Brand Header</div>
                            <div
                                className="relative"
                                style={{
                                    transform: `scale(${emailScale})`,
                                    transformOrigin: "top center",
                                }}
                            >
                                {currentView === "html" && v.email_html && (
                                    <iframe
                                        className="w-full"
                                        style={{
                                            border: "none",
                                            height: "800px",
                                            background: "white",
                                        }}
                                        title="Email HTML Preview"
                                        srcDoc={v.email_html}
                                    />
                                )}

                                {currentView === "image" && emailPreviewImageUrl && (
                                    <img src={emailPreviewImageUrl} alt="Email preview" className="w-full block" />
                                )}

                                {currentView === "text" && (
                                    <div className="p-4 whitespace-pre-wrap text-[var(--text-1)] bg-white text-black">
                                        {v.email_text || "(No plain text version provided)"}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    function renderSmsPreview() {
        const v = byChannel.sms;
        if (!v || !smsAvailable) {
            return (
                <div className="alert info">
                    <div className="font-semibold">SMS variant unavailable</div>
                    <div className="text-[var(--text-2)]">
                        This message has no SMS content. Manage content in GardenIQ.
                    </div>
                </div>
            );
        }
        const text = v.sms_text ?? "";
        return (
            <div className="card">
                <div className="card-header">
                    <div className="flex flex-col">
                        <div className="card-title">SMS Preview</div>
                        <div className="card-subtitle">
                            {smsStats.chars} chars • {smsStats.segments} segment{text === "" || smsStats.segments === 1 ? "" : "s"}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="btn btn-secondary" onClick={() => copyToClipboard(text)} title="Copy SMS">
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                        </button>
                        <button className="btn btn-secondary" onClick={downloadSms} title="Download .txt">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => setFullscreen((v) => !v)}
                            title="Fullscreen (F)"
                        >
                            {fullscreen ? (
                                <>
                                    <Minimize2 className="w-4 h-4 mr-2" /> Exit Fullscreen
                                </>
                            ) : (
                                <>
                                    <Maximize2 className="w-4 h-4 mr-2" /> Fullscreen
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="p-6 flex items-start justify-center">
                    <div className="w-[360px] rounded-[2rem] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                        <div className="text-center text-[var(--text-3)] mb-3">Brand</div>
                        <div className="space-y-2">
                            <div className="bg-[var(--surface-3)] rounded-2xl p-3 text-[var(--text-1)]">
                                {text || "(No SMS text provided)"}
                            </div>
                            <div className="text-right text-[var(--text-3)] text-xs">Now</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    function renderPushPreview() {
        const v = byChannel.push;
        if (!v || !pushAvailable) {
            return (
                <div className="alert info">
                    <div className="font-semibold">Push notification unavailable</div>
                    <div className="text-[var(--text-2)]">
                        This message has no push notification content. Manage content in GardenIQ.
                    </div>
                </div>
            );
        }
        const title = v.push_title || "(No title)";
        const body = v.push_body || "(No body)";

        const payload = {
            title: v.push_title ?? "",
            body: v.push_body ?? "",
            os: pushOS,
        };

        return (
            <div className="card">
                <div className="card-header">
                    <div className="flex flex-col">
                        <div className="card-title">Push Preview</div>
                        <div className="card-subtitle">
                            OS style:
                            <span className="ml-2 chip">{pushOS.toUpperCase()}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <select className="select" value={pushOS} onChange={(e) => setPushOS(e.target.value as PushOS)}>
                            <option value="ios">iOS</option>
                            <option value="android">Android</option>
                        </select>
                        <button className="btn btn-secondary" onClick={() => setPushExpanded((v) => !v)}>
                            {pushExpanded ? "Collapse" : "Expand"}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => copyToClipboard([title, body].filter(Boolean).join(" — "))}
                            title="Copy"
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                        </button>
                        <button className="btn btn-secondary" onClick={downloadPush} title="Download JSON">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => setFullscreen((v) => !v)}
                            title="Fullscreen (F)"
                        >
                            {fullscreen ? (
                                <>
                                    <Minimize2 className="w-4 h-4 mr-2" /> Exit Fullscreen
                                </>
                            ) : (
                                <>
                                    <Maximize2 className="w-4 h-4 mr-2" /> Fullscreen
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="p-6 flex items-start justify-center">
                    <div
                        className={cn(
                            "w-[380px] border rounded-xl",
                            pushOS === "ios" ? "bg-[var(--surface-2)] border-[var(--border)]" : "bg-[var(--surface-2)] border-[var(--border)]"
                        )}
                    >
                        <div className="p-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-[var(--surface-3)]" />
                                <div className="text-sm text-[var(--text-3)]">Your App</div>
                            </div>

                            <div className="mt-3">
                                <div className="font-semibold">{title}</div>
                                {pushExpanded && <div className="text-[var(--text-2)]">{body}</div>}
                                {!pushExpanded && <div className="text-[var(--text-2)] line-clamp-1">{body}</div>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-3">
                    <div className="highlight p-3 rounded">
                        <div className="text-xs text-[var(--text-3)]">Payload</div>
                        <pre className="mt-1 text-[13px] overflow-auto">{JSON.stringify(payload, null, 2)}</pre>
                    </div>
                </div>
            </div>
        );
    }

    // Right rail content
    function RightRail() {
        return (
            <aside className="right-rail space-y-3">
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Message</div>
                    </div>
                    <div className="space-y-2 p-3 pt-0">
                        <div className="text-sm text-[var(--text-2)]">Name</div>
                        <div className="font-semibold">{message.name}</div>

                        <div className="divider" />

                        <div className="text-sm text-[var(--text-2)]">Category</div>
                        <div className="flex items-center gap-2">
                            <Folder className="w-4 h-4 text-[var(--text-3)]" />
                            {message.category_id ? (
                                <Link className="link" href={`/message-category?id=${message.category_id}`}>
                                    {category?.name ?? "Open category"}
                                </Link>
                            ) : (
                                <span className="text-[var(--text-3)]">Uncategorized</span>
                            )}
                        </div>

                        <div className="divider" />

                        <div className="text-sm text-[var(--text-2)]">Created</div>
                        <div>{formatDate(message.created_at)}</div>

                        <div className="divider" />

                        <div className="text-sm text-[var(--text-2)]">Source</div>
                        <div className="flex items-center gap-2">
                            <span className="badge accent uppercase">{message.external_source || "external"}</span>
                            <span className="text-[var(--text-3)]">{message.external_id || ""}</span>
                        </div>

                        {!!message.tags?.length && (
                            <>
                                <div className="divider" />
                                <div className="text-sm text-[var(--text-2)]">Tags</div>
                                <div className="flex flex-wrap gap-2">
                                    {message.tags.map((t) => (
                                        <span key={t} className="chip">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Variants</div>
                    </div>
                    <div className="p-3 pt-0 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="channel email">Email</span>
                            </div>
                            <span className={cn("badge", emailAvailable ? "success" : "warning")}>
                                {emailAvailable ? "Available" : "Missing"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="channel sms">SMS</span>
                            </div>
                            <span className={cn("badge", smsAvailable ? "success" : "warning")}>
                                {smsAvailable ? "Available" : "Missing"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="channel push">Push</span>
                            </div>
                            <span className={cn("badge", pushAvailable ? "success" : "warning")}>
                                {pushAvailable ? "Available" : "Missing"}
                            </span>
                        </div>

                        {!(emailAvailable && smsAvailable && pushAvailable) && (
                            <div className="mt-3 alert info">
                                <div className="font-semibold">Authoring disabled</div>
                                <div className="text-[var(--text-2)]">
                                    Manage message content in GardenIQ. Variants update here after import.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Quick Actions</div>
                    </div>
                    <div className="p-3 pt-0 space-y-2">
                        <button
                            className="btn btn-secondary w-full justify-between"
                            onClick={() => copyToClipboard(message.id)}
                            title="Copy message ID"
                        >
                            Copy Message ID
                            <Copy className="w-4 h-4" />
                        </button>

                        {byChannel.email && (
                            <button
                                className="btn btn-secondary w-full justify-between"
                                onClick={() => copyToClipboard(byChannel.email!.id)}
                                title="Copy email variant ID"
                            >
                                Copy Email Variant ID
                                <Copy className="w-4 h-4" />
                            </button>
                        )}
                        {byChannel.sms && (
                            <button
                                className="btn btn-secondary w-full justify-between"
                                onClick={() => copyToClipboard(byChannel.sms!.id)}
                                title="Copy SMS variant ID"
                            >
                                Copy SMS Variant ID
                                <Copy className="w-4 h-4" />
                            </button>
                        )}
                        {byChannel.push && (
                            <button
                                className="btn btn-secondary w-full justify-between"
                                onClick={() => copyToClipboard(byChannel.push!.id)}
                                title="Copy push variant ID"
                            >
                                Copy Push Variant ID
                                <Copy className="w-4 h-4" />
                            </button>
                        )}

                        <div className="divider" />

                        <div className="flex items-center gap-2">
                            <button
                                className="btn btn-secondary flex-1"
                                disabled={!prevId}
                                onClick={() => prevId && router.push(`/message-detail?id=${prevId}`)}
                                title="Previous message"
                            >
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                Previous
                            </button>
                            <button
                                className="btn btn-secondary flex-1"
                                disabled={!nextId}
                                onClick={() => nextId && router.push(`/message-detail?id=${nextId}`)}
                                title="Next message"
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </button>
                        </div>

                        <div className="divider" />

                        <div className="relative">
                            <button
                                className="btn btn-secondary w-full justify-between"
                                aria-haspopup="menu"
                                aria-expanded={manageOpen}
                                onClick={() => setManageOpen((v) => !v)}
                            >
                                Manage
                                <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {manageOpen && (
                                <div role="menu" className="card absolute right-0 mt-2 w-full z-50 p-1">
                                    <button
                                        className="navlink"
                                        disabled={!canManage}
                                        onClick={() => {
                                            setManageOpen(false);
                                            duplicateMessageAsync();
                                        }}
                                        title={canManage ? "Duplicate message" : "View-only access"}
                                    >
                                        Duplicate
                                    </button>
                                    <button
                                        className="navlink"
                                        disabled={!canManage}
                                        onClick={() => {
                                            setManageOpen(false);
                                            setMoveCategoryId(category?.id ?? undefined);
                                            setMoveOpen(true);
                                        }}
                                        title={canManage ? "Move to category" : "View-only access"}
                                    >
                                        Move
                                    </button>
                                    <button
                                        className="navlink danger"
                                        disabled={!canManage}
                                        onClick={() => {
                                            setManageOpen(false);
                                            deleteMessageAsync();
                                        }}
                                        title={canManage ? "Delete message" : "View-only access"}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Tips</div>
                    </div>
                    <div className="p-3 pt-0 text-[var(--text-2)] space-y-2">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-[var(--text-3)]" />
                            <div>Press E / S / P to switch between Email, SMS, and Push previews.</div>
                        </div>
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-[var(--text-3)]" />
                            <div>Press 1 / 2 on Email to toggle desktop/mobile widths. Press F for fullscreen.</div>
                        </div>
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-[var(--text-3)]" />
                            <div>Cmd/Ctrl + C copies the primary field for the current tab.</div>
                        </div>
                    </div>
                </div>
            </aside>
        );
    }

    return (
        <div className="page--MessageDetailPage container-page space-y-4">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h1 className="section-title text-xl">{message.name}</h1>
                    {message.category_id && (
                        <Link className="chip no-underline" href={`/message-category?id=${message.category_id}`}>
                            <Folder className="w-3.5 h-3.5 mr-1" />
                            {category?.name ?? "Category"}
                        </Link>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className={cn("tab", tab === "email" && "active")}
                        onClick={() => setTab("email")}
                        title="Email (E)"
                    >
                        Email
                    </button>
                    <button className={cn("tab", tab === "sms" && "active")} onClick={() => setTab("sms")} title="SMS (S)">
                        SMS
                    </button>
                    <button className={cn("tab", tab === "push" && "active")} onClick={() => setTab("push")} title="Push (P)">
                        Notification
                    </button>
                </div>
            </header>

            <section className="content-2col">
                <div className="space-y-3">
                    {tab === "email" && renderEmailPreview()}
                    {tab === "sms" && renderSmsPreview()}
                    {tab === "push" && renderPushPreview()}
                </div>

                <RightRail />
            </section>

            {moveOpen && (
                <div className="modal" role="dialog" aria-modal="true">
                    <div className="modal-card">
                        <div className="card-header">
                            <div className="card-title">Move Message</div>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="field">
                                <label className="label">Select category</label>
                                <select
                                    className="select"
                                    value={moveCategoryId ?? ""}
                                    onChange={(e) => setMoveCategoryId(e.target.value || undefined)}
                                >
                                    <option value="">Uncategorized</option>
                                    {(allCategories ?? []).map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="alert info">
                                <div className="text-[var(--text-2)]">
                                    Moving a message updates its parent category. Variants remain attached.
                                </div>
                            </div>
                        </div>
                        <div className="card-footer">
                            <button className="btn btn-secondary" onClick={() => setMoveOpen(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" disabled={!canManage} onClick={moveMessageAsync}>
                                Move
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}