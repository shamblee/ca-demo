# Screen Description

Name: Agent Detail
Route: /agent-detail

## Description
Agent Detail presents a focused view of a single AI decisioning agent with a running, inspectable decision log. The screen uses a two-column layout: the primary column shows the chronological decision feed with filters and tools, while the right rail summarizes agent configuration and provides quick filters and context.

Primary content (left)
- Header area
  - Agent name and status badge (Active/Inactive)
  - Key metadata: assigned segment, holdout %, message category
  - Inline controls: Activate/Deactivate, Refresh, Export CSV
- Decision toolbar
  - Date range selector
  - Channel filter (Email, SMS, Push)
  - Status filter (Sent, Skipped, Failed, Holdout)
  - Text search by profile identifiers (email, phone, device ID) and message name
  - Sort by (Newest first, Oldest first)
- Decision log list (paginated or infinite scroll)
  - Each decision record includes:
    - Timestamp (decisioned_at) and Scheduled send time (if any)
    - Profile reference (name/email/phone/device ID)
    - Selected message and variant (or “None — Holdout”)
    - Selected channel (email/sms/push)
    - Send status (Sent, Skipped, Failed) with error message when applicable
    - Reasoning summary with expand/collapse for full detail
    - Quick actions per row: View Profile, View Message, Copy IDs
  - Visual cues:
    - Holdout decisions styled as non-send with a dedicated badge
    - Failed sends surfaced with danger status and error tooltip
    - Time window chip (Morning/Afternoon/Evening) when relevant

Right rail (context and quick filters)
- Agent summary card
  - Segment, Holdout %, Message category
  - Frequency, allowed days, and time windows
- Outcomes mapping card
  - Event-to-ranking legend (Worst, Good, Very Good, Best) with weights if configured
- Quick filters card
  - One-click toggles for common filters (e.g., “Errors only”, “Holdout only”, “Sends only”)
- Info card
  - Non-interactive note that messages are sourced from GardenIQ (no in-app authoring)

States and UX
- Empty: Shows guidance when no decisions have been recorded yet
- Inactive: Banner indicating the agent is currently inactive
- Loading: Skeleton placeholders for decision rows
- Errors: Inline error banner with retry for log loading/export

## Actions
- Activate or deactivate the agent
- Filter decisions by date range, channel, and status (sent/skipped/failed/holdout)
- Search decisions by profile identifier or message name
- Sort decisions by timestamp (newest/oldest)
- Expand/collapse reasoning text for any decision
- View a profile from a decision
- Open a message detail from a decision
- Open the agent’s assigned segment or message category for context
- Toggle common quick filters (Errors only, Holdout only, Sends only)
- Refresh the decision log
- Export the current (filtered) decision log to CSV
- Copy decision, message, and profile identifiers

## Links
- profile-detail: link to the targeted profile’s detail
- message-detail: link to the selected message’s detail
- segment-detail: link to the agent’s assigned segment
- message-category: link to the agent’s assigned message category