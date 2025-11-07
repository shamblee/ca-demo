# Screen Description

Name: Decisioning
Route: /decisioning

## Description
A dark-themed management screen that lists all AI decisioning agents for the current account (tenant). Users can quickly scan agent status, assigned segment, message category (content library), send schedule, and holdout configuration, then perform common actions such as creating, activating/deactivating, viewing details, or deleting an agent.

Layout and content
- Primary list: Displays agents in a compact table or grid of tiles with clear hover states.
- Each agent item shows:
  - Name and status (Active/Inactive)
  - Segment name (linked to segment detail)
  - Message category (linked to the category’s messages)
  - Frequency, days (Mon–Sun as compact chips), and time windows (morning/afternoon/evening)
  - Holdout percentage
  - Created date; optional “last decisioned” timestamp if available
- Right rail (optional): Quick tips, governance reminders (e.g., “Messages are imported from GardenIQ — authoring is disabled”), and links to learn more about outcomes and attribution.
- Empty state: If no agents exist, display an informational card with a concise description and a primary CTA to create the first agent.

Permissions and behavior
- Admin, manager, and standard users can create, activate/deactivate, and delete agents; guests have view-only access (actions disabled).
- All data is account-scoped; only agents for the active account are displayed.
- Deleting requires confirmation to prevent accidental removal.

Styling and usability
- Modern, professional, dark palette with neutral surfaces and thin, subtle borders.
- Primary CTA “New Agent” uses brand color; secondary actions use neutral buttons.
- Status and schedule details are represented with badges/chips; non-interactive highlights use the secondary accent color.
- Avoid long button labels; favor icon buttons where appropriate (e.g., delete, activate toggle).

## Actions
- Create new agent (primary CTA; opens the three-step wizard)
- View agent details and decision log for a selected agent
- Activate or deactivate an agent via a status toggle
- Delete an agent (with confirmation)
- Optional list utilities:
  - Search by agent name (client-side)
  - Filter by status (Active/Inactive)
  - Sort by name or created date

## Links
- create-agent: opens the 3-step wizard to configure a new agent
- agent-detail: opens the selected agent’s decision log and summary
- segment-detail: view criteria and membership for the agent’s assigned segment
- message-category: browse the content library assigned to the agent