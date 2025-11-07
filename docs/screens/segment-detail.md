# Screen Description

Name: Segment Detail
Route: /segment-detail

## Description
Segment Detail presents an in-depth view of a single segment, combining its definition (criteria), current membership, and performance metrics.

Layout and content
- Header
  - Segment name and optional description
  - Badges for segment type (Dynamic vs. Static), member count, last updated
  - Quick controls: edit criteria, export/enrich members, create agent, refresh metrics
- KPIs (top summary)
  - Total aggregate orders (sum across members)
  - Average order value (AOV)
  - Aggregate lifetime value (LTV)
  - Subscriber counts by channel: email, SMS, push (subscribed/unsubscribed/bounced)
  - Optional timeframe selector for KPIs (e.g., 30/90 days, all-time)
- Criteria card (segment definition)
  - Demographics
    - Age range
    - Gender
    - Geography (country/region/city/zip)
    - Socioeconomic status
    - Marital status
    - Children/Pets
  - Event/behavior history
    - Purchases (count/recency/value ranges)
    - Add-to-cart
    - Message engagement (opens, clicks, bounces)
    - Web behavior (page views, product views, sessions)
  - Display the active filters with readable chips and values; provide an entry point to edit
- Membership
  - Search, filters (by channel subscription status, geography, engagement), and sorting (name, date added, LTV)
  - Table-style list with checkboxes for bulk actions
    - Columns: full name, email, phone, device ID, date added
    - Optional profile attributes (company, job title) when available
    - Per-profile channel badges (email/SMS/push) with status indicators (subscribed, unsubscribed, bounced, pending)
  - Pagination controls and row count
  - Row actions: open Profile Detail
- Right rail (optional)
  - Channel mix: totals and status breakdown by channel for the segment
  - Recent activity snapshots (e.g., recent purchases, opens/clicks)
  - Guidance to create an agent using this segment (non-interactive info/secondary emphasis)
- States
  - Loading: skeleton for KPIs, criteria, and membership
  - Empty criteria: show informative prompt to define segment rules
  - Empty membership: guidance to adjust criteria or run enrichment
  - Error: non-blocking alert with retry

Permissions
- Guest: view-only (cannot edit criteria or run exports/enrichment)
- Standard/Manager: can edit criteria, export/enrich membership, and create agents
- Admin: all actions plus delete segment

## Actions
- Edit segment
  - Rename segment and update description
  - Modify criteria (demographics and event history conditions)
- Duplicate segment (clone criteria to a new segment)
- Export membership
  - Export all or selected profiles to CSV/Excel
- Enrich profiles
  - Enrich all or selected members
- Bulk selection actions
  - Export selected, Enrich selected, Clear selection
- Create agent
  - Start the agent creation wizard with this segment preselected
- Refresh metrics
  - Recalculate KPIs and subscriber counts
- Search and filter members
  - Query by name/email/phone; filter by channel subscription status, engagement, geography
- Sort membership
  - Sort by name, date added, AOV/LTV (when available)
- View profile
  - Open Profile Detail for a selected member
- Delete segment (admin only)

## Links
- profile-detail?id={profileId}: open a member’s Profile Detail
- create-agent?segmentId={segmentId}: start the agent wizard with this segment preselected
- agent-detail?id={agentId}: view a related agent’s decision log (for agents targeting this segment)