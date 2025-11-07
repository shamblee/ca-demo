import { z } from "zod";

/**
 * Communication channel enumeration
 * Zod schema for the "Channel" union
 */
export const ChannelSchema=z.enum(["email","sms","push"]).describe("Communication channel enumeration");

/**
 * Event type enumeration for analytics and attribution
 * Zod schema for the "EventType" union
 */
export const EventTypeSchema=z.enum(["page_view","session_start","form_submit","message_sent","message_open","message_click","message_bounce","subscriber_new","subscriber_removed","add_to_cart","favorite","checkout_started","checkout_abandoned","purchase","push_open"]).describe("Event type enumeration for analytics and attribution");

/**
 * Outcome ranking enumeration
 * Zod schema for the "OutcomeRank" union
 */
export const OutcomeRankSchema=z.enum(["worst","good","very_good","best"]).describe("Outcome ranking enumeration");

/**
 * Sending frequency enumeration for agents
 * Zod schema for the "SendFrequency" union
 */
export const SendFrequencySchema=z.enum(["daily","six_per_week","five_per_week","weekly","biweekly","monthly"]).describe("Sending frequency enumeration for agents");

/**
 * Time window enumeration for agents
 * Zod schema for the "SendTimeWindow" union
 */
export const SendTimeWindowSchema=z.enum(["morning","afternoon","evening"]).describe("Time window enumeration for agents");

/**
 * Channel subscription status enumeration
 * Zod schema for the "SubscriptionStatus" union
 */
export const SubscriptionStatusSchema=z.enum(["subscribed","unsubscribed","bounced","pending"]).describe("Channel subscription status enumeration");

/**
 * Role enumeration for account membership
 * Zod schema for the "UserRole" union
 */
export const UserRoleSchema=z.enum(["admin","standard","guest"]).describe("Role enumeration for account membership");

/**
 * Zod schema for the "Account" interface
 * @table account
 * @schema public
 */
export const AccountSchema=z.object({
    id:z.string().describe("Unique id of the account"),
    created_at:z.string().describe("When the account was created"),
    name:z.string().describe("Display name of the account"),
    logo_image_path:z.string().optional().describe("Path to the logo image in the 'accounts' bucket"),
    hero_image_path:z.string().optional().describe("Optional hero/cover image path for the account in the 'accounts' bucket"),
}).describe("An account (tenant)");

/**
 * Zod schema for the "Account_insert" interface
 * @insertFor Account
 * @table account
 * @schema public
 */
export const Account_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    name:z.string(),
    logo_image_path:z.string().optional(),
    hero_image_path:z.string().optional(),
});

/**
 * Zod schema for the "AccountInvite" interface
 * @table account_invite
 * @schema public
 */
export const AccountInviteSchema=z.object({
    id:z.string().describe("Unique id of the invite"),
    created_at:z.string().describe("When the invite was created"),
    account_id:z.string().describe("The account this invite is for"),
    invited_by_user_id:z.string().optional().describe("The user who created the invite"),
    email:z.string().optional().describe("Optional email address the invite targets"),
    role:z.string().describe("The role granted if the invite is accepted"),
    invite_code:z.string().describe("The unique invite code part used in the invite URL"),
    accepted_at:z.string().optional().describe("When the invite was accepted"),
    declined_at:z.string().optional().describe("When the invite was declined"),
    expires_at:z.string().optional().describe("When the invite expires"),
    is_active:z.boolean().describe("If true, the invite is currently active/valid"),
}).describe("An invitation to join an account");

/**
 * Zod schema for the "AccountInvite_insert" interface
 * @insertFor AccountInvite
 * @table account_invite
 * @schema public
 */
export const AccountInvite_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    account_id:z.string(),
    invited_by_user_id:z.string().optional(),
    email:z.string().optional(),
    role:z.string().optional(),
    invite_code:z.string(),
    accepted_at:z.string().optional(),
    declined_at:z.string().optional(),
    expires_at:z.string().optional(),
    is_active:z.boolean().optional(),
});

/**
 * Zod schema for the "AccountMembership" interface
 * @table account_membership
 * @schema public
 */
export const AccountMembershipSchema=z.object({
    id:z.string().describe("Unique id of the membership"),
    created_at:z.string().describe("When the membership was created"),
    last_accessed_at:z.string().optional().describe("When the member last accessed the account"),
    user_id:z.string().describe("The user this membership is for"),
    account_id:z.string().describe("The account this membership belongs to"),
    role:z.string().describe("The role of the user within this account"),
}).describe("A membership linking a user to an account with a role");

/**
 * Zod schema for the "AccountMembership_insert" interface
 * @insertFor AccountMembership
 * @table account_membership
 * @schema public
 */
export const AccountMembership_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    last_accessed_at:z.string().optional(),
    user_id:z.string(),
    account_id:z.string(),
    role:z.string().optional(),
});

/**
 * Zod schema for the "Agent" interface
 * @table agent
 * @schema public
 */
export const AgentSchema=z.object({
    id:z.string().describe("Unique id of the agent"),
    created_at:z.string().describe("When the agent was created"),
    account_id:z.string().describe("The account this agent belongs to"),
    name:z.string().describe("Display name of the agent"),
    default_email_from:z.string().optional().describe("Default email address for sending (from)"),
    default_sms_from:z.string().optional().describe("Default SMS phone number for sending (from)"),
    segment_id:z.string().describe("The segment targeted by this agent"),
    holdout_percentage:z.number().describe("The holdout percentage for control group (0-100)"),
    message_category_id:z.string().describe("The message category (content library) assigned to this agent"),
    send_frequency:z.string().describe("Sending frequency"),
    send_days:z.number().int().array().describe("Days of week allowed (0=Mon ... 6=Sun)"),
    send_time_windows:z.string().array().describe("Time windows allowed for sending"),
    is_active:z.boolean().describe("If true, the agent is active"),
    activated_at:z.string().optional().describe("When the agent was activated"),
    deactivated_at:z.string().optional().describe("When the agent was deactivated"),
    desired_outcome_description:z.string().optional().describe("Optional description of desired outcomes/goals"),
}).describe("An AI decisioning agent configuration");

/**
 * Zod schema for the "Agent_insert" interface
 * @insertFor Agent
 * @table agent
 * @schema public
 */
export const Agent_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    account_id:z.string(),
    name:z.string(),
    default_email_from:z.string().optional(),
    default_sms_from:z.string().optional(),
    segment_id:z.string(),
    holdout_percentage:z.number().optional(),
    message_category_id:z.string(),
    send_frequency:z.string(),
    send_days:z.number().int().optional().array(),
    send_time_windows:z.string().optional().array(),
    is_active:z.boolean().optional(),
    activated_at:z.string().optional(),
    deactivated_at:z.string().optional(),
    desired_outcome_description:z.string().optional(),
});

/**
 * Zod schema for the "AgentDecision" interface
 * @table agent_decision
 * @schema public
 */
export const AgentDecisionSchema=z.object({
    id:z.string().describe("Unique id of the decision"),
    created_at:z.string().describe("When the decision was recorded"),
    decisioned_at:z.string().describe("When the decision was made"),
    account_id:z.string().describe("The account this decision belongs to"),
    agent_id:z.string().describe("The agent that made the decision"),
    profile_id:z.string().describe("The profile targeted by the decision"),
    message_id:z.string().optional().describe("The selected message (if any)"),
    message_variant_id:z.string().optional().describe("The selected message variant (if any)"),
    channel:z.string().optional().describe("The chosen channel for sending"),
    scheduled_send_at:z.string().optional().describe("The chosen scheduled send time"),
    reasoning:z.string().optional().describe("Concise reasoning for the decision"),
    is_holdout:z.boolean().describe("True if the profile was in the holdout group and no send should occur"),
    was_sent:z.boolean().optional().describe("True if a send occurred for this decision"),
    sent_at:z.string().optional().describe("When the send occurred (if sent)"),
    send_error:z.string().optional().describe("Optional error information if sending failed"),
}).describe("A recorded decision made by an agent");

/**
 * Zod schema for the "AgentDecision_insert" interface
 * @insertFor AgentDecision
 * @table agent_decision
 * @schema public
 */
export const AgentDecision_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    decisioned_at:z.string().optional(),
    account_id:z.string(),
    agent_id:z.string(),
    profile_id:z.string(),
    message_id:z.string().optional(),
    message_variant_id:z.string().optional(),
    channel:z.string().optional(),
    scheduled_send_at:z.string().optional(),
    reasoning:z.string().optional(),
    is_holdout:z.boolean().optional(),
    was_sent:z.boolean().optional(),
    sent_at:z.string().optional(),
    send_error:z.string().optional(),
});

/**
 * Zod schema for the "ChannelSubscription" interface
 * @table channel_subscription
 * @schema public
 */
export const ChannelSubscriptionSchema=z.object({
    id:z.string().describe("Unique id of the subscription"),
    created_at:z.string().describe("When the subscription record was created"),
    account_id:z.string().describe("The account this subscription belongs to"),
    profile_id:z.string().describe("The profile this subscription belongs to"),
    channel:z.string().describe("The channel for the subscription"),
    status:z.string().describe("Status of the subscription"),
    address:z.string().optional().describe("Target address/identifier for the channel (email address, phone, or device token)"),
    subscribed_at:z.string().optional().describe("When the subscription was established"),
    unsubscribed_at:z.string().optional().describe("When the subscription was terminated"),
    last_bounced_at:z.string().optional().describe("When the last bounce occurred (if any)"),
    is_primary:z.boolean().describe("If true, this is the primary subscription for the channel"),
}).describe("Channel subscription per profile and channel");

/**
 * Zod schema for the "ChannelSubscription_insert" interface
 * @insertFor ChannelSubscription
 * @table channel_subscription
 * @schema public
 */
export const ChannelSubscription_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    account_id:z.string(),
    profile_id:z.string(),
    channel:z.string(),
    status:z.string().optional(),
    address:z.string().optional(),
    subscribed_at:z.string().optional(),
    unsubscribed_at:z.string().optional(),
    last_bounced_at:z.string().optional(),
    is_primary:z.boolean().optional(),
});

/**
 * Zod schema for the "Event" interface
 * @table event
 * @schema public
 */
export const EventSchema=z.object({
    id:z.string().describe("Unique id of the event"),
    created_at:z.string().describe("When the event row was created"),
    occurred_at:z.string().describe("When the event occurred"),
    account_id:z.string().describe("The account this event belongs to"),
    profile_id:z.string().optional().describe("The profile associated with the event (if known)"),
    event_type:z.string().describe("Type of event"),
    channel:z.string().optional().describe("Channel associated with the event (if applicable)"),
    message_id:z.string().optional().describe("Message associated with the event (if applicable)"),
    agent_id:z.string().optional().describe("Agent associated with the event (if applicable)"),
    session_id:z.string().optional().describe("Session identifier for web analytics"),
    page_url:z.string().optional().describe("Page URL for page-related events"),
    product_id:z.string().optional().describe("Product identifier for ecommerce events"),
    order_id:z.string().optional().describe("Order identifier for purchase/checkout events"),
    revenue:z.number().optional().describe("Monetary revenue amount for purchase/attribution"),
    currency:z.string().optional().describe("Currency code (ISO 4217)"),
    properties:z.record(z.string(),z.any()).describe("Additional event properties and metadata"),
}).describe("An analytics/event record used for web, messaging, ecommerce, and attribution");

/**
 * Zod schema for the "Event_insert" interface
 * @insertFor Event
 * @table event
 * @schema public
 */
export const Event_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    occurred_at:z.string(),
    account_id:z.string(),
    profile_id:z.string().optional(),
    event_type:z.string(),
    channel:z.string().optional(),
    message_id:z.string().optional(),
    agent_id:z.string().optional(),
    session_id:z.string().optional(),
    page_url:z.string().optional(),
    product_id:z.string().optional(),
    order_id:z.string().optional(),
    revenue:z.number().optional(),
    currency:z.string().optional(),
    properties:z.record(z.string(),z.any()).optional(),
});

/**
 * Zod schema for the "Message" interface
 * @table message
 * @schema public
 */
export const MessageSchema=z.object({
    id:z.string().describe("Unique id of the message"),
    created_at:z.string().describe("When the message was created (imported)"),
    account_id:z.string().describe("The account this message belongs to"),
    category_id:z.string().optional().describe("The category this message belongs to"),
    name:z.string().describe("Human-readable name of the message"),
    external_source:z.string().describe("External source name, e.g., 'gardeniq'"),
    external_id:z.string().optional().describe("External id for cross-system mapping"),
    tags:z.string().array().describe("Optional tags for organization"),
}).describe("A marketing message imported from an external source (e.g., GardenIQ)");

/**
 * Zod schema for the "Message_insert" interface
 * @insertFor Message
 * @table message
 * @schema public
 */
export const Message_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    account_id:z.string(),
    category_id:z.string().optional(),
    name:z.string(),
    external_source:z.string().optional(),
    external_id:z.string().optional(),
    tags:z.string().optional().array(),
});

/**
 * Zod schema for the "MessageCategory" interface
 * @table message_category
 * @schema public
 */
export const MessageCategorySchema=z.object({
    id:z.string().describe("Unique id of the message category"),
    created_at:z.string().describe("When the category was created"),
    account_id:z.string().describe("The account this category belongs to"),
    name:z.string().describe("Name of the category"),
    description:z.string().optional().describe("Optional description of the category"),
    thumbnail_image_path:z.string().optional().describe("Optional preview/thumbnail image path in the 'accounts' bucket"),
}).describe("A message category (content library/folder)");

/**
 * Zod schema for the "MessageCategory_insert" interface
 * @insertFor MessageCategory
 * @table message_category
 * @schema public
 */
export const MessageCategory_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    account_id:z.string(),
    name:z.string(),
    description:z.string().optional(),
    thumbnail_image_path:z.string().optional(),
});

/**
 * Zod schema for the "MessageVariant" interface
 * @table message_variant
 * @schema public
 */
export const MessageVariantSchema=z.object({
    id:z.string().describe("Unique id of the message variant"),
    created_at:z.string().describe("When the variant was created"),
    account_id:z.string().describe("The account this variant belongs to"),
    message_id:z.string().describe("The parent message"),
    channel:z.string().describe("Channel for this variant"),
    email_subject:z.string().optional().describe("Email subject (email channel)"),
    email_html:z.string().optional().describe("Email HTML content (email channel)"),
    email_text:z.string().optional().describe("Email plain text content (email channel)"),
    sms_text:z.string().optional().describe("SMS text (sms channel)"),
    push_title:z.string().optional().describe("Push notification title (push channel)"),
    push_body:z.string().optional().describe("Push notification body (push channel)"),
    preview_image_path:z.string().optional().describe("Optional preview image path in the 'accounts' bucket"),
}).describe("A message variant per channel (email, sms, push)");

/**
 * Zod schema for the "MessageVariant_insert" interface
 * @insertFor MessageVariant
 * @table message_variant
 * @schema public
 */
export const MessageVariant_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    account_id:z.string(),
    message_id:z.string(),
    channel:z.string(),
    email_subject:z.string().optional(),
    email_html:z.string().optional(),
    email_text:z.string().optional(),
    sms_text:z.string().optional(),
    push_title:z.string().optional(),
    push_body:z.string().optional(),
    preview_image_path:z.string().optional(),
});

/**
 * Zod schema for the "OutcomeMapping" interface
 * @table outcome_mapping
 * @schema public
 */
export const OutcomeMappingSchema=z.object({
    id:z.string().describe("Unique id of the outcome mapping"),
    created_at:z.string().describe("When the mapping was created"),
    account_id:z.string().describe("The account this mapping belongs to"),
    agent_id:z.string().describe("The agent this mapping belongs to"),
    event_type:z.string().describe("The event type being mapped"),
    outcome:z.string().describe("The outcome rank associated with the event"),
    weight:z.number().optional().describe("Optional weight or score for optimization"),
}).describe("Mapping from events to desired outcome ranks for an agent");

/**
 * Zod schema for the "OutcomeMapping_insert" interface
 * @insertFor OutcomeMapping
 * @table outcome_mapping
 * @schema public
 */
export const OutcomeMapping_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    account_id:z.string(),
    agent_id:z.string(),
    event_type:z.string(),
    outcome:z.string(),
    weight:z.number().optional(),
});

/**
 * Zod schema for the "Profile" interface
 * @table profile
 * @schema public
 */
export const ProfileSchema=z.object({
    id:z.string().describe("Unique id of the profile"),
    created_at:z.string().describe("When the profile was created"),
    account_id:z.string().describe("The account this profile belongs to"),
    first_name:z.string().optional().describe("First name"),
    last_name:z.string().optional().describe("Last name"),
    email:z.string().optional().describe("Email address"),
    phone:z.string().optional().describe("Phone number (E.164 suggested)"),
    device_id:z.string().optional().describe("Device identifier (for push/SDK correlation)"),
    address_street:z.string().optional().describe("Street address"),
    address_city:z.string().optional().describe("City"),
    address_state:z.string().optional().describe("State or region"),
    address_zip:z.string().optional().describe("Postal or ZIP code"),
    address_country:z.string().optional().describe("Country"),
    job_title:z.string().optional().describe("Optional job title"),
    department:z.string().optional().describe("Optional department"),
    company:z.string().optional().describe("Optional company name"),
    attributes:z.record(z.string(),z.any()).describe("Arbitrary attributes for CRM-like properties and enrichment payloads"),
    external_id:z.string().optional().describe("External system identifier (e.g., CRM ID)"),
}).describe("A stored customer profile");

/**
 * Zod schema for the "Profile_insert" interface
 * @insertFor Profile
 * @table profile
 * @schema public
 */
export const Profile_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    account_id:z.string(),
    first_name:z.string().optional(),
    last_name:z.string().optional(),
    email:z.string().optional(),
    phone:z.string().optional(),
    device_id:z.string().optional(),
    address_street:z.string().optional(),
    address_city:z.string().optional(),
    address_state:z.string().optional(),
    address_zip:z.string().optional(),
    address_country:z.string().optional(),
    job_title:z.string().optional(),
    department:z.string().optional(),
    company:z.string().optional(),
    attributes:z.record(z.string(),z.any()).optional(),
    external_id:z.string().optional(),
});

/**
 * Zod schema for the "Segment" interface
 * @table segment
 * @schema public
 */
export const SegmentSchema=z.object({
    id:z.string().describe("Unique id of the segment"),
    created_at:z.string().describe("When the segment was created"),
    account_id:z.string().describe("The account this segment belongs to"),
    name:z.string().describe("Name of the segment"),
    description:z.string().optional().describe("Description of the segment"),
    criteria:z.record(z.string(),z.any()).describe("Criteria used to define segment membership (demographics, behavior, etc.)"),
    is_dynamic:z.boolean().describe("If true, membership is dynamically evaluated; otherwise uses explicit membership"),
}).describe("A segment of profiles");

/**
 * Zod schema for the "Segment_insert" interface
 * @insertFor Segment
 * @table segment
 * @schema public
 */
export const Segment_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    account_id:z.string(),
    name:z.string(),
    description:z.string().optional(),
    criteria:z.record(z.string(),z.any()).optional(),
    is_dynamic:z.boolean().optional(),
});

/**
 * Zod schema for the "SegmentProfile" interface
 * @table segment_profile
 * @schema public
 */
export const SegmentProfileSchema=z.object({
    id:z.string().describe("Unique id of the segment-profile membership"),
    added_at:z.string().describe("When the profile was added to the segment"),
    account_id:z.string().describe("The account this membership belongs to"),
    segment_id:z.string().describe("The segment id"),
    profile_id:z.string().describe("The profile id"),
}).describe("Membership join between segment and profile");

/**
 * Zod schema for the "SegmentProfile_insert" interface
 * @insertFor SegmentProfile
 * @table segment_profile
 * @schema public
 */
export const SegmentProfile_insertSchema=z.object({
    id:z.string().optional(),
    added_at:z.string().optional(),
    account_id:z.string(),
    segment_id:z.string(),
    profile_id:z.string(),
});

/**
 * Zod schema for the "User" interface
 * @table user
 * @schema public
 */
export const UserSchema=z.object({
    id:z.string().describe("Unique id of the user"),
    created_at:z.string().describe("When the user row was created"),
    name:z.string().describe("Name of the user"),
    email:z.string().describe("Email of the user (used for identification within the app; auth handled by Supabase)"),
    profile_image_path:z.string().optional().describe("Path of the profile picture in the 'accounts' bucket using the pattern {account_id}/users/{user_id}/..."),
    hero_image_path:z.string().optional().describe("Optional hero/cover image path in the 'accounts' bucket"),
}).describe("A user");

/**
 * Zod schema for the "User_insert" interface
 * @insertFor User
 * @table user
 * @schema public
 */
export const User_insertSchema=z.object({
    id:z.string().optional(),
    created_at:z.string().optional(),
    name:z.string(),
    email:z.string(),
    profile_image_path:z.string().optional(),
    hero_image_path:z.string().optional(),
});