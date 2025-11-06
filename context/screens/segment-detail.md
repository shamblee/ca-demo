# Segment-Detail
Route: /segment-detail
Seen by roles: (all signed in users)

A screen for signed in users where they can view segment details containing the properties of the segment and a list of all profiles in the segment

## Requirements
- Each segment detail screen should display the segment name, the segment criteria (common demographics or event history shared by all profiles in the segment)
    - Common demographics include:
        - age range
        - gender
        - geographic location
        - socioeconomic status
        - marital status
        - whether the profile (consumer contact) has children or pets
    - Common event history includes:
        - product purchases
        - product adds-to-cart
        - message opens
        - message clicks
        - page/product views
- Segment details should include high-level metrics for total aggregate orders, average order value and aggregate lifetime value (total revenue from all orders)
- Segment details should include a list of all profiles included in the segment, with values for total number of profiles, total number of subscribers broken down by channel (email, sms, notifications)