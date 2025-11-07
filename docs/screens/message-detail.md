# Screen Description

Name: Message Detail
Route: /message-detail

## Description
The Message Detail screen presents a single marketing message with tabbed previews for its channel variants. Users can switch between Email, SMS, and Push previews to inspect how the content will appear to recipients. The primary column focuses on rich, brand-framed previews with practical viewing controls (device width, scale, and source toggles). An optional right rail shows message metadata (name, category, created date, tags), per-channel availability, and quick actions.

Channel previews:
- Email tab
  - Branded preview frame with header, subject, from, and optional preheader.
  - Desktop/mobile width toggles, scale controls, and a switch to view HTML vs. plain-text.
  - If a preview image or HTML is available via message_variant.preview_image_path or email_html, it’s rendered; otherwise, an info alert explains the variant is not available.
- SMS tab
  - Branded text bubble preview with character counter and estimated segments.
  - Copies the SMS text to the clipboard and supports download as .txt.
- Notification tab (Push)
  - Branded push card with OS style toggle (e.g., iOS/Android look) and collapsed/expanded states.
  - Shows push title/body; supports copy and download payload as JSON.

Right rail (when visible):
- Message metadata: name, category (folder), created date, source (GardenIQ), tags.
- Variant status per channel: badges indicating Available or Missing (with guidance to manage content in GardenIQ).
- Quick actions: copy IDs (message and per-variant), open fullscreen preview, navigate to previous/next message in the category.
- Manage menu: duplicate, move (with category selection modal), and delete (with confirmation). These actions mirror category-level management and respect permissions.

Keyboard shortcuts (optional):
- E/S/P: switch tabs to Email/SMS/Push
- 1/2: toggle desktop/mobile preview (Email)
- F: fullscreen preview
- Cmd/Ctrl+C: copy primary field (subject in Email, text in SMS, title+body in Push)

Permissions:
- guest: view-only (no duplicate/move/delete)
- standard/manager/admin: can perform management actions; authoring is disabled in-app (messages are imported from GardenIQ)

## Actions
- Switch tabs: Email, SMS, Push
- Toggle email preview mode: desktop/mobile, scale, HTML/plain-text, open raw HTML in a new window
- Copy content: email subject, SMS text, push title/body; copy message and variant IDs
- Download previews: email (.html), SMS (.txt), push payload (.json)
- Open fullscreen preview (hides surrounding chrome; focuses on the active tab)
- Navigate within the category: previous/next message
- Manage message: duplicate, move to another category (modal), delete (confirmation)
- View variant availability and guidance when a channel variant is missing
- View metadata: message name, category, created date, tags, external source (GardenIQ)

## Links
- message-category?id={categoryId}: open the parent category folder
- create-agent: start a new agent (optionally preselect this message’s category)