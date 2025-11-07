# Screen Description

Name: Create Agent
Route: /create-agent

## Description
A focused three-step wizard for configuring an AI decisioning agent that selects which message to send, via which channel, and when to send it for a chosen segment. The wizard emphasizes clarity and guardrails, using cards and a stepper to guide users from basics to scheduling and finally to desired outcomes.

- Step 1 — Basics
  - Collect the agent name, default sending identities (email from address and SMS from number), and core assignments.
  - Assign exactly one Segment (scoped to the current account) and set a Holdout percentage for a control group.
  - Select exactly one Message Category (content library) the agent will draw from. Messages are imported from GardenIQ; there is no authoring in-app.
  - A brief info note clarifies how holdout works and that messages are read-only.

- Step 2 — Schedule
  - Define the cadence and constraints the agent must respect:
    - Sending frequency: daily, 6x/week, 5x/week, weekly, every 2 weeks, or monthly.
    - Allowed days: Mon–Sun (checkboxes).
    - Allowed time windows: morning, afternoon, evening.
  - These constraints bound the agent’s send decisions for each eligible profile.

- Step 3 — Outcomes
  - Define what “success” looks like and map events to ranked outcomes:
    - Rankings required: Worst, Good, Very Good, Best.
    - Map one Event Type to each ranking (e.g., purchase → Best; message_click → Very Good; message_open → Good; unsubscribe/bounce → Worst).
  - Optionally provide a short description of the desired outcome strategy for later reference.
  - A final summary shows selections prior to activation.

Validation and state
- Required fields are validated; the primary CTA is disabled until the configuration is complete.
- All segment, category, and message data is scoped to the current account (multi-tenant).
- The finish step enables immediate activation once all requirements are satisfied.

UI patterns
- Uses a three-step indicator (steps → step active).
- Each step is presented in a card with a footer that contains Back/Continue and primary action buttons.
- Informational notes use the secondary color style (alert info) to reinforce non-interactive guidance.

## Actions
- Enter agent basics:
  - Set agent name
  - Set default email-from address
  - Set default SMS-from phone number
- Assign configuration targets:
  - Choose a single Segment
  - Set Holdout percentage (0–100)
  - Choose a single Message Category
- Configure scheduling:
  - Select sending frequency
  - Choose allowed days (Mon–Sun)
  - Choose allowed time windows (morning, afternoon, evening)
- Define outcomes:
  - Provide an optional desired outcome description
  - Map one Event Type to each required outcome rank (Worst, Good, Very Good, Best)
- Navigate the wizard:
  - Back to previous step
  - Continue to next step
  - Cancel and exit the wizard
- Complete setup:
  - Review a summary on Step 3
  - Activate the agent once configuration is valid

## Links
- agent-detail: link to an agent’s decision log after creation or activation
- segment-detail: link to view the selected segment’s criteria and membership
- message-category: link to view the chosen category’s message library
- message-detail: link to preview a specific message variant within the chosen category