# Decisioning Demo Style Guide

A practical guide for using the Tailwind v4-based theme and utilities included in tailwind-theme. This covers layout, components, state patterns, and best practices for brand usage across the app.

## Basics and Setup

- Tailwind version: v4 (utility-first; no App Router; pages dir only)
- Use component classes and utilities defined by the theme before adding one-off Tailwind utilities
- Brand color is reserved for interactive elements; secondary color is for non-interactive emphasis
- Pill-shaped buttons; rounded corners; neutral surfaces and borders for the dark palette

Top of globals.css must begin with:
```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300..900&family=Public+Sans:wght@300..800&display=swap");
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

Theme and utilities are defined in tailwind-theme. Do not edit pseudo selectors in @utility; use @layer components for pseudo selectors as already implemented.

## Design Tokens and Color Usage

- Use prebuilt classes like btn-primary, badge.brand, link, highlight for branded accents
- For non-interactive emphasis (info), use secondary color via alert.info, badge.accent, or prose links
- Subtle brand emphasis: highlight (thin brand border) and border-brand-subtle

Dos
- Use brand color for CTAs: buttons, links, clickable icons
- Use secondary for non-clickable highlights and informational emphasis
- Prefer card, tile, and neutral surfaces for layout structure

Don’ts
- Don’t use brand color for large backgrounds
- Don’t apply brand color to non-interactive blocks unless highlighting with thin border

## Page and Layout Conventions

- Root element className must follow: page--{PageComponentName}
- Default centered layout is handled by MainLayout; pages should not import it directly
- Use content-2col to render a two-column layout with a right rail
- Add rail-hidden to collapse to one column

Example: Page root and 2-column layout
```html
<div class="page--Dashboard">
    <header class="app-header">
        <div class="flex items-center gap-2">
            <!-- <Logo/> -->
            <span class="font-bold">Decisioning Demo</span>
        </div>
        <button class="btn btn-secondary btn-icon" aria-label="Profile">
            <!-- avatar or icon -->
        </button>
    </header>

    <main class="container-page space-y-4">
        <section class="content-2col">
            <!-- Primary column -->
            <div class="space-y-3">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Overview</div>
                        <div class="card-subtitle">Summary of performance and trends</div>
                    </div>
                    <div class="text-[var(--text-2)]">Welcome back!</div>
                </div>
            </div>

            <!-- Right rail -->
            <aside class="right-rail space-y-3">
                <div class="card">
                    <div class="card-title">Quick Actions</div>
                    <div class="mt-2 flex flex-wrap gap-2">
                        <button class="btn btn-primary">New Agent</button>
                        <button class="btn btn-secondary">Import Profiles</button>
                    </div>
                </div>
            </aside>
        </section>
    </main>
</div>
```

Collapse right rail
```html
<section class="content-2col rail-hidden">
    <div>Full-width primary content</div>
</section>
```

## App Shell and Navigation

- Use app-shell to split sidebar and content columns
- Use navlink and navlink.active for routing links

```html
<div class="app-shell">
    <aside class="app-sidebar">
        <nav class="flex flex-col gap-1">
            <a class="navlink active" href="/dashboard">Dashboard</a>
            <a class="navlink" href="/profiles">Profiles</a>
            <a class="navlink" href="/segments">Segments</a>
            <a class="navlink" href="/messages">Messages</a>
            <a class="navlink" href="/decisioning">Decisioning</a>
            <a class="navlink" href="/account">Settings</a>
        </nav>
    </aside>

    <div>
        <header class="app-header">
            <a class="flex items-center gap-2 no-underline" href="/dashboard">
                <!-- <Logo/> -->
                <span class="font-bold">Decisioning Demo</span>
            </a>
            <a class="btn btn-secondary btn-icon" href="/profile" aria-label="Profile">
                <!-- icon/avatar -->
            </a>
        </header>

        <main class="page container-page space-y-4">
            <!-- page content -->
        </main>
    </div>
</div>
```

Fullscreen pages should hide the sidebar (handled by the app). The app-shell.fullscreen class is applied by MainLayout when useFullPage is active.

## Cards, Tiles, and Sections

- card, card-header, card-title, card-subtitle, card-footer build elevated sections
- tile variants are used in grid contexts (messages, categories)

```html
<div class="card">
    <div class="card-header">
        <div class="flex flex-col">
            <div class="card-title">Recent Activity</div>
            <div class="card-subtitle">Latest events from your tenant</div>
        </div>
        <button class="btn btn-secondary">View all</button>
    </div>

    <div class="space-y-2">
        <div class="flex items-center justify-between">
            <span class="text-[var(--text-2)]">Purchase</span>
            <span class="badge success">Success</span>
        </div>
        <div class="divider"></div>
        <div class="flex items-center justify-between">
            <span class="text-[var(--text-2)]">Unsubscribe</span>
            <span class="badge danger">Alert</span>
        </div>
    </div>

    <div class="card-footer">
        <button class="btn btn-primary">Primary CTA</button>
        <button class="btn btn-secondary">Secondary</button>
    </div>
</div>
```

Tile for message thumbnails
```html
<div class="tile">
    <div class="tile-header">
        <div class="font-semibold">Spring Promo</div>
        <button class="btn btn-secondary btn-icon" aria-label="More">
            <!-- ellipsis icon -->
        </button>
    </div>
    <div class="tile-body">Email, SMS, Push</div>
    <div class="tile-meta">
        <span class="subtle">Created 2025-03-24</span>
        <span class="badge brand">12 variants</span>
    </div>
</div>
```

## Buttons and Links

- btn, btn-primary, btn-secondary, btn-danger
- btn-primary.ghost for non-filled brand buttons
- btn-icon for square icon buttons
- link for inline clickable text; highlight for non-CTA brand outline

```html
<div class="flex items-center gap-2">
    <button class="btn btn-primary">Save</button>
    <button class="btn btn-primary ghost">Outline</button>
    <button class="btn btn-secondary">Cancel</button>
    <button class="btn btn-danger">Delete</button>
    <button class="btn btn-icon" aria-label="Refresh">
        <!-- icon -->
    </button>
    <a class="link" href="#learn">Learn more</a>
</div>

<div class="mt-3 p-3 highlight rounded-[var(--radius)]">
    Subtle brand-highlighted container (non-CTA)
</div>
```

## Forms and Inputs

- Compose fields with field, label, input/select/textarea, help-text
- Use .invalid on a wrapper to display error styles

```html
<form class="grid gap-3 max-w-xl">
    <div class="field">
        <label class="label">Name</label>
        <input class="input" placeholder="Enter name"/>
    </div>

    <div class="field">
        <label class="label">Email</label>
        <input class="input" placeholder="name@example.com" type="email"/>
        <div class="help-text">We’ll never share your email.</div>
    </div>

    <div class="field invalid">
        <label class="label">Phone</label>
        <input class="input" placeholder="+1 (555) 555-1234"/>
        <div class="help-text">Please provide a valid phone number.</div>
    </div>

    <div class="flex gap-2">
        <button type="submit" class="btn btn-primary">Submit</button>
        <button type="button" class="btn btn-secondary">Cancel</button>
    </div>
</form>
```

Checkboxes and radios are styled by base classes. Pair them with labels:
```html
<label class="flex items-center gap-2">
    <input type="checkbox" class="checkbox"/>
    <span class="text-[var(--text-2)]">Subscribe to SMS</span>
</label>
```

## Tabs

- Use tab for base, tab active for selected tab

```html
<div class="flex items-center gap-2">
    <button class="tab active">Email</button>
    <button class="tab">SMS</button>
    <button class="tab">Push</button>
</div>
```

## Tables

- Wrap with table-wrap and use table for the table element

```html
<div class="table-wrap">
    <table class="table">
        <thead>
        <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Date added</th>
        </tr>
        </thead>
        <tbody>
        <tr>
            <td class="td-base">Jane Doe</td>
            <td class="td-base">jane@example.com</td>
            <td class="td-base">2025-04-02</td>
        </tr>
        <tr>
            <td class="td-base">John Smith</td>
            <td class="td-base">john@example.com</td>
            <td class="td-base">2025-04-05</td>
        </tr>
        </tbody>
    </table>
</div>
```

## Badges, Chips, Status

- badge with variants: accent, brand, success, warning, danger
- chip for compact labels
- status mirrors badge variants

```html
<div class="flex flex-wrap gap-2">
    <span class="badge">Default</span>
    <span class="badge accent">Info</span>
    <span class="badge brand">Brand</span>
    <span class="badge success">Success</span>
    <span class="badge warning">Warning</span>
    <span class="badge danger">Danger</span>
    <span class="chip">Segment: VIP</span>
    <span class="status success">Active</span>
</div>
```

## Alerts

- Non-interactive informative emphasis; secondary color is appropriate for info

```html
<div class="alert info">
    <div class="font-semibold">Heads up</div>
    <div class="text-[var(--text-2)]">Messages are imported from GardenIQ. Authoring is disabled.</div>
</div>
```

## KPI Blocks

```html
<div class="grid grid-cols-4 gap-3 kpi-grid">
    <div class="kpi">
        <div class="kpi-label">Total Orders</div>
        <div class="kpi-value">4,218</div>
        <div class="kpi-delta text-[var(--success)]">+8.3%</div>
    </div>
    <div class="kpi">
        <div class="kpi-label">AOV</div>
        <div class="kpi-value">$86.40</div>
        <div class="kpi-delta text-[var(--text-3)]">–</div>
    </div>
    <div class="kpi">
        <div class="kpi-label">LTV</div>
        <div class="kpi-value">$472.10</div>
        <div class="kpi-delta text-[var(--success)]">+3.2%</div>
    </div>
    <div class="kpi">
        <div class="kpi-label">Attribution ROI</div>
        <div class="kpi-value">3.7x</div>
        <div class="kpi-delta text-[var(--success)]">+0.2</div>
    </div>
</div>
```

## Steps (Create Agent Wizard)

```html
<div class="steps">
    <div class="step active">1. Basics</div>
    <div class="step">2. Schedule</div>
    <div class="step">3. Outcomes</div>
</div>
```

## Decision Log

```html
<div class="space-y-2">
    <div class="decision">
        <div class="meta">
            <div>2025-04-05 10:12</div>
            <div>Profile: jane@example.com</div>
        </div>
        <div>
            <div class="flex flex-wrap gap-2">
                <span class="badge brand">Message: Spring Promo</span>
                <span class="channel email">Email</span>
                <span class="chip">Send: Afternoon</span>
            </div>
            <div class="reason mt-2">
                Selected email for past email engagement; afternoon aligns with user open-time history.
            </div>
        </div>
    </div>
</div>
```

## Analytics Legend

```html
<div class="legend">
    <div class="item">
        <span class="swatch" style="background: var(--chart-1)"></span>
        Page views
    </div>
    <div class="item">
        <span class="swatch" style="background: var(--chart-2)"></span>
        Sessions
    </div>
    <div class="item">
        <span class="swatch" style="background: var(--chart-3)"></span>
        Form submits
    </div>
</div>
```

## Channels

```html
<div class="flex gap-2">
    <span class="channel email">Email</span>
    <span class="channel sms">SMS</span>
    <span class="channel push">Push</span>
</div>
```

## Message Previews

```html
<div class="space-y-3">
    <div class="preview-email">
        <div class="p-4 border-b border-[var(--border)] font-semibold">Brand Header</div>
        <div class="p-4 text-[var(--text-2)]">Email content preview...</div>
    </div>
    <div class="preview-sms">
        <div class="text-[var(--text-2)]">[Brand] Your code is 123456.</div>
    </div>
    <div class="preview-push">
        <div class="font-semibold">Limited-time offer</div>
        <div class="text-[var(--text-3)]">Tap to view details</div>
    </div>
</div>
```

## Modals

```html
<div class="modal" role="dialog" aria-modal="true">
    <div class="modal-card">
        <div class="card-header">
            <div class="card-title">Rename Category</div>
        </div>
        <div class="space-y-3">
            <div class="field">
                <label class="label">New name</label>
                <input class="input" placeholder="Enter category name"/>
            </div>
        </div>
        <div class="card-footer">
            <button class="btn btn-secondary">Cancel</button>
            <button class="btn btn-primary">Save</button>
        </div>
    </div>
</div>
```

## Prose (Markdown/Docs)

```html
<article class="prose">
    <h1>Attribution</h1>
    <p>Analyze ROI by message or agent with user-selectable comparisons.</p>
    <ul>
        <li>Revenue</li>
        <li>Orders</li>
        <li>AOV</li>
    </ul>
    <p>Learn more in the <a href="#">documentation</a>.</p>
</article>
```

## Dashboard KPI Grid (Page Rule)

The theme provides a page-specific helper for the Dashboard KPI layout via .page--Dashboard .kpi-grid.

```html
<div class="page--Dashboard">
    <main class="container-page">
        <section class="kpi-grid">
            <div class="kpi">
                <div class="kpi-label">Sends</div>
                <div class="kpi-value">186k</div>
                <div class="kpi-delta text-[var(--success)]">+5.4%</div>
            </div>
            <div class="kpi">
                <div class="kpi-label">Opens</div>
                <div class="kpi-value">42k</div>
                <div class="kpi-delta text-[var(--success)]">+2.1%</div>
            </div>
            <div class="kpi">
                <div class="kpi-label">Clicks</div>
                <div class="kpi-value">12.1k</div>
                <div class="kpi-delta text-[var(--success)]">+0.8%</div>
            </div>
            <div class="kpi">
                <div class="kpi-label">Bounces</div>
                <div class="kpi-value">1,042</div>
                <div class="kpi-delta text-[var(--danger)]">+0.3%</div>
            </div>
        </section>
    </main>
</div>
```

## Messages and Categories Grid

- Use .page--Messages .grid or .page--MessageCategory .grid for responsive tiles

```html
<div class="page--Messages">
    <main class="container-page">
        <div class="grid">
            <a class="tile no-underline" href="/message-category?id=welcome">
                <div class="tile-header">
                    <div class="font-semibold">Welcome Series</div>
                    <span class="badge brand">8</span>
                </div>
                <div class="tile-body">Automations</div>
                <div class="tile-meta">
                    <span class="subtle">Updated 2025-04-04</span>
                    <span class="chip">Email + SMS</span>
                </div>
            </a>
            <a class="tile no-underline" href="/message-category?id=promo">
                <div class="tile-header">
                    <div class="font-semibold">Promotions</div>
                    <span class="badge brand">24</span>
                </div>
                <div class="tile-body">Campaign Library</div>
                <div class="tile-meta">
                    <span class="subtle">Updated 2025-03-29</span>
                    <span class="chip">All channels</span>
                </div>
            </a>
        </div>
    </main>
</div>
```

## Accessibility Considerations

- Buttons, inputs, and interactive elements have a consistent focus ring (focus-ring)
- Ensure aria-labels on icon-only buttons (btn-icon)
- Maintain sufficient color contrast; avoid using brand color on large text backgrounds

```html
<button class="btn btn-icon" aria-label="Open menu">
    <!-- icon -->
</button>
<input class="input focus-ring" placeholder="Search"/>
```

## Utilities at a Glance

Layout
- container-page for max width and horizontal padding
- content-2col and rail-hidden to toggle two-column layouts
- right-rail for sticky side content
- divider for horizontal rules

State/Emphasis
- focus-ring and ring-brand for focus and emphasis rings
- border-brand-subtle for thin brand border
- skeleton for loading shimmer

Navigation/Chips/Badges
- navlink and navlink active for sidebar items
- chip for compact labels and channel, badge.* for status

Tables
- table-wrap, table, th/td row styles baked into components

Tabs
- tab and tab active for tabbed UIs

Modals
- modal and modal-card for overlays

Steps
- steps, step, step active for the Create Agent workflow

Decision Log
- decision, with .meta and .reason blocks

Legend
- legend, item, swatch for analytics

## Page Root Naming

- Always include the page root class name using page--{ComponentName}
- Examples: page--Dashboard, page--Profiles, page--Segments, page--Messages, page--Decisioning, page--Account

```html
<div class="page--Profiles">
    <main class="container-page space-y-4">
        <header class="flex items-center justify-between">
            <h1 class="section-title text-xl">Profiles</h1>
            <div class="flex gap-2">
                <button class="btn btn-secondary">Export</button>
                <button class="btn btn-primary">Import CSV</button>
            </div>
        </header>

        <div class="table-wrap">
            <table class="table">
                <thead>
                    <tr>
                        <th>Full name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Device ID</th>
                        <th>Date added</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="td-base">Avery Chen</td>
                        <td class="td-base">avery@example.com</td>
                        <td class="td-base">+1 (555) 555-1000</td>
                        <td class="td-base">device-xyz</td>
                        <td class="td-base">2025-04-05</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </main>
</div>
```

## Brand and Secondary Use Examples

Interactive brand (buttons, links)
```html
<a class="link" href="/decisioning">Go to Decisioning</a>
<button class="btn btn-primary">Activate Agent</button>
```

Non-interactive secondary (info emphasis)
```html
<div class="alert info">
    <div class="font-semibold">Note</div>
    <div class="text-[var(--text-2)]">Agents learn from outcomes; configure rankings for best results.</div>
</div>
```

Subtle brand outline (non-CTA)
```html
<div class="p-3 highlight">
    This section is highlighted with a thin brand border.
</div>
```

## Performance and Responsiveness

- Cards and tiles include hover and elevation transitions
- The dashboard KPI grid adapts from 4 to 2 to 1 columns at breakpoints
- Message grids adapt using page-level grid helpers

```html
<div class="page--MessageCategory">
    <main class="container-page">
        <div class="grid">
            <!-- responsive tiles go here -->
        </div>
    </main>
</div>
```

## Common Patterns per Screen

Create Agent (3-step)
```html
<div class="page--CreateAgent container-page space-y-4">
    <header class="flex items-center justify-between">
        <div class="steps">
            <div class="step active">1. Basics</div>
            <div class="step">2. Schedule</div>
            <div class="step">3. Outcomes</div>
        </div>
        <button class="btn btn-secondary">Cancel</button>
    </header>

    <section class="card">
        <div class="card-title">Step 1: Basics</div>
        <div class="mt-3 grid gap-3 md:grid-cols-2">
            <div class="field">
                <label class="label">Agent name</label>
                <input class="input" placeholder="e.g., Promo Optimizer"/>
            </div>
            <div class="field">
                <label class="label">Segment</label>
                <select class="select">
                    <option>All Subscribers</option>
                </select>
            </div>
            <div class="field">
                <label class="label">Holdout %</label>
                <input class="input" placeholder="e.g., 10"/>
            </div>
            <div class="field">
                <label class="label">Message Category</label>
                <select class="select">
                    <option>Promotions</option>
                </select>
            </div>
        </div>
        <div class="card-footer">
            <button class="btn btn-secondary">Back</button>
            <button class="btn btn-primary">Continue</button>
        </div>
    </section>
</div>
```

Agent Detail (Decision Log)
```html
<div class="page--AgentDetail container-page space-y-3">
    <h1 class="section-title text-xl">Agent: Promo Optimizer</h1>

    <div class="decision">
        <div class="meta">
            <div>2025-04-05 09:30</div>
            <div>Profile: avery@example.com</div>
        </div>
        <div>
            <div class="flex flex-wrap gap-2">
                <span class="badge brand">Spring Promo</span>
                <span class="channel sms">SMS</span>
                <span class="chip">Send: Morning</span>
            </div>
            <div class="reason mt-2">SMS chosen for recent SMS click behavior; morning window historically best.</div>
        </div>
    </div>
</div>
```

Segments
```html
<div class="page--Segments container-page space-y-4">
    <header class="flex items-center justify-between">
        <h1 class="section-title text-xl">Segments</h1>
        <button class="btn btn-primary">Create Segment</button>
    </header>

    <div class="table-wrap">
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Profiles</th>
                    <th>Growth 30d</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="td-base">High Intent</td>
                    <td class="td-base">12,341</td>
                    <td class="td-base text-[var(--success)]">+4.2%</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
```

Messages and Message Detail tabs
```html
<div class="page--MessageDetail container-page space-y-3">
    <div class="flex items-center gap-2">
        <button class="tab active">Email</button>
        <button class="tab">SMS</button>
        <button class="tab">Push</button>
    </div>
    <div class="preview-email">
        <div class="p-4 border-b border-[var(--border)] font-semibold">Brand Header</div>
        <div class="p-4">Email preview content here</div>
    </div>
</div>
```

## Practical Tips

- Prefer component classes (btn, card, tile, table, etc.) and theme utilities (container-page, content-2col) before composing many ad-hoc Tailwind classes
- For custom emphasis that isn’t a CTA, use highlight or border-brand-subtle instead of a filled brand background
- Use alert.info for informative notices where secondary color is appropriate
- Use focus-ring for custom focusable elements to maintain consistent accessibility affordances

If you must reference tokens directly in utilities, use CSS variable syntax for color values:
```html
<div class="p-3 rounded-[var(--radius)] border" style="border-color: var(--color-border)">
    <p class="text-[var(--color-text-2)]">Direct token usage example.</p>
</div>
```

This guide should cover most layout and component needs for the app screens:
- Dashboard, Profiles, Segments, Messages, Decisioning, Account/Settings
- Message categories and details
- Agent creation, detail logs, analytics views
- Invite, Register, Sign-in flows using the same input/button patterns

Adhere to the brand usage rules and rely on the provided theme utilities for a consistent, modern, dark UI.