# Logo

An SVG logo component for the Decisioning Demo application. It’s compact, scalable, and themable, and is used primarily in the app header and as a subtle brand accent where appropriate.

- Import: `import { Logo } from "@/components/Logo"`
- Purpose: Display the app’s brand mark
- Typical placement: App header (left), links back to Dashboard (/dashboard)

## Props

TypeScript
```ts
export interface LogoProps {
    color?: string;
    className?: string; // default often "w-8 h-8" in component library usage
    size?: string | number;
}
```

Guidance
- color: Sets the logo’s color directly. Useful when you need an explicit color that does not rely on CSS context.
- className: Use Tailwind classes to size and position (e.g., w-6 h-6). This is the most common sizing method in our UI.
- size: If provided, sets width and height explicitly (string accepts units like "1.5rem", number is interpreted as px). Prefer one sizing approach at a time—either Tailwind size classes via className or the size prop.

Notes on precedence
- If you pass size, it should take precedence for width/height in most usage patterns.
- If you rely on className only, Tailwind sizing controls dimensions. A common default in the system is w-8 h-8 for header placement.

## Color and Theming

The Logo supports single-color rendering and should respect the app’s dark palette and brand rules:
- Primary brand color: var(--blue) #4583F7 — Use sparingly and mainly for interactive elements (links, buttons, clickable icons).
- Secondary color: var(--purple) #8E59FF — Use for non-interactive emphasis and accents.
- Neutral usage: Prefer neutral text colors (e.g., var(--text-1) or var(--text-2)) for routine placements so the logo doesn’t overpower content.

Recommended approaches
- Set the logo’s color via currentColor and control it with a parent text color class for consistency with the theme.
- Use the color prop only when you need a fixed color that doesn’t derive from context.

Examples
```tsx
// In a neutral header: inherit currentColor (recommended)
<div className="text-[var(--text-1)]">
    <Logo className="w-7 h-7" />
</div>

// Explicit brand accent (clickable context only)
<a className="no-underline text-[var(--blue)] hover:opacity-90" href="/dashboard" aria-label="Go to Dashboard">
    <Logo className="w-7 h-7" />
</a>

// Secondary color for non-interactive emphasis (informational areas)
<div className="text-[var(--purple)]">
    <Logo className="w-6 h-6" />
</div>

// Direct color override
<Logo size={20} color="var(--blue)" />
```

Brand rules refresher
- Use brand blue for interactive elements and small accents. Avoid filling large areas with brand color.
- For non-CTA highlights, prefer a thin brand-colored border or use the secondary color for emphasis.

## Sizing

Use either className with Tailwind or the size prop, but not both together.

- Tailwind classes (preferred for consistency):
```tsx
<Logo className="w-6 h-6" />
<Logo className="w-8 h-8" />
<Logo className="w-10 h-10" />
```

- size prop (string or number):
```tsx
<Logo size={16} />          // 16px
<Logo size="1.25rem" />     // 1.25rem
<Logo size="32px" />        // 32px
```

Typical placements
- App header: 24–32px (w-6 h-6 or w-8 h-8)
- Tiles/cards: 20–24px (w-5 h-5 or w-6 h-6)
- Inline with text: 16–20px (w-4 h-4 or w-5 h-5)

## Accessibility

- Decorative usage (not announcing brand text): Add aria-hidden="true" or ensure it’s not read redundantly.
- Interactive usage (clickable to Dashboard): Provide a clear label on the clickable element (the link), not the logo itself.
- If the logo is the only visible brand identifier in a context where screen readers need the name, add a title or aria-label on a surrounding element.

Examples
```tsx
// Clickable header logo with accessible label
<a className="flex items-center gap-2 no-underline" href="/dashboard" aria-label="Go to Dashboard">
    <Logo className="w-8 h-8" />
    <span className="font-bold">Decisioning Demo</span>
</a>

// Decorative only inside a card header
<div className="flex items-center gap-2">
    <Logo className="w-5 h-5" aria-hidden="true" />
    <div className="card-title">Overview</div>
</div>
```

## Usage Examples

Basic import
```tsx
import { Logo } from "@/components/Logo";
```

Header placement (recommended pattern from App Shell)
```tsx
<header className="app-header">
    <a className="flex items-center gap-2 no-underline" href="/dashboard" aria-label="Go to Dashboard">
        <Logo className="w-8 h-8" />
        <span className="font-bold">Decisioning Demo</span>
    </a>
    <a className="btn btn-secondary btn-icon" href="/profile" aria-label="Profile">
        {/* avatar or icon */}
    </a>
</header>
```

Neutral surface, subtle accent
```tsx
<div className="card">
    <div className="card-header">
        <div className="flex items-center gap-2">
            <Logo className="w-6 h-6 text-[var(--text-2)]" />
            <div className="card-title">Recent Activity</div>
        </div>
    </div>
    {/* ... */}
</div>
```

Interactive brand usage (sparingly)
```tsx
<button className="btn btn-primary btn-icon" aria-label="Home">
    {/* When used in a button, brand color is appropriate */}
    <Logo className="w-5 h-5" />
</button>
```

Secondary highlight (non-interactive info)
```tsx
<div className="alert info">
    <div className="flex items-center gap-2">
        <Logo className="w-5 h-5 text-[var(--purple)]" aria-hidden="true" />
        <div className="font-semibold">Heads up</div>
    </div>
    <div className="text-[var(--text-2)]">Messages are imported. Authoring is disabled.</div>
</div>
```

## Do’s and Don’ts

Do
- Use Tailwind width/height classes for consistent sizing in the design system.
- Allow the logo to inherit color via currentColor and theme text colors for most placements.
- Wrap the logo in a link to /dashboard in the app header and provide an aria-label on the link.

Don’t
- Don’t use the brand color as a large filled background for the logo or surrounding blocks.
- Don’t apply strong brand color to non-interactive areas unless it’s a thin border or minor accent.
- Don’t combine both size prop and Tailwind sizing at the same time (avoid conflicting styles).

## Troubleshooting

- Logo appears too dim on dark backgrounds: Use text-[var(--text-1)] on a wrapper or pass color="var(--text-1)".
- Logo color doesn’t change with theme: Ensure you’re not hard-coding color unless necessary; prefer inheriting currentColor via parent text color.
- Click target too small in header: Wrap the logo and product name in the same anchor to increase the accessible click area.

## Quick Reference

- Primary import: `import { Logo } from "@/components/Logo"`
- Control size with Tailwind classes (e.g., w-8 h-8) or the size prop
- Use brand color (#4583F7) sparingly; reserve it for interactive contexts
- Use secondary color (#8E59FF) for non-interactive emphasis and info blocks
- Provide accessible labels for clickable logo placements