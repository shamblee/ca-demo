# Screen Description

Name: Messages
Route: /messages

## Description
The Messages screen is the top-level library view for all message categories (folders) available to the current account. It presents a responsive grid of category tiles. Each tile shows the category’s name and the number of messages assigned to it, helping users quickly gauge library size and coverage.

Tiles use the tile component style with a compact header and subtle status elements:
- Title: category name
- Count: total messages in the category (badge brand)
- Optional thumbnail: if available from category metadata

Clicking a tile opens the Message Category screen to browse messages within that folder. Categories are scoped to the active account (multi-tenant) and counts reflect the number of Message records linked by category_id.

Renaming a category is performed in-place via a lightweight Rename Category modal. This only updates the category’s name; messages remain unchanged and continue to roll up to the same category_id. Authoring or editing messages does not occur here; messages are imported from GardenIQ and can only be managed (duplicate, move, delete) within the Message Category view.

States and behaviors
- Empty state: If no categories exist, show an informative card explaining that messages are imported from GardenIQ and no authoring is available in-app, with guidance to check integrations or imports.
- Loading state: Skeleton tiles while categories and counts load.
- Error state: A non-interactive alert indicating the list could not be fetched (retry button).

Access
- Seen by all signed-in users of the current account (view and rename category titles; authoring messages is not available on this screen).

## Actions
- Open a category folder (click a tile) to view its messages.
- Rename a category (opens modal; edit name; Save/Cancel).
- View category message counts (read-only context).

## Links
- message-category: link to view the grid of messages inside the selected category (e.g., /message-category?id={category_id}).