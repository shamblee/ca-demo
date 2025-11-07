# Screen Description

Name: Dashboard
Route: /dashboard

## Description
A dark-themed analytics hub that surfaces cross-channel performance and ROI, organized into four tabs: Web, Messaging, Ecommerce, and Attribution. The page opens with a KPI strip and a filter bar (date range, granularity, and context filters), followed by tab-specific charts and tables. Users can compare agents or messages, drill into decision logs and message previews, and review ROI by message or agent.

Core layout (main content):
- KPI strip: Highlights top metrics for the current tab with deltas vs. previous period.
- Filter bar: Date range (7/30/90 days, custom), time granularity (hour/day/week), and context filters (agent, message, message category, segment, channel).
- Tabs and content:
  - Web: Page views, sessions (new/unique), and form submissions with a time-series chart, a simple funnel, and a top pages table.
  - Messaging (all channels): Sends, opens, clicks, bounces, new subscribers, unsubscribers, with a stacked time-series by channel (email/SMS/push), deliverability rate cards, and a top messages table.
  - Ecommerce: Adds-to-cart, favorites/saves, checkout started, checkout abandoned, purchases, conversion rate, and revenue trends. Includes funnel visualization and top products (if available from events).
  - Attribution: ROI/impact by message or agent with user-selectable comparisons. Shows revenue, orders, AOV, and ROI contribution by dimension (message or agent). Includes a breakdown by channel and an optional holdout-aware view.
- Interactions: Toggle metrics via legend, hover tooltips, series show/hide, compare two entities (agents or messages), and drill-down links to detail screens.

Multi-tenant scope: All figures, filters, and deep links reflect the user’s current account.

## Actions
- Switch tabs between Web, Messaging, Ecommerce, and Attribution.
- Select date range (7/30/90 days, custom) and aggregation granularity (hour/day/week).
- Filter and break down by:
  - Agent, Message, Message Category, Segment
  - Channel (email, SMS, push) where applicable
- Compare two selections (e.g., agent vs. agent, message vs. message) in the Attribution tab.
- Toggle chart series on/off via the legend; switch between stacked and overlapped views where provided.
- View KPIs with deltas vs. previous period; hover charts for exact values and timepoints.
- Drill into detail views from tables and charts (agents, messages, segments, profiles).
- Optional exports of visible tables (CSV) and charts (image) for reporting.

## Links
- agent-detail: link to a selected agent’s decision log (/agent-detail)
- message-detail: link to a selected message’s preview tabs (/message-detail)
- message-category: link to the category containing a selected message (/message-category)
- segment-detail: link to a selected segment’s criteria, KPIs, and membership (/segment-detail)
- profile-detail: link to a profile from recent events or top lists (/profile-detail)
- create-agent: quick action to configure a new AI decisioning agent (/create-agent)