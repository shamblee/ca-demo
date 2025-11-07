# Screen Description

Name: Accept Account Invite
Route: /accept-account-invite/[invite-code]

## Description
Accept Account Invite lets a recipient review and act on an invitation to join an organization (account). The page is accessible to anyone with a valid invite link. If the visitor isn’t authenticated, the screen prompts them to sign in (or register) before proceeding.

Upon loading, the screen resolves the invite code and presents a concise summary:
- Account details: name and (if available) logo
- Role to be granted upon acceptance (admin, standard, or guest; displayed with a non-interactive badge)
- Invited by: inviter’s name (with link to their public profile when available)
- Target email (if the invite was email-specific)
- Invite status and expiration

Primary flows and states:
- Loading: brief skeleton while validating the invite code.
- Valid invite (signed in): users can Accept or Decline. Accepting creates an AccountMembership with the role specified by the invite and switches tenancy to the joined account. Declining marks the invite declined and shows a confirmation message.
- Valid invite (signed out): shows a Sign-In Required card with clear CTAs to sign in or register. After authentication, the page returns to the invite review state.
- Already accepted/declined: shows a non-interactive summary with a status badge and helpful next steps.
- Already a member: if the signed-in user already belongs to the account, shows a confirmation message and a hint to switch to or visit the account.
- Expired/invalid invite: presents an error alert with guidance to contact the inviter for a new link.

Design and interaction notes:
- Uses a dark, professional card layout with pill-shaped CTAs. The primary Accept action uses brand color sparingly; Decline is secondary.
- The targeted email (if present) is shown as informational text (secondary color) and, when it doesn’t match the signed-in user’s email, the page displays a warning with a small action cluster: Continue anyway or Sign out to switch accounts.
- On accept success, the page confirms membership and suggests next steps (e.g., view profile, switch accounts, or continue to workspaces). The app handles the actual tenant switch via the controller.

## Actions
- Validate invite from URL code
- Sign in to continue (if unauthenticated)
- Register a new user (if unauthenticated and no account)
- Accept invite (creates membership with the specified role and switches to the joined account)
- Decline invite (marks the invite declined and confirms the action)
- View inviter’s public profile (if available)
- Acknowledge and continue on email mismatch with warning
- Retry invite validation (e.g., after network error)
- Copy invite information (optional helper for support requests)

## Links
- sign-in: link to Sign-in
- register: link to Register
- profile: link to the user’s profile
- profile/[user-id]: link to the inviter’s public profile (when available)