# Message-Category
Route: /message-category
Seen by roles: (all signed in users)

A grid view for signed in users where they can view all messages stored in a category folder

## Requirements
- Each message in the category should be displayed as a thumbnail in the grid
- The message thumbnail should be a preview image of the email contained in the message detail view
- Below each message thumbnail should be the message name and the date the message was created
- Each message thumbnail should have an overflow menu (ellipsis icon) that opens a popover menu
    - The overflow menu should include these actions: duplicate message, move message, delete message
    - The move message action opens a modal with a dropdown menu where users can select from a list of all message categories. Include a button to confirm the move action. Confirmation should move the message to the selected category folder. It should no longer be included in the original message category.
- Users can click into a message to view the message variant previews inside