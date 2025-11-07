# Screen Description

Name: Message Category
Route: /message-category

## Description
The Message Category screen displays all messages within a single content folder (category) as a responsive thumbnail grid. Each tile presents a compact preview for quick scanning, the message name, and its creation date. Messages originate from GardenIQ and are read-only in this app; management is limited to organizing existing content (duplicate, move, delete) and opening a message to view its variants (email, SMS, push) in detail.

Layout highlights
- Header block: shows the category name and optional description, plus a subtle info note indicating that authoring is disabled (messages are imported from GardenIQ).
- Grid: compact, hoverable tiles showing a visual preview (if available), message name, created date, and a per-item overflow (ellipsis) menu.
- Optional right rail: can surface non-interactive category metadata (description, total messages, channel mix summary, last updated), and a contextual tip about using the category with an AI decisioning agent.

Tile details
- Thumbnail/preview: derived from the best available variant preview (e.g., email or a provided preview image).
- Meta: Message name (truncated when long), creation date (e.g., “Created 2025-04-05”).
- Channels: optional chips or subtle indicators when multiple variants exist (Email, SMS, Push).
- Overflow menu: Duplicate, Move, Delete.

Empty state
- When a category has no messages, show an informative card with guidance (“No messages in this category yet”) and a note that messages are imported from GardenIQ.

Permissions
- guest: view-only (no duplicate/move/delete)
- standard/manager/admin: can duplicate, move, and delete messages

## Actions
- Open message
  - Click a tile to navigate to the Message Detail screen for that message (default to the Email tab if available).
- Duplicate message
  - Create a new message in the same category with all variants cloned; prompt to edit the name before confirming.
- Move message
  - Open a modal with a category dropdown; confirm to move the message to the selected category and remove it from the original.
- Delete message
  - Open a confirmation dialog; deleting removes the message and its variants from this account’s library (does not remove historical analytics).
- View preview
  - Hover to see an enlarged preview if available; on small screens, tap to focus the tile preview.
- Inspect channels
  - Review which channels are available (email, SMS, push) via indicators on the tile.
- Optional utilities (if provided)
  - Search within category by message name.
  - Sort by Created (newest/oldest) or Name (A–Z/Z–A).
  - Filter by tags (if messages include tags).
  - Paginate or infinite-scroll through large libraries.

## Links
- message-detail: opens the detail preview for a selected message
- create-agent?categoryId={categoryId}: start the agent creation flow with this category preselected