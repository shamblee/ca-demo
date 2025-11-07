# Screen Description

Name: Profile
Route: /profile

## Description
The Profile screen is the signed-in user’s personal page. It presents core identity details and lets the user update their display information while keeping their email address read-only. The primary column focuses on identity and editing, and the right rail lists the user’s account memberships with the ability to switch the active tenant.

Content and behavior
- Identity header: avatar, name, optional hero/cover image, and read-only email
- Edit panel: update name, upload/replace profile image, upload/replace hero image; email is immutable
- Memberships rail: each account card shows account name, role badge (admin, standard, guest), and a Switch button for the active tenant
- Image storage: uploads use Supabase Storage in the accounts bucket with the path pattern {account_id}/users/{user_id}/{fileName}; only the path is stored; URLs are resolved client-side via useFileUrl or fileStore().getUrlAsync
- Validation and state: form uses typed useState and Zod (User_insert/User schemas) before persisting; show inline error states and disabled Save until changes are valid
- Permissions: all signed-in users can edit their own profile (except email); roles only affect what’s shown in membership cards (no role editing here)
- Accessibility: icon-only buttons include aria-labels; avatar has meaningful alt text; focus rings use theme utilities
- Layout: two-column content-2col with a compact right rail; rail can collapse when the viewport is narrow

Empty and loading states
- Loading: skeletons for avatar, name, and memberships while user info loads
- No hero image: show a neutral placeholder with an Add cover button
- No avatar: show an initial-based placeholder
- No memberships: show an info alert indicating no accounts are linked yet

## Actions
- Edit display name (input) and Save changes
- Cancel/revert unsaved edits
- Upload or replace profile picture (JPG/PNG/WebP); remove current picture
- Upload or replace hero/cover image; remove current cover
- View read-only email address
- Copy user ID to clipboard (for support/debug)
- Switch active account (from membership cards) using app().switchAccountAsync(accountId)
- Refresh image previews (re-resolve signed URLs if needed)
- Open public profile view for this user

## Links
- profile/[user-id]: open the public profile view for the current user