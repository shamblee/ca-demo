# Screen Description

Name: Segments
Route: /segments

## Description
A dark-themed, account-scoped index of customer segments showing size and recent growth. The primary content is a sortable, searchable table listing:
- Segment name
- Number of profiles (current membership count)
- Growth 30d (profiles added in the last 30 days; treat as the growth metric)

Rows are clickable to open Segment Detail. The list respects the current tenant (account_id) and includes common states (loading skeleton, empty state with guidance). Growth indicators should clearly explain their meaning via tooltip or help text. Optional chips can denote segment type (Dynamic or Static) when available.

## Actions
- Search segments by name
- Sort by name, profile count, or 30-day growth
- Refresh the list
- Open a segment’s detail by clicking a row
- Optional (role-permitting): Create Segment

## Links
- segment-detail?segmentId={segmentId}: open details, criteria, KPIs, and membership for a specific segment
- create-agent?segmentId={segmentId} (optional quick action): start a new agent preselected to this segment