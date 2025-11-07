import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Logo } from "@/components/Logo";
import { app } from "@/lib/app";
import { cn } from "@/lib/util";
import { useIsInFullPageMode, useIsNoMarginMode, useUserInfo, useFileUrl } from "@/lib/hooks";
import { ChevronDown, Menu, X, UserRound } from "lucide-react";

export interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const router = useRouter();
    const isFullscreen = useIsInFullPageMode();
    const noMargins = useIsNoMarginMode();
    const userInfo = useUserInfo();
    const account = userInfo?.account;
    const accountLogoUrl = useFileUrl(account?.logo_image_path);

    const [mobileOpen, setMobileOpen] = useState(false);
    const [acctOpen, setAcctOpen] = useState(false);

    const acctMenuRef = useRef<HTMLDivElement | null>(null);

    // Close menus on route change or when entering fullscreen
    useEffect(() => {
        setMobileOpen(false);
        setAcctOpen(false);
    }, [router.asPath, isFullscreen]);

    // Close account popover on outside click
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!acctOpen) return;
            const t = e.target as Node;
            if (acctMenuRef.current && !acctMenuRef.current.contains(t)) {
                setAcctOpen(false);
            }
        }
        function onEsc(e: KeyboardEvent) {
            if (e.key === "Escape") setAcctOpen(false);
        }
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("keydown", onEsc);
        };
    }, [acctOpen]);

    const navLinks = useMemo(
        () => [
            { href: "/dashboard", label: "Dashboard" },
            { href: "/profiles", label: "Profiles" },
            { href: "/segments", label: "Segments" },
            { href: "/messages", label: "Messages" },
            { href: "/decisioning", label: "Decisioning" },
            { href: "/account", label: "Settings" },
        ],
        []
    );

    const isActive = (href: string) => {
        const path = (router.asPath || "").split("?")[0] || "";
        return path === href || path.startsWith(href + "/");
    };

    return (
        <div className={cn("min-h-screen", isFullscreen && "app-shell fullscreen")}>
            {!isFullscreen && (
                <header className="app-header">
                    {/* Left: Logo */}
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="flex items-center gap-2 no-underline">
                            <Logo className="w-7 h-7" />
                            <span className="font-bold">Decisioning Demo</span>
                        </Link>
                    </div>

                    {/* Desktop nav and actions */}
                    <div className="hidden md:flex items-center gap-3">
                        {/* Global navigation */}
                        <nav className="flex items-center gap-1">
                            {navLinks.map((n) => (
                                <Link
                                    key={n.href}
                                    href={n.href}
                                    className={cn("navlink", isActive(n.href) && "active")}
                                >
                                    {n.label}
                                </Link>
                            ))}
                        </nav>

                        {/* Account switcher */}
                        <div className="relative" ref={acctMenuRef}>
                            <button
                                className="btn btn-secondary"
                                aria-haspopup="menu"
                                aria-expanded={acctOpen}
                                onClick={() => setAcctOpen((v) => !v)}
                            >
                                <div className="flex items-center gap-2">
                                    {accountLogoUrl ? (
                                        <img
                                            alt=""
                                            src={accountLogoUrl}
                                            className="w-5 h-5 rounded"
                                        />
                                    ) : (
                                        <div className="w-5 h-5 rounded bg-[var(--surface-3)]" />
                                    )}
                                    <span className="truncate max-w-[14rem]">
                                        {account?.name ?? "Account"}
                                    </span>
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </button>

                            {acctOpen && (
                                <div
                                    role="menu"
                                    className="absolute right-0 mt-2 min-w-[16rem] card p-2 z-50"
                                >
                                    <div className="px-2 py-1 text-sm text-[var(--text-3)]">
                                        Signed in as
                                    </div>
                                    <div className="px-2 pb-2 text-[var(--text-2)] truncate">
                                        {userInfo?.user?.email ?? "guest"}
                                    </div>
                                    <div className="divider my-2" />
                                    <button
                                        className="navlink w-full text-left"
                                        onClick={async () => {
                                            setAcctOpen(false);
                                            // Replace with a real account id from memberships when available
                                            await app().switchAccountAsync("ACCOUNT_ID_EXAMPLE");
                                        }}
                                    >
                                        Switch to another account
                                    </button>
                                    <Link
                                        className="navlink"
                                        href="/account"
                                        onClick={() => setAcctOpen(false)}
                                    >
                                        Manage account
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Profile */}
                        <Link
                            href="/profile"
                            className="btn btn-secondary btn-icon"
                            aria-label="Profile"
                            title="Profile"
                        >
                            <UserRound className="w-5 h-5" />
                        </Link>
                    </div>

                    {/* Mobile actions */}
                    <div className="md:hidden flex items-center gap-2">
                        {/* Account switcher: compact */}
                        <button
                            className="btn btn-secondary btn-icon"
                            aria-label="Switch account"
                            aria-haspopup="menu"
                            aria-expanded={acctOpen}
                            onClick={() => {
                                setAcctOpen((v) => !v);
                                if (!mobileOpen) return;
                            }}
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>

                        <Link
                            href="/profile"
                            className="btn btn-secondary btn-icon"
                            aria-label="Profile"
                            title="Profile"
                        >
                            <UserRound className="w-5 h-5" />
                        </Link>

                        {/* Hamburger: collapsible navigation */}
                        <button
                            className="btn btn-secondary btn-icon"
                            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                            aria-controls="mobile-nav"
                            aria-expanded={mobileOpen}
                            onClick={() => setMobileOpen((v) => !v)}
                        >
                            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </header>
            )}

            {/* Account popover on mobile (anchored under header) */}
            {!isFullscreen && (
                <div className="relative md:hidden">
                    {acctOpen && (
                        <div
                            ref={acctMenuRef}
                            role="menu"
                            className="absolute right-2 top-2 card p-2 z-50 min-w-[14rem]"
                        >
                            <div className="px-2 py-1 text-sm text-[var(--text-3)]">Account</div>
                            <div className="px-2 pb-2 text-[var(--text-2)] truncate">
                                {account?.name ?? "Account"}
                            </div>
                            <div className="divider my-2" />
                            <button
                                className="navlink w-full text-left"
                                onClick={async () => {
                                    setAcctOpen(false);
                                    await app().switchAccountAsync("ACCOUNT_ID_EXAMPLE");
                                }}
                            >
                                Switch to another account
                            </button>
                            <Link
                                className="navlink"
                                href="/account"
                                onClick={() => setAcctOpen(false)}
                            >
                                Manage account
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* Collapsible mobile navigation panel */}
            {!isFullscreen && (
                <div
                    id="mobile-nav"
                    className={cn("md:hidden transition-all", mobileOpen ? "block" : "hidden")}
                >
                    <nav className="container-page py-2 card">
                        <div className="flex flex-col gap-1">
                            {navLinks.map((n) => (
                                <Link
                                    key={n.href}
                                    href={n.href}
                                    className={cn("navlink", isActive(n.href) && "active")}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    {n.label}
                                </Link>
                            ))}
                        </div>
                    </nav>
                </div>
            )}

            {/* Main content area */}
            <main className={cn("container-page", noMargins && "p-0", "space-y-4")}>{children}</main>
        </div>
    );
}