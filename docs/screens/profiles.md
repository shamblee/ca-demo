# Screen Description

Name: Profiles
Route: /profiles

## Description
The Profiles screen lists all stored customer profiles in the current account with essential identifiers and dates, and supports bulk operations. It presents a tabular view with columns for:
- Full name (First + Last)
- Email
- Phone
- Device ID
- Date added

Users can select individual profiles using row checkboxes (and a header checkbox to select or clear the visible set), then perform bulk actions like enrichment and export. Clicking a profile’s name or email opens the profile’s detailed view. The page also includes an action to import additional profiles via CSV to expand the contact database.

This screen is available to all signed-in users and respects role-based permissions (guests are view-only).

## Actions
- Select profiles via row checkboxes; use the header checkbox to select/clear visible rows
- Open a profile’s detail view by clicking its name or email
- Import additional profiles via CSV
- Enrich selected profiles
- Enrich all profiles
- Export selected profiles (CSV)
- Export all profiles (CSV)

## Links
- profile-detail: link to a single profile’s detail view (/profile-detail?id={profileId})