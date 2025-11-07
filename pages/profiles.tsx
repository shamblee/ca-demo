import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Upload, Download, Sparkles, CheckSquare, Search, Loader2 } from "lucide-react";
import { useAccount, useCurrentUser, useStoreMatchingItems, useUserRole } from "@/lib/hooks";
import { SignInRequired } from "@/components/SignInRequired";
import { cn } from "@/lib/util";
import { store } from "@/lib/store";
import { typeDefs, Profile, Profile_insert } from "@/lib/schema";

type SelectionMap = Record<string, boolean>;

function formatDate(dateIso?: string) {
    if (!dateIso) return "—";
    try {
        return new Date(dateIso).toLocaleDateString();
    } catch {
        return dateIso;
    }
}

function fullNameOf(p: Partial<Profile>): string {
    const fn = (p.first_name || "").trim();
    const ln = (p.last_name || "").trim();
    const combined = `${fn} ${ln}`.trim();
    if (combined) return combined;
    return p.email || p.phone || p.device_id || "(unknown)";
}

function toCsv(rows: Profile[]): string {
    const headers = ["Full Name", "Email", "Phone", "Device ID", "Date Added"];
    const escape = (val?: string) => {
        if (val == null) return "";
        const s = String(val);
        if (s.includes('"') || s.includes(",") || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };
    const lines = [
        headers.join(","),
        ...rows.map((p) =>
            [
                escape(fullNameOf(p)),
                escape(p.email || ""),
                escape(p.phone || ""),
                escape(p.device_id || ""),
                escape(formatDate(p.created_at)),
            ].join(",")
        ),
    ];
    return lines.join("\n");
}

async function downloadCsv(filename: string, rows: Profile[]) {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function naiveParseCsv(text: string): Record<string, string>[] {
    // Naive CSV parsing: comma-separated, double-quote supported minimally for containing commas.
    // For production, use a robust CSV parser. This is sufficient for demo imports.
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];
    const parseLine = (line: string) => {
        const out: string[] = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === "," && !inQuotes) {
                out.push(cur);
                cur = "";
            } else {
                cur += ch;
            }
        }
        out.push(cur);
        return out;
    };
    const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const vals = parseLine(lines[i]);
        const row: Record<string, string> = {};
        header.forEach((h, idx) => {
            row[h] = (vals[idx] ?? "").trim();
        });
        rows.push(row);
    }
    return rows;
}

export default function ProfilesPage() {
    const user = useCurrentUser();
    const account = useAccount();
    const role = useUserRole();

    const isLoadingAuth = user === null || account === null || role === null;
    const isSignedOut = user === undefined;
    const isGuest = role === "guest";

    const [query, setQuery] = useState("");
    const [selection, setSelection] = useState<SelectionMap>({});
    const [notice, setNotice] = useState<string | null>(null);
    const [working, setWorking] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const profiles = useStoreMatchingItems<Profile>(
        typeDefs.Profile,
        account?.id ? { account_id: account.id } : null,
        { orderBy: "created_at", orderByDesc: true }
    );

    useEffect(() => {
        // Clear selection whenever account changes or list reloads
        setSelection({});
    }, [account?.id]);

    const visibleProfiles = useMemo(() => {
        if (!profiles) return profiles; // null = loading
        const q = query.trim().toLowerCase();
        if (!q) return profiles;
        return profiles.filter((p) => {
            const name = fullNameOf(p).toLowerCase();
            const email = (p.email || "").toLowerCase();
            const phone = (p.phone || "").toLowerCase();
            const device = (p.device_id || "").toLowerCase();
            return name.includes(q) || email.includes(q) || phone.includes(q) || device.includes(q);
        });
    }, [profiles, query]);

    const allVisibleSelected = useMemo(() => {
        if (!visibleProfiles) return false;
        if (visibleProfiles.length === 0) return false;
        return visibleProfiles.every((p) => selection[p.id]);
    }, [visibleProfiles, selection]);

    const selectedProfiles = useMemo(() => {
        if (!profiles) return [] as Profile[];
        return profiles.filter((p) => selection[p.id]);
    }, [profiles, selection]);

    function toggleSelectAllVisible() {
        if (!visibleProfiles) return;
        const next: SelectionMap = { ...selection };
        if (allVisibleSelected) {
            // Clear visible
            visibleProfiles.forEach((p) => {
                delete next[p.id];
            });
        } else {
            visibleProfiles.forEach((p) => {
                next[p.id] = true;
            });
        }
        setSelection(next);
    }

    function toggleRow(id: string) {
        setSelection((cur) => ({ ...cur, [id]: !cur[id] }));
    }

    async function handleExportSelected() {
        if (selectedProfiles.length === 0) return;
        await downloadCsv("profiles-selected.csv", selectedProfiles);
    }

    async function handleExportAll() {
        if (!visibleProfiles) return;
        await downloadCsv("profiles-all.csv", visibleProfiles);
    }

    async function handleEnrichSelected() {
        if (isGuest) return;
        if (selectedProfiles.length === 0) return;
        setWorking(true);
        setNotice(null);
        try {
            const now = new Date().toISOString();
            await Promise.all(
                selectedProfiles.map((p) =>
                    store().updateAsync<Profile>(typeDefs.Profile, p.id, {
                        attributes: { ...(p.attributes || {}), enriched_at: now },
                    })
                )
            );
            setNotice(`Enrichment requested for ${selectedProfiles.length} profile(s).`);
        } catch (err) {
            setNotice("Failed to enrich selected profiles.");
        } finally {
            setWorking(false);
        }
    }

    async function handleEnrichAll() {
        if (isGuest) return;
        if (!visibleProfiles || visibleProfiles.length === 0) return;
        setWorking(true);
        setNotice(null);
        try {
            const now = new Date().toISOString();
            await Promise.all(
                visibleProfiles.map((p) =>
                    store().updateAsync<Profile>(typeDefs.Profile, p.id, {
                        attributes: { ...(p.attributes || {}), enriched_at: now },
                    })
                )
            );
            setNotice(`Enrichment requested for ${visibleProfiles.length} visible profile(s).`);
        } catch {
            setNotice("Failed to enrich profiles.");
        } finally {
            setWorking(false);
        }
    }

    async function handleCsvChosen(file: File) {
        if (!account?.id) return;
        setWorking(true);
        setNotice(null);
        try {
            const text = await file.text();
            const rows = naiveParseCsv(text);
            // Map fields: support headers like first_name, last_name, email, phone, device_id
            // If "name" provided, split to first/last.
            const inserts: Profile_insert[] = rows.map((r) => {
                const name = r["name"] || "";
                let first_name = r["first_name"] || r["firstname"] || "";
                let last_name = r["last_name"] || r["lastname"] || "";
                if (!first_name && name) {
                    const parts = name.split(" ");
                    first_name = parts[0] || "";
                    last_name = parts.slice(1).join(" ");
                }
                const insert: Profile_insert = {
                    account_id: account.id,
                    first_name: first_name || undefined,
                    last_name: last_name || undefined,
                    email: r["email"] || undefined,
                    phone: r["phone"] || r["phone_number"] || undefined,
                    device_id: r["device_id"] || r["device"] || undefined,
                    address_street: r["address_street"] || r["street"] || undefined,
                    address_city: r["address_city"] || r["city"] || undefined,
                    address_state: r["address_state"] || r["state"] || undefined,
                    address_zip: r["address_zip"] || r["zip"] || undefined,
                    address_country: r["address_country"] || r["country"] || undefined,
                    attributes: {},
                };
                return insert;
            });
            // Insert sequentially or in batches (demo: sequential)
            let success = 0;
            for (const value of inserts) {
                try {
                    await store().insertAsync(typeDefs.Profile, value);
                    success++;
                } catch {
                    // ignore individual row failures
                }
            }
            setNotice(`Imported ${success} profile(s) from CSV.`);
        } catch {
            setNotice("Failed to import CSV.");
        } finally {
            setWorking(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    function triggerImport() {
        fileInputRef.current?.click();
    }

    if (isSignedOut) {
        return (
            <div className="page--ProfilesPage container-page">
                <SignInRequired message="Please sign in to view profiles." />
            </div>
        );
    }

    return (
        <div className="page--ProfilesPage">
            <section className="container-page space-y-4">
                <header className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h1 className="section-title text-xl">Profiles</h1>
                        {profiles && (
                            <span className="chip">{profiles.length.toLocaleString()} total</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className={cn("btn btn-secondary", working && "opacity-70 pointer-events-none")}
                            onClick={handleExportAll}
                            disabled={!visibleProfiles || visibleProfiles.length === 0}
                            title="Export all visible profiles"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export all
                        </button>
                        <button
                            className={cn("btn btn-primary", (isGuest || working) && "opacity-70 pointer-events-none")}
                            onClick={triggerImport}
                            disabled={isGuest || working}
                            title={isGuest ? "Guests cannot import" : "Import profiles via CSV"}
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Import CSV
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleCsvChosen(f);
                            }}
                        />
                    </div>
                </header>

                <div className="card">
                    <div className="card-header flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
                                <input
                                    className="input pl-9 w-72 max-w-full"
                                    placeholder="Search name, email, phone, device"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                className={cn("btn btn-secondary", (isGuest || working || selectedProfiles.length === 0) && "opacity-70 pointer-events-none")}
                                onClick={handleExportSelected}
                                disabled={selectedProfiles.length === 0}
                                title={selectedProfiles.length === 0 ? "Select profiles to export" : "Export selected profiles"}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export selected
                            </button>
                            <button
                                className={cn("btn btn-secondary", (isGuest || working) && "opacity-70 pointer-events-none")}
                                onClick={handleEnrichAll}
                                disabled={isGuest || working || !visibleProfiles || visibleProfiles.length === 0}
                                title={isGuest ? "Guests cannot enrich" : "Enrich all visible profiles"}
                            >
                                <Sparkles className="w-4 h-4 mr-2 text-[var(--purple)]" />
                                Enrich all
                            </button>
                            <button
                                className={cn("btn btn-secondary", (isGuest || working || selectedProfiles.length === 0) && "opacity-70 pointer-events-none")}
                                onClick={handleEnrichSelected}
                                disabled={isGuest || working || selectedProfiles.length === 0}
                                title={isGuest ? "Guests cannot enrich" : "Enrich selected profiles"}
                            >
                                <Sparkles className="w-4 h-4 mr-2 text-[var(--purple)]" />
                                Enrich selected
                            </button>
                        </div>
                    </div>

                    {notice && (
                        <div className="px-4">
                            <div className="alert info">
                                <div className="flex items-center gap-2">
                                    {working ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckSquare className="w-4 h-4" />
                                    )}
                                    <span>{notice}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="w-10">
                                        <label className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                checked={allVisibleSelected}
                                                onChange={toggleSelectAllVisible}
                                                aria-label="Select all visible"
                                            />
                                        </label>
                                    </th>
                                    <th>Full name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Device ID</th>
                                    <th>Date added</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingAuth || profiles === null ? (
                                    <>
                                        {[...Array(6)].map((_, i) => (
                                            <tr key={`skeleton-${i}`}>
                                                <td className="td-base">
                                                    <div className="skeleton h-4 w-4 rounded" />
                                                </td>
                                                <td className="td-base">
                                                    <div className="skeleton h-4 w-40 rounded" />
                                                </td>
                                                <td className="td-base">
                                                    <div className="skeleton h-4 w-56 rounded" />
                                                </td>
                                                <td className="td-base">
                                                    <div className="skeleton h-4 w-36 rounded" />
                                                </td>
                                                <td className="td-base">
                                                    <div className="skeleton h-4 w-28 rounded" />
                                                </td>
                                                <td className="td-base">
                                                    <div className="skeleton h-4 w-24 rounded" />
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                ) : visibleProfiles && visibleProfiles.length > 0 ? (
                                    visibleProfiles.map((p) => (
                                        <tr key={p.id}>
                                            <td className="td-base text-center">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox"
                                                    checked={!!selection[p.id]}
                                                    onChange={() => toggleRow(p.id)}
                                                    aria-label={`Select ${fullNameOf(p)}`}
                                                />
                                            </td>
                                            <td className="td-base">
                                                <Link
                                                    href={`/profile-detail?id=${encodeURIComponent(p.id)}`}
                                                    className="link"
                                                    title="Open profile detail"
                                                >
                                                    {fullNameOf(p)}
                                                </Link>
                                            </td>
                                            <td className="td-base">
                                                {p.email ? (
                                                    <Link
                                                        href={`/profile-detail?id=${encodeURIComponent(p.id)}`}
                                                        className="link"
                                                        title="Open profile detail"
                                                    >
                                                        {p.email}
                                                    </Link>
                                                ) : (
                                                    <span className="text-[var(--text-3)]">—</span>
                                                )}
                                            </td>
                                            <td className="td-base">{p.phone || <span className="text-[var(--text-3)]">—</span>}</td>
                                            <td className="td-base">{p.device_id || <span className="text-[var(--text-3)]">—</span>}</td>
                                            <td className="td-base">{formatDate(p.created_at)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="td-base text-[var(--text-3)]" colSpan={6}>
                                            {query
                                                ? "No profiles match your search."
                                                : "No profiles yet. Import a CSV to get started."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="card-footer flex items-center justify-between">
                        <div className="text-[var(--text-3)]">
                            {selectedProfiles.length > 0
                                ? `${selectedProfiles.length} selected`
                                : "No profiles selected"}
                        </div>
                        <div className="text-[var(--text-3)]">
                            {visibleProfiles ? `${visibleProfiles.length} visible` : ""}
                        </div>
                    </div>
                </div>

                <section className="content-2col">
                    <div className="space-y-3">
                        <div className="alert info">
                            <div className="font-semibold">Tip</div>
                            <div className="text-[var(--text-2)]">
                                Guests have view-only access. Members and admins can import, enrich, and export profiles.
                            </div>
                        </div>
                    </div>
                    <aside className="right-rail space-y-3">
                        <div className="card">
                            <div className="card-title">CSV Import Format</div>
                            <div className="mt-2 text-[var(--text-2)] text-sm">
                                Include any of these headers: first_name, last_name, name, email, phone, device_id, address_street,
                                address_city, address_state, address_zip, address_country. Extra columns are ignored.
                            </div>
                        </div>
                    </aside>
                </section>
            </section>
        </div>
    );
}