# Screen Description

Name: Account
Route: /account

## Description
The Account screen provides a tenant-scoped overview of your organization and a management console for membership and access. All signed-in users can view basic account details (name, logo, and a muted account ID) and see the list of members. Users with elevated permissions can administer the account:

- Admins can edit account information (name, logo), manage member roles, generate and revoke invite links, remove members, manage billing, and delete the account. Admins cannot change their own role.
- Managers can add and remove users (via invites and member removal); role changes remain an admin-only operation.
- Standard and Guest users have view-only access to account details and membership, with links to profile pages.

The Members section presents a compact grid of user cards showing the member’s name and profile image. Each card links to the user’s public profile for quick reference. Admins and Managers will see per-user controls appropriate to their role (e.g., change role for Admins; remove member for Admins/Managers). Admins can generate invite links that direct recipients to the Accept Account Invite flow, and optionally revoke pending invites.

A dedicated action allows starting a new organizational account (e.g., creating a new workspace). If invoked while signed in, the Register flow will indicate that the user is already registered but can still initiate creation of an additional account/workspace per tenancy rules.

## Actions
- View basic account info: name, logo, and account ID (copyable)
- View membership: grid of user cards (name, avatar), with links to public profiles
- Create a new organizational account (start a new workspace)
- Admin-only:
  - Edit account info (name, logo)
  - Generate invite links for new users (copy invite URL)
  - Revoke pending invites
  - Change a member’s role (cannot change own role)
  - Remove a member from the account
  - Manage billing
  - Delete the account (irreversible, with confirmation)
- Manager-only:
  - Invite users (generate/copy invite link)
  - Remove members
- Per-user actions (as permitted by role):
  - Open a user’s public profile
  - Remove member (Admin/Manager)
  - Adjust role (Admin)

Notes
- Invite URL format: https://[location.host]/accept-account-invite/[inviteCode]
- Role capabilities follow app permissions; database role mapping is enforced by application logic and checks

## Links
- profile: link to the current user’s profile (/profile)
- profile/[user-id]: link to a member’s public profile (/profile/[user-id])
- accept-account-invite/[invite-code]: link used for invites (/accept-account-invite/[invite-code])
- register: start a new organizational account (/register)