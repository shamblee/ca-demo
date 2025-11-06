# Create-Agent
Route: /create-agent
Seen by roles: (all signed in users)

A 3-step process for signed in users where they can create new ai decisioning agents

## Requirements
- Step 1:
    - User can give agents a name and assign a default email address and SMS phone number the agent will use for sending
    - User can assign one segment and a "Holdout" percentage to each agent
    - User can assign one message category to each agent
- Step 2:
    - User can select sending frequency (ex: daily, 6x/week, 5x/week, etc, Weekly, Every 2 Weeks, Monthly)
    - User can select sending days (checkboxes for each day of the week)
    - User can select sending times (morning, afternoon, evening)
- Step 3:
    - User can define desired outcomes
    - User can select an event from a dropdown for each ranking (Worst, Good, Very Good, Best)
- Once an agent is configured, user can activate the agent