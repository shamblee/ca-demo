# Screen Description

Name: Register
Route: /register

## Description
Public, full-screen page for creating a new user and an organizational account. The form collects name, email, organization name, and password, then registers via Supabase auth. During sign-up, the app attaches user and account metadata in options.data and relies on backend automation to provision the account, user row, and membership (no explicit DB inserts on the client). Successful registration transitions to a confirmation or signed-in state depending on project auth settings.

The page presents a single centered card, with accessible form fields, clear validation messages, and minimal brand usage. If a visitor is already signed in, the page replaces the form with an informational card stating they are already registered.

Design and behavior
- Layout: single card with form; uses alert/info for notices; pill-shaped primary CTA; neutral dark surfaces and borders.
- Validation: client-side checks for required fields, email format, and password length before submission; field-level errors and an inline form error region (aria-live) for Supabase/auth responses.
- Auth integration: supClient().auth.signUp({ email, password, options: { data: { name, accountName } } }); do not insert rows into tables; backend handles user/account/account_membership.
- States:
  - Default: empty form with helper text on Organization name.
  - Submitting: Register button enters loading/disabled state.
  - Success: either auto-signed-in redirect flow or a confirmation screen to check email and proceed to Sign-in.
  - Already signed in: shows an info message and links to continue (e.g., Profile).
- Accessibility: labeled inputs, keyboard-focus rings, aria-invalid on errors, aria-live for error summaries.

Styling notes
- Use field, label, input, help-text, btn, btn-primary, btn-secondary, alert.info, and focus-ring classes.
- Use brand color only for the primary Register button and links; secondary color for non-interactive info (alert.info).
- Keep the experience focused by rendering in fullscreen (useFullPage).

## Actions
- Enter name, email, organization name, and password.
- Toggle password visibility.
- Submit registration to create the user and organization account.
- View inline validation errors and overall form error summary.
- Retry submission if an error occurs (e.g., email already registered).
- If already signed in, acknowledge “already registered” message and navigate away.
- Navigate to Sign-in instead of creating a new account.

## Links
- sign-in: switch to existing user access (/sign-in)
- accept-account-invite/[invite-code]: handle an invite code if the user was invited to an existing account
- profile: go to the signed-in user’s profile when already registered (/profile)