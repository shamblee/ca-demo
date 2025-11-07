# Main Layout

Primary application shell used by the top-level App component to frame all pages. It provides a responsive top navigation bar with account switching, a two-column content pattern with an optional right rail, and respects page display modes (fullscreen and no-margins).

Pages must not import MainLayout directly. The App component mounts pages inside MainLayout and passes children.

## Component API

Props
- children: ReactNode (required) — the page content to render inside the layout

Behavior
- Renders the global header (logo, navigation, account switcher, user menu)
- Collapsible navigation on mobile with an expand (hamburger) button
- Applies page display modes:
  - Fullscreen mode hides the header/nav and shows only children
  - No-margins mode removes page paddings while keeping the header/nav visible
- Ensures brand usage follows the theme and style guide

## Global Navigation Links

Visible in the top navigation (desktop) and in the mobile menu (collapsed):
- Dashboard → /dashboard
- Profiles → /profiles
- Segments → /segments
- Messages → /messages
- Decisioning → /decisioning
- Settings → Account → /account

Logo and avatar shortcuts
- Logo click → /dashboard
- User avatar → /profile

Note: Accept Invite, Sign-in, Register, and other auth/utility pages are not part of the global nav links.

## Responsive Behavior

- Desktop and tablet (md and up)
  - The header shows logo, nav links, account switcher, and user avatar inline
- Mobile (sm and below)
  - The header shows logo, an account switcher button, and a hamburger expand button
  - The nav links and account controls collapse into a slide-down panel below the header
  - The expand button toggles aria-expanded and aria-controls for accessibility
- Fullscreen pages
  - The header and any nav chrome are hidden when useFullPage is active

## Structure and Classes

- Use the theme’s app-header for the top bar and container-page for content width/padding
- Use navlink and navlink active for navigation items
- Use btn and btn-icon for actions; brand color is reserved for interactive elements
- Use content-2col and right-rail for the main 2-column pattern (optional rail)
- Use rail-hidden to collapse the right rail for full-width primary content

## Account Switcher

- Shown in the header next to navigation
- Displays the current account name (and logo if available)
- Clicking opens a popover or panel listing the user’s accounts
- Selecting an account calls app().switchAccountAsync(accountId) and updates tenancy-scoped data
- Uses useUserInfo() or useAccount() to show current account; useFileUrl() to resolve logo image path when available

## Display Modes

- Fullscreen
  - useIsInFullPageMode() → true hides the header, leaving only children visible
  - Typical for authentication or wizard-like flows that request fullscreen with useFullPage()
- No Margins
  - useIsNoMarginMode() → true removes page margins/paddings for edge-to-edge views
  - Header remains visible

## Active Link Highlighting

- The current route should render its link with navlink active
- On mobile, the active link remains highlighted within the expanded panel

## Accessibility

- Hamburger button includes aria-label, aria-expanded, and aria-controls pointing to the mobile menu panel
- Account switcher button includes aria-haspopup="menu", aria-expanded, and proper keyboard handling
- Focus management and rings use the theme’s focus-ring utilities

## Implementation Notes

- Tech stack: React, Next.js (pages directory), Tailwind CSS v4, lucide-react, Supabase
- Static Site Generation only; do not use the Next.js App Router
- Pages export a default function and must not import MainLayout; MainLayout is applied by the App component
- Page root must include className "page--{PageComponentName}"
- Respect multi-tenant scoping with account_id; switching accounts via app().switchAccountAsync

## Header and Navigation Markup (JSX Example)

```tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useIsInFullPageMode, useIsNoMarginMode, useUserInfo, useFileUrl } from "@/lib/hooks";
import { app } from "@/lib/app";
import { cn } from "@/lib/util";
import { ChevronDown, Menu, X } from "lucide-react";

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const isFullscreen = useIsInFullPageMode();
    const noMargins = useIsNoMarginMode();
    const userInfo = useUserInfo();
    const account = userInfo?.account;
    const accountLogoUrl = useFileUrl(account?.logo_image_path);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [acctOpen, setAcctOpen] = useState(false);

    useEffect(() => {
        if (isFullscreen) {
            setMobileOpen(false);
            setAcctOpen(false);
        }
    }, [isFullscreen]);

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

    return (
        <div className={cn("min-h-screen", isFullscreen && "app-shell fullscreen")}>
            {!isFullscreen && (
                <header className="app-header">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="flex items-center gap-2 no-underline">
                            <Logo className="w-7 h-7" />
                            <span className="font-bold">Decisioning Demo</span>
                        </Link>
                    </div>

                    {/* Desktop nav + actions */}
                    <div className="hidden md:flex items-center gap-3">
                        <nav className="flex items-center gap-1">
                            {navLinks.map((n) => (
                                <Link key={n.href} href={n.href} className="navlink">
                                    {n.label}
                                </Link>
                            ))}
                        </nav>

                        {/* Account switcher */}
                        <div className="relative">
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
                                    <span className="truncate max-w-[14rem]">{account?.name ?? "Account"}</span>
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </button>
                            {acctOpen && (
                                <div role="menu" className="absolute right-0 mt-2 min-w-[16rem] card p-2 z-50">
                                    {/* Example account items; wire to real data */}
                                    <button
                                        className="navlink w-full text-left"
                                        onClick={async () => {
                                            setAcctOpen(false);
                                            // Replace with a real id from the user’s memberships
                                            await app().switchAccountAsync("ACCOUNT_ID_EXAMPLE");
                                        }}
                                    >
                                        Switch to another account
                                    </button>
                                    <div className="divider my-2" />
                                    <Link className="navlink" href="/account">
                                        Manage account
                                    </Link>
                                </div>
                            )}
                        </div>

                        <Link href="/profile" className="btn btn-secondary btn-icon" aria-label="Profile">
                            {/* avatar or icon could be placed here */}
                        </Link>
                    </div>

                    {/* Mobile actions */}
                    <div className="md:hidden flex items-center gap-2">
                        {/* Account switcher (compact) */}
                        <button
                            className="btn btn-secondary btn-icon"
                            aria-label="Switch account"
                            aria-haspopup="menu"
                            aria-expanded={acctOpen}
                            onClick={() => setAcctOpen((v) => !v)}
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>

                        <Link href="/profile" className="btn btn-secondary btn-icon" aria-label="Profile" />

                        <button
                            className="btn btn-secondary btn-icon"
                            aria-label="Open navigation"
                            aria-controls="mobile-nav"
                            aria-expanded={mobileOpen}
                            onClick={() => setMobileOpen((v) => !v)}
                        >
                            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        {/* Account popover (mobile) */}
                        {acctOpen && (
                            <div role="menu" className="absolute top-[var(--header-height)] right-2 card p-2 z-50 min-w-[14rem]">
                                <button
                                    className="navlink w-full text-left"
                                    onClick={async () => {
                                        setAcctOpen(false);
                                        await app().switchAccountAsync("ACCOUNT_ID_EXAMPLE");
                                    }}
                                >
                                    Switch to another account
                                </button>
                                <div className="divider my-2" />
                                <Link className="navlink" href="/account" onClick={() => setAcctOpen(false)}>
                                    Manage account
                                </Link>
                            </div>
                        )}
                    </div>
                </header>
            )}

            {/* Mobile collapsed nav */}
            {!isFullscreen && (
                <div
                    id="mobile-nav"
                    className={cn(
                        "md:hidden",
                        mobileOpen ? "block" : "hidden"
                    )}
                >
                    <nav className="container-page py-2 card">
                        <div className="flex flex-col gap-1">
                            {navLinks.map((n) => (
                                <Link key={n.href} href={n.href} className="navlink" onClick={() => setMobileOpen(false)}>
                                    {n.label}
                                </Link>
                            ))}
                        </div>
                    </nav>
                </div>
            )}

            <main className={cn("container-page", noMargins && "p-0", "space-y-4")}>
                {children}
            </main>
        </div>
    );
}
```

Notes
- Use navlink active for the current route. This example omits the active state logic; integrate with your routing to add the active className.
- Replace ACCOUNT_ID_EXAMPLE in the switcher with real membership ids.
- Use useFileUrl for account logos; respect signed URLs and caching.

## Two-Column Content Pattern

- Use content-2col for a responsive 80:20 layout with a right rail
- Add rail-hidden to collapse into a single column

Example
```html
<section class="content-2col">
    <div class="space-y-3">
        <!-- Primary content -->
    </div>
    <aside class="right-rail space-y-3">
        <!-- Optional rail content -->
    </aside>
</section>
```

Collapse the rail
```html
<section class="content-2col rail-hidden">
    <div>Full-width primary content</div>
</section>
```

## Brand and Styling Guidance

- Follow the style guide: dark palette, neutral surfaces and borders, rounded corners, pill-shaped buttons
- Use brand color (var(--blue)) sparingly for interactive elements (buttons, links, icons)
- Use secondary color (var(--purple)) for non-interactive emphasis (alerts, badges)
- Use theme classes first (btn, card, navlink, highlight, container-page, content-2col) before ad-hoc utilities

## Integration With Pages

- Pages export default components and are mounted under MainLayout by the App component
- Pages can request:
  - Fullscreen via useFullPage()
  - No margins via useNoMargins()
- Pages should:
  - Include root className "page--{ComponentName}"
  - Use the theme’s components for consistency (card, tile, table, steps, etc.)

## Navigation Summary (for quick reference)

- Dashboard (/dashboard)
- Profiles (/profiles)
- Segments (/segments)
- Messages (/messages)
- Decisioning (/decisioning)
- Settings → Account (/account)

Shortcuts
- Logo → /dashboard
- Avatar → /profile

This layout ensures a modern, professional, dark-themed shell with a responsive top navigation, consistent two-column page composition, and account-aware multi-tenant behavior.