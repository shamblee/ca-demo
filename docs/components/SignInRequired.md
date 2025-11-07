# SignInRequired

A compact, branded card shown when a user isn’t authenticated or lacks permission to view a screen. It provides clear context and directs users to Sign-in and Register.

- Import: import { SignInRequired } from "@/components/SignInRequired"
- Props:
  - message?: string — optional message to display
  - className?: string — optional className to extend/override styles
- Theme: Tailwind v4, dark palette, brand-only for interactive elements

## When to use

- Protected pages when useCurrentUser() returns undefined (not signed in).
- Permission checks when a user is signed in but lacks the required role.
- Flows that require an authenticated session first (e.g., Accept Account Invite).

## Visual and behavior guidelines

- Uses a card with concise copy and two actions: Sign in (primary) and Register (secondary link).
- Brand color (#4583F7) is used only on interactive elements (primary CTA and links).
- Secondary color (#8E59FF) may be used for non-interactive emphasis (optional info text).
- Rounded corners, neutral borders, subtle elevation; content is centered and readable.
- Accessible and keyboard-friendly: logical focus order, descriptive button/link labels.

## Props

```ts
export interface SignInRequiredProps {
    /**
     * A message to display to the user
     */
    message?: string;
    className?: string;
}
```

Notes:
- If message is not provided, the component displays a sensible default such as “Please sign in to continue.”
- className lets you add layout tweaks (e.g., margins, width constraints) while preserving default styles.

## Basic usage

```tsx
import { SignInRequired } from "@/components/SignInRequired";

export function ProtectedBlock() {
    return (
        <div className="container-page">
            <SignInRequired />
        </div>
    );
}
```

Custom message:
```tsx
<SignInRequired message="You must be signed in to view the Dashboard." />
```

With extra spacing:
```tsx
<SignInRequired className="mt-6" />
```

## Gate a page by authentication

Use useCurrentUser() to show a loading state, then either render the page or show SignInRequired.

```tsx
import { useCurrentUser } from "@/lib/hooks";
import { SignInRequired } from "@/components/SignInRequired";

export default function DashboardPage() {
    const user = useCurrentUser();

    // Loading user
    if (user === null) {
        return (
            <div className="page--Dashboard">
                <main className="container-page">
                    <div className="card skeleton h-[140px]" />
                </main>
            </div>
        );
    }

    // Not signed in
    if (user === undefined) {
        return (
            <div className="page--Dashboard">
                <main className="container-page">
                    <SignInRequired message="Please sign in to view your Dashboard." />
                </main>
            </div>
        );
    }

    // Signed in
    return (
        <div className="page--Dashboard">
            <main className="container-page space-y-4">
                {/* page content */}
            </main>
        </div>
    );
}
```

## Gate by role/permission

If a user is signed in but lacks the required role, you can still show SignInRequired with a specific message.

```tsx
import { useUserRole } from "@/lib/hooks";
import { SignInRequired } from "@/components/SignInRequired";

export function AdminOnly({ children }: { children: React.ReactNode }) {
    const role = useUserRole();

    if (role === null) {
        return <div className="card skeleton h-[120px]" />;
    }

    const isAdmin = role === "admin";
    return isAdmin ? (
        <>{children}</>
    ) : (
        <SignInRequired message="You don’t have permission to access this page. Please contact an admin." />
    );
}
```

## Accept Invite flow example

Prompt to sign in first when a user opens an invite without being authenticated.

```tsx
import { useCurrentUser } from "@/lib/hooks";
import { SignInRequired } from "@/components/SignInRequired";

export default function AcceptAccountInvitePage() {
    const user = useCurrentUser();

    if (user === null) {
        return <div className="card skeleton h-[120px]" />;
    }

    if (user === undefined) {
        return (
            <div className="page--AcceptAccountInvite">
                <main className="container-page">
                    <SignInRequired message="Please sign in to accept your invitation." />
                </main>
            </div>
        );
    }

    return (
        <div className="page--AcceptAccountInvite">
            <main className="container-page">
                {/* Accept/Decline invite UI */}
            </main>
        </div>
    );
}
```

## Anatomy and styling

The component renders a centered card with:
- Title and message text
- Primary action button (Sign in → /sign-in)
- Secondary link (Register → /register)
- Optional info line or subtle highlight border for emphasis

Expected class usage:
- Container: card, card-header, card-title, card-subtitle, card-footer
- Actions: btn btn-primary for Sign in, link for Register
- Optional non-interactive emphasis: alert info or highlight (thin brand border)

Example look (for reference only):
```html
<div class="card">
    <div class="card-header">
        <div class="card-title">Sign-in required</div>
        <div class="card-subtitle">Please sign in to continue.</div>
    </div>
    <div class="card-footer">
        <a href="/sign-in" class="btn btn-primary">Sign in</a>
        <a href="/register" class="link">Create an account</a>
    </div>
</div>
```

Brand and secondary use:
- Primary CTA uses brand color (--blue) as a filled button.
- Registration uses the link style (brand colored text).
- Secondary color (--purple) can be used in non-interactive info blocks if the component exposes such a line.

## Accessibility

- Title is exposed via a heading in the card header.
- Button/link labels are explicit: “Sign in”, “Create an account”.
- Focus order: message → Sign in → Register.
- Ensure the component sits in a landmark region (main or section) for screen-reader navigation.
- Icon-only buttons are not used; all actions have text.

## Layout patterns

- In a centered page: wrap in container-page.
- In a two-column layout: place in the primary column; avoid squeezing action buttons.
- Fullscreen pages: generally unnecessary for this component; keep standard layout and spacing.

Examples:
```tsx
// Centered
<main className="container-page">
    <SignInRequired />
</main>

// Two-column layout, right rail hidden
<section className="content-2col rail-hidden">
    <div>
        <SignInRequired />
    </div>
</section>
```

## Do’s and don’ts

Do:
- Provide a clear, actionable message tailored to the page context.
- Use it for both “not signed in” and “no permission” scenarios.
- Keep the content concise; the page context should make the restriction obvious.

Don’t:
- Use large brand-colored backgrounds.
- Replace the Sign in button with a non-interactive element.
- Nest multiple CTAs; stick to primary (Sign in) and secondary (Register).

## Testing checklist

- Not signed in: component renders with default or provided message and correct links.
- Signed in: component does not render when user should have access.
- Keyboard navigation: tab order cycles through actions correctly.
- Contrast and focus: visible focus ring and sufficient contrast on the dark theme.

## Related

- Auth pages: /sign-in, /register
- Hooks: useCurrentUser(), useUserRole(), useUserInfo()
- Screens that may use this: Accept Account Invite, any protected content (Dashboard, Profiles, Segments, Messages, Decisioning, Settings)