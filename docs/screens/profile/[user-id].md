# Screen Description

Name: Public Profile
Route: /profile/[user-id]

## Description
Public, account-scoped view of another user’s profile. This page surfaces the user’s basic identity details alongside their membership information for the current account. All signed-in users can view the user’s name, email, avatar/hero (if present), and metadata such as user id and when the user record was created. When the viewer is an account admin, a Role card appears in the right rail enabling role changes for the viewed user within the current account.

Behavior and permissions
- View state (all signed-in users): read-only details for the user in the context of the active account.
- Admin control: a Role selector shows “Admin”, “Standard”, and “Guest” (mapped to the user_role enum). Saving updates the account_membership role for this user in the current account only.
- Safeguards:
  - Admins cannot change their own role from this page (the control is disabled with a helpful message).
  - If the viewed user has no membership in the current account (edge case), the page shows basic info and a muted notice that membership is required to manage roles.
- Layout guidance:
  - Primary column: identity block (avatar, name, email), user metadata (id, created_at), and optional hero banner preview.
  - Right rail (when space allows): Role management card (admin-only), quick copy actions, and a permanent link (copy profile URL).
- Multi-tenant scoping: all data and actions are constrained to the current account_id; only the membership in the active account is editable.

Primary content blocks
- Identity: avatar, name, email (read-only), optional hero image preview.
- Metadata: user id (copyable), created_at, last accessed at (from account_membership when available).
- Role (admin-only): current role, selector for admin/standard/guest, Save and Cancel controls, disabled state for self-role.

States and feedback
- Success and error toasts on role updates.
- Disabled controls when the viewer lacks admin permissions.
- Skeleton/loading states while user or membership loads.
- Muted alert if the user is not a member of the current account (no role to display).

## Actions
- View public user information (avatar, name, email)
- View account-scoped metadata (role, last accessed, created date; where available)
- Copy user id
- Copy email address
- Copy permalink to this public profile
- Admin: Change this user’s role within the current account (Admin, Standard, Guest)
- Admin: Save role changes
- Admin: Cancel/revert unsaved role changes

## Links
- profile: link to your personal profile (/profile)
- profile/[user-id]: copyable permalink to this public profile page