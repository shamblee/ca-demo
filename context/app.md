# Decisioning Demo

Decisioning Demo allows users to import a customer contact list, enrich the contacts records with appended data, organize contacts into segments, organize messages into category folders, and configure ai agents to manage decision-making with regard to send time, message and channel. 


## User Roles
- guest - A user with view-only permissions
- default - Default user role for somebody belonging to an account, can edit content and configure agents
- manager - An account manager, all permissions of default user plus ability to add/remove users from account
- admin - A user that has all permissions, plus ability to change user roles, manage account billing, and delete account

## Relationships
- Customer contact records are called "Profiles"
- Enriching profiles adds new customer properties and attributes to the profile
- The enrichment process creates "Segments"
- Messages are emails, text messages (SMS), and push notifications
- Messages are imported from GardenIQ, they will not be created in the Decisioning Demo
- Message categories are folders that serve as content libraries for the ai agents
- Messaging Channels are the medium through which a message is sent, such as email, text message or push notification
- AI decisioning agents can send messages to profiles
- AI decisioning agents manage which message to send, the day and time-of-day to send, and the channel through which to send
- Users can configure the settings for agents, such as send frequency, sending timeframes, and desire outcomes
- Outcomes are ranked as Worst, Good, Very Good, Best and users can define which events correlate to which rankings
- Holdout percentage is the percentage of profiles in a segment that will not receive communications from a decisioning agent

## Requirements
- User can import customer contact records (profiles) in a CSV or Excel file to be stored in the platform
- User can view a list of stored profiles
- User can view a profile detail screen that contains customer contact details, properties, attributes and event history
- User can view a list of segments
- User can view a segment detail screen containing the properties of the segment and a list of all profiles in the segment
- User can view a grid of message category folders
- User can click into a message category folder to view a grid of message thumbnails
- User can click on a message thumbnail to view a message detail screen that contains three tabs for Email, SMS, and Notification. Each tab displays a preview of the message in the channel format
- User can create and configure ai decisioning agents
- Once an agent is configured, user can activate the agent
- User can view a list of the ai agents they've created
- User can click into a detail screen for each agent that provides a log of all decisions made by the agent