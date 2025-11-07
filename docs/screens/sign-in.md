# Screen Description

Name: Sign-in
Route: /sign-in

## Description
Access point for existing users to authenticate with email and password. The screen presents a focused, full-screen card (no global navigation) with the app logo, concise copy, and a simple two-field form. It follows the dark theme with neutral surfaces and a primary brand-colored CTA.

Behavior and states:
- Default: email and password inputs, primary “Sign in” button, and a secondary link to register.
- Validation: inline field errors for missing/invalid email or empty password; errors appear beneath fields using help-text and field.invalid styles.
- Submitting: button enters a loading state to prevent duplicate submissions.
- Error handling: non-field errors (e.g., “Invalid credentials”) appear as an alert within the card.
- Success: user is returned to the last attempted protected route; if none, the app proceeds to the default signed-in experience.
- Invite flow: if reached via an account invite link (invite-code present), the screen shows a brief info alert and preserves the invite context; upon successful sign-in, the user continues to the Accept Account Invite screen to complete the process.
- Already signed in: replace the form with an info card stating the user is already signed in and provide a small set of next steps (e.g., continue to previous page or open Profile).

UI notes:
- Uses a centered card with: Logo/header, short intro text, form fields, and actions.
- Form uses label, input, help-text patterns; password field includes a show/hide toggle.
- Brand usage is limited to the primary CTA and links; non-interactive highlights use secondary styles (alert.info).
- The page requests fullscreen mode so the main navigation is hidden for a distraction-free sign-in.

## Actions
- Enter email and password.
- Toggle password visibility.
- Submit to sign in (handles loading and error states).
- Navigate to Register to create a new account if the user doesn’t have one.
- If arriving with an invite-code, proceed to complete the invitation after successful sign-in.
- If already signed in, dismiss the message or proceed to the previous page or Profile.

## Links
- register: link to create a new user and organizational account (/register)
- accept-account-invite/[invite-code]: link to complete an invitation after authentication
- profile: link to the signed-in user’s profile (/profile)