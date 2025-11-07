# Screen Description

Name: Profile Detail
Route: /profile-detail

## Description
The Profile Detail screen presents a comprehensive, CRM-style view of a single stored customer profile. It uses a two-column layout: the primary column focuses on identity, attributes, and a chronological event timeline; the right rail highlights KPIs and quick-reference context.

What’s shown:
- Contact information
  - First name, last name
  - Email, phone, device ID
  - Address: street, city, state/region, postal/ZIP, country
  - Optional professional fields: job title, department, company
  - External ID (e.g., CRM ID), and profile id (copyable)
- Marketing attributes
  - Enriched and CRM-like properties rendered as key-value pairs
  - Ability to reveal the raw attributes object for debugging (read-only JSON view)
- Channel subscriptions (summary and per-channel rows)
  - Email, SMS, Push with current SubscriptionStatus (subscribed, unsubscribed, bounced, pending)
  - Primary address/identifier per channel where available
- Segments membership
  - Static/dynamic segments the profile currently belongs to
  - Counts/badges for quick scan; deep link to each segment’s detail
- KPI metrics (profile-level)
  - Total orders
  - Average order value (AOV)
  - Lifetime value (LTV)
- Event history timeline with filters
  - Web analytics: page_view, session_start, form_submit
  - Messaging: message_sent, message_open, message_click, message_bounce, subscriber_new, subscriber_removed, push_open
  - Ecommerce: add_to_cart, favorite, checkout_started, checkout_abandoned, purchase
  - Filters for event type, channel (email, sms, push), date range; sort by newest/oldest
  - Each event exposes key metadata (timestamps, page URL, product/order IDs, agent/message linkage), with quick links to the related entities when present

Layout guidance:
- Primary column: identity header (name + badges for subscriptions), contact & address cards, attributes, and the event timeline (filter controls above the list).
- Right rail: KPIs at top, channel subscription summary, segment membership list, and quick actions.

## Actions
- Edit profile basics (first/last name), contact fields (email, phone), and address fields
- Edit optional professional fields (job title, department, company)
- View and copy profile identifiers (profile id, device id, external id)
- Manage channel subscriptions for email/SMS/push (subscribe/unsubscribe where applicable; view bounce status)
- View and manage segment membership (add/remove for static segments; view dynamic membership)
- Enrich this profile (on-demand enrichment run for this single profile)
- Export this profile (CSV or JSON of fields and attributes)
- Filter, search, and paginate the event history (by event type, channel, date range)
- Drill into related entities from events (open linked message detail or agent decision log)
- Download filtered event history as CSV (for analytics/debugging)

Permissions notes:
- Guests see a read-only view (no edits or changes)
- Standard/Manager/Admin can perform edits and enrichment; administrative options may be restricted to Admins

## Links
- segment-detail: open the selected segment’s details from the membership list
- message-detail: open the referenced message from a message_open/click/sent event
- agent-detail: open the agent’s decision log for events associated with a specific agent