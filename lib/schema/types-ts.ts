/**
 * Communication channel enumeration
 */
export type Channel="email"|"sms"|"push";

/**
 * Event type enumeration for analytics and attribution
 */
export type EventType="page_view"|"session_start"|"form_submit"|"message_sent"|"message_open"|"message_click"|"message_bounce"|"subscriber_new"|"subscriber_removed"|"add_to_cart"|"favorite"|"checkout_started"|"checkout_abandoned"|"purchase"|"push_open";

/**
 * Outcome ranking enumeration
 */
export type OutcomeRank="worst"|"good"|"very_good"|"best";

/**
 * Sending frequency enumeration for agents
 */
export type SendFrequency="daily"|"six_per_week"|"five_per_week"|"weekly"|"biweekly"|"monthly";

/**
 * Time window enumeration for agents
 */
export type SendTimeWindow="morning"|"afternoon"|"evening";

/**
 * Channel subscription status enumeration
 */
export type SubscriptionStatus="subscribed"|"unsubscribed"|"bounced"|"pending";

/**
 * Role enumeration for account membership
 */
export type UserRole="admin"|"standard"|"guest";

/**
 * An account (tenant)
 * @table account
 * @schema public
 */
export interface Account
{
    /**
     * Unique id of the account
     */
    id:string;
    /**
     * When the account was created
     */
    created_at:string;
    /**
     * Display name of the account
     */
    name:string;
    /**
     * Path to the logo image in the 'accounts' bucket
     */
    logo_image_path?:string;
    /**
     * Optional hero/cover image path for the account in the 'accounts' bucket
     */
    hero_image_path?:string;
}

/**
 * @insertFor Account
 * @table account
 * @schema public
 */
export interface Account_insert
{
    id?:string;
    created_at?:string;
    name:string;
    logo_image_path?:string;
    hero_image_path?:string;
}

/**
 * An invitation to join an account
 * @table account_invite
 * @schema public
 */
export interface AccountInvite
{
    /**
     * Unique id of the invite
     */
    id:string;
    /**
     * When the invite was created
     */
    created_at:string;
    /**
     * The account this invite is for
     */
    account_id:string;
    /**
     * The user who created the invite
     */
    invited_by_user_id?:string;
    /**
     * Optional email address the invite targets
     */
    email?:string;
    /**
     * The role granted if the invite is accepted
     */
    role:string;
    /**
     * The unique invite code part used in the invite URL
     */
    invite_code:string;
    /**
     * When the invite was accepted
     */
    accepted_at?:string;
    /**
     * When the invite was declined
     */
    declined_at?:string;
    /**
     * When the invite expires
     */
    expires_at?:string;
    /**
     * If true, the invite is currently active/valid
     */
    is_active:boolean;
}

/**
 * @insertFor AccountInvite
 * @table account_invite
 * @schema public
 */
export interface AccountInvite_insert
{
    id?:string;
    created_at?:string;
    account_id:string;
    invited_by_user_id?:string;
    email?:string;
    role?:string;
    invite_code:string;
    accepted_at?:string;
    declined_at?:string;
    expires_at?:string;
    is_active?:boolean;
}

/**
 * A membership linking a user to an account with a role
 * @table account_membership
 * @schema public
 */
export interface AccountMembership
{
    /**
     * Unique id of the membership
     */
    id:string;
    /**
     * When the membership was created
     */
    created_at:string;
    /**
     * When the member last accessed the account
     */
    last_accessed_at?:string;
    /**
     * The user this membership is for
     */
    user_id:string;
    /**
     * The account this membership belongs to
     */
    account_id:string;
    /**
     * The role of the user within this account
     */
    role:string;
}

/**
 * @insertFor AccountMembership
 * @table account_membership
 * @schema public
 */
export interface AccountMembership_insert
{
    id?:string;
    created_at?:string;
    last_accessed_at?:string;
    user_id:string;
    account_id:string;
    role?:string;
}

/**
 * An AI decisioning agent configuration
 * @table agent
 * @schema public
 */
export interface Agent
{
    /**
     * Unique id of the agent
     */
    id:string;
    /**
     * When the agent was created
     */
    created_at:string;
    /**
     * The account this agent belongs to
     */
    account_id:string;
    /**
     * Display name of the agent
     */
    name:string;
    /**
     * Default email address for sending (from)
     */
    default_email_from?:string;
    /**
     * Default SMS phone number for sending (from)
     */
    default_sms_from?:string;
    /**
     * The segment targeted by this agent
     */
    segment_id:string;
    /**
     * The holdout percentage for control group (0-100)
     */
    holdout_percentage:number;
    /**
     * The message category (content library) assigned to this agent
     */
    message_category_id:string;
    /**
     * Sending frequency
     */
    send_frequency:string;
    /**
     * Days of week allowed (0=Mon ... 6=Sun)
     */
    send_days:number[];
    /**
     * Time windows allowed for sending
     */
    send_time_windows:string[];
    /**
     * If true, the agent is active
     */
    is_active:boolean;
    /**
     * When the agent was activated
     */
    activated_at?:string;
    /**
     * When the agent was deactivated
     */
    deactivated_at?:string;
    /**
     * Optional description of desired outcomes/goals
     */
    desired_outcome_description?:string;
}

/**
 * @insertFor Agent
 * @table agent
 * @schema public
 */
export interface Agent_insert
{
    id?:string;
    created_at?:string;
    account_id:string;
    name:string;
    default_email_from?:string;
    default_sms_from?:string;
    segment_id:string;
    holdout_percentage?:number;
    message_category_id:string;
    send_frequency:string;
    send_days?:number[];
    send_time_windows?:string[];
    is_active?:boolean;
    activated_at?:string;
    deactivated_at?:string;
    desired_outcome_description?:string;
}

/**
 * A recorded decision made by an agent
 * @table agent_decision
 * @schema public
 */
export interface AgentDecision
{
    /**
     * Unique id of the decision
     */
    id:string;
    /**
     * When the decision was recorded
     */
    created_at:string;
    /**
     * When the decision was made
     */
    decisioned_at:string;
    /**
     * The account this decision belongs to
     */
    account_id:string;
    /**
     * The agent that made the decision
     */
    agent_id:string;
    /**
     * The profile targeted by the decision
     */
    profile_id:string;
    /**
     * The selected message (if any)
     */
    message_id?:string;
    /**
     * The selected message variant (if any)
     */
    message_variant_id?:string;
    /**
     * The chosen channel for sending
     */
    channel?:string;
    /**
     * The chosen scheduled send time
     */
    scheduled_send_at?:string;
    /**
     * Concise reasoning for the decision
     */
    reasoning?:string;
    /**
     * True if the profile was in the holdout group and no send should occur
     */
    is_holdout:boolean;
    /**
     * True if a send occurred for this decision
     */
    was_sent?:boolean;
    /**
     * When the send occurred (if sent)
     */
    sent_at?:string;
    /**
     * Optional error information if sending failed
     */
    send_error?:string;
}

/**
 * @insertFor AgentDecision
 * @table agent_decision
 * @schema public
 */
export interface AgentDecision_insert
{
    id?:string;
    created_at?:string;
    decisioned_at?:string;
    account_id:string;
    agent_id:string;
    profile_id:string;
    message_id?:string;
    message_variant_id?:string;
    channel?:string;
    scheduled_send_at?:string;
    reasoning?:string;
    is_holdout?:boolean;
    was_sent?:boolean;
    sent_at?:string;
    send_error?:string;
}

/**
 * Channel subscription per profile and channel
 * @table channel_subscription
 * @schema public
 */
export interface ChannelSubscription
{
    /**
     * Unique id of the subscription
     */
    id:string;
    /**
     * When the subscription record was created
     */
    created_at:string;
    /**
     * The account this subscription belongs to
     */
    account_id:string;
    /**
     * The profile this subscription belongs to
     */
    profile_id:string;
    /**
     * The channel for the subscription
     */
    channel:string;
    /**
     * Status of the subscription
     */
    status:string;
    /**
     * Target address/identifier for the channel (email address, phone, or device token)
     */
    address?:string;
    /**
     * When the subscription was established
     */
    subscribed_at?:string;
    /**
     * When the subscription was terminated
     */
    unsubscribed_at?:string;
    /**
     * When the last bounce occurred (if any)
     */
    last_bounced_at?:string;
    /**
     * If true, this is the primary subscription for the channel
     */
    is_primary:boolean;
}

/**
 * @insertFor ChannelSubscription
 * @table channel_subscription
 * @schema public
 */
export interface ChannelSubscription_insert
{
    id?:string;
    created_at?:string;
    account_id:string;
    profile_id:string;
    channel:string;
    status?:string;
    address?:string;
    subscribed_at?:string;
    unsubscribed_at?:string;
    last_bounced_at?:string;
    is_primary?:boolean;
}

/**
 * An analytics/event record used for web, messaging, ecommerce, and attribution
 * @table event
 * @schema public
 */
export interface Event
{
    /**
     * Unique id of the event
     */
    id:string;
    /**
     * When the event row was created
     */
    created_at:string;
    /**
     * When the event occurred
     */
    occurred_at:string;
    /**
     * The account this event belongs to
     */
    account_id:string;
    /**
     * The profile associated with the event (if known)
     */
    profile_id?:string;
    /**
     * Type of event
     */
    event_type:string;
    /**
     * Channel associated with the event (if applicable)
     */
    channel?:string;
    /**
     * Message associated with the event (if applicable)
     */
    message_id?:string;
    /**
     * Agent associated with the event (if applicable)
     */
    agent_id?:string;
    /**
     * Session identifier for web analytics
     */
    session_id?:string;
    /**
     * Page URL for page-related events
     */
    page_url?:string;
    /**
     * Product identifier for ecommerce events
     */
    product_id?:string;
    /**
     * Order identifier for purchase/checkout events
     */
    order_id?:string;
    /**
     * Monetary revenue amount for purchase/attribution
     */
    revenue?:number;
    /**
     * Currency code (ISO 4217)
     */
    currency?:string;
    /**
     * Additional event properties and metadata
     */
    properties:Record<string,any>;
}

/**
 * @insertFor Event
 * @table event
 * @schema public
 */
export interface Event_insert
{
    id?:string;
    created_at?:string;
    occurred_at:string;
    account_id:string;
    profile_id?:string;
    event_type:string;
    channel?:string;
    message_id?:string;
    agent_id?:string;
    session_id?:string;
    page_url?:string;
    product_id?:string;
    order_id?:string;
    revenue?:number;
    currency?:string;
    properties?:Record<string,any>;
}

/**
 * A marketing message imported from an external source (e.g., GardenIQ)
 * @table message
 * @schema public
 */
export interface Message
{
    /**
     * Unique id of the message
     */
    id:string;
    /**
     * When the message was created (imported)
     */
    created_at:string;
    /**
     * The account this message belongs to
     */
    account_id:string;
    /**
     * The category this message belongs to
     */
    category_id?:string;
    /**
     * Human-readable name of the message
     */
    name:string;
    /**
     * External source name, e.g., 'gardeniq'
     */
    external_source:string;
    /**
     * External id for cross-system mapping
     */
    external_id?:string;
    /**
     * Optional tags for organization
     */
    tags:string[];
}

/**
 * @insertFor Message
 * @table message
 * @schema public
 */
export interface Message_insert
{
    id?:string;
    created_at?:string;
    account_id:string;
    category_id?:string;
    name:string;
    external_source?:string;
    external_id?:string;
    tags?:string[];
}

/**
 * A message category (content library/folder)
 * @table message_category
 * @schema public
 */
export interface MessageCategory
{
    /**
     * Unique id of the message category
     */
    id:string;
    /**
     * When the category was created
     */
    created_at:string;
    /**
     * The account this category belongs to
     */
    account_id:string;
    /**
     * Name of the category
     */
    name:string;
    /**
     * Optional description of the category
     */
    description?:string;
    /**
     * Optional preview/thumbnail image path in the 'accounts' bucket
     */
    thumbnail_image_path?:string;
}

/**
 * @insertFor MessageCategory
 * @table message_category
 * @schema public
 */
export interface MessageCategory_insert
{
    id?:string;
    created_at?:string;
    account_id:string;
    name:string;
    description?:string;
    thumbnail_image_path?:string;
}

/**
 * A message variant per channel (email, sms, push)
 * @table message_variant
 * @schema public
 */
export interface MessageVariant
{
    /**
     * Unique id of the message variant
     */
    id:string;
    /**
     * When the variant was created
     */
    created_at:string;
    /**
     * The account this variant belongs to
     */
    account_id:string;
    /**
     * The parent message
     */
    message_id:string;
    /**
     * Channel for this variant
     */
    channel:string;
    /**
     * Email subject (email channel)
     */
    email_subject?:string;
    /**
     * Email HTML content (email channel)
     */
    email_html?:string;
    /**
     * Email plain text content (email channel)
     */
    email_text?:string;
    /**
     * SMS text (sms channel)
     */
    sms_text?:string;
    /**
     * Push notification title (push channel)
     */
    push_title?:string;
    /**
     * Push notification body (push channel)
     */
    push_body?:string;
    /**
     * Optional preview image path in the 'accounts' bucket
     */
    preview_image_path?:string;
}

/**
 * @insertFor MessageVariant
 * @table message_variant
 * @schema public
 */
export interface MessageVariant_insert
{
    id?:string;
    created_at?:string;
    account_id:string;
    message_id:string;
    channel:string;
    email_subject?:string;
    email_html?:string;
    email_text?:string;
    sms_text?:string;
    push_title?:string;
    push_body?:string;
    preview_image_path?:string;
}

/**
 * Mapping from events to desired outcome ranks for an agent
 * @table outcome_mapping
 * @schema public
 */
export interface OutcomeMapping
{
    /**
     * Unique id of the outcome mapping
     */
    id:string;
    /**
     * When the mapping was created
     */
    created_at:string;
    /**
     * The account this mapping belongs to
     */
    account_id:string;
    /**
     * The agent this mapping belongs to
     */
    agent_id:string;
    /**
     * The event type being mapped
     */
    event_type:string;
    /**
     * The outcome rank associated with the event
     */
    outcome:string;
    /**
     * Optional weight or score for optimization
     */
    weight?:number;
}

/**
 * @insertFor OutcomeMapping
 * @table outcome_mapping
 * @schema public
 */
export interface OutcomeMapping_insert
{
    id?:string;
    created_at?:string;
    account_id:string;
    agent_id:string;
    event_type:string;
    outcome:string;
    weight?:number;
}

/**
 * A stored customer profile
 * @table profile
 * @schema public
 */
export interface Profile
{
    /**
     * Unique id of the profile
     */
    id:string;
    /**
     * When the profile was created
     */
    created_at:string;
    /**
     * The account this profile belongs to
     */
    account_id:string;
    /**
     * First name
     */
    first_name?:string;
    /**
     * Last name
     */
    last_name?:string;
    /**
     * Email address
     */
    email?:string;
    /**
     * Phone number (E.164 suggested)
     */
    phone?:string;
    /**
     * Device identifier (for push/SDK correlation)
     */
    device_id?:string;
    /**
     * Street address
     */
    address_street?:string;
    /**
     * City
     */
    address_city?:string;
    /**
     * State or region
     */
    address_state?:string;
    /**
     * Postal or ZIP code
     */
    address_zip?:string;
    /**
     * Country
     */
    address_country?:string;
    /**
     * Optional job title
     */
    job_title?:string;
    /**
     * Optional department
     */
    department?:string;
    /**
     * Optional company name
     */
    company?:string;
    /**
     * Arbitrary attributes for CRM-like properties and enrichment payloads
     */
    attributes:Record<string,any>;
    /**
     * External system identifier (e.g., CRM ID)
     */
    external_id?:string;
}

/**
 * @insertFor Profile
 * @table profile
 * @schema public
 */
export interface Profile_insert
{
    id?:string;
    created_at?:string;
    account_id:string;
    first_name?:string;
    last_name?:string;
    email?:string;
    phone?:string;
    device_id?:string;
    address_street?:string;
    address_city?:string;
    address_state?:string;
    address_zip?:string;
    address_country?:string;
    job_title?:string;
    department?:string;
    company?:string;
    attributes?:Record<string,any>;
    external_id?:string;
}

/**
 * A segment of profiles
 * @table segment
 * @schema public
 */
export interface Segment
{
    /**
     * Unique id of the segment
     */
    id:string;
    /**
     * When the segment was created
     */
    created_at:string;
    /**
     * The account this segment belongs to
     */
    account_id:string;
    /**
     * Name of the segment
     */
    name:string;
    /**
     * Description of the segment
     */
    description?:string;
    /**
     * Criteria used to define segment membership (demographics, behavior, etc.)
     */
    criteria:Record<string,any>;
    /**
     * If true, membership is dynamically evaluated; otherwise uses explicit membership
     */
    is_dynamic:boolean;
}

/**
 * @insertFor Segment
 * @table segment
 * @schema public
 */
export interface Segment_insert
{
    id?:string;
    created_at?:string;
    account_id:string;
    name:string;
    description?:string;
    criteria?:Record<string,any>;
    is_dynamic?:boolean;
}

/**
 * Membership join between segment and profile
 * @table segment_profile
 * @schema public
 */
export interface SegmentProfile
{
    /**
     * Unique id of the segment-profile membership
     */
    id:string;
    /**
     * When the profile was added to the segment
     */
    added_at:string;
    /**
     * The account this membership belongs to
     */
    account_id:string;
    /**
     * The segment id
     */
    segment_id:string;
    /**
     * The profile id
     */
    profile_id:string;
}

/**
 * @insertFor SegmentProfile
 * @table segment_profile
 * @schema public
 */
export interface SegmentProfile_insert
{
    id?:string;
    added_at?:string;
    account_id:string;
    segment_id:string;
    profile_id:string;
}

/**
 * A user
 * @table user
 * @schema public
 */
export interface User
{
    /**
     * Unique id of the user
     */
    id:string;
    /**
     * When the user row was created
     */
    created_at:string;
    /**
     * Name of the user
     */
    name:string;
    /**
     * Email of the user (used for identification within the app; auth handled by Supabase)
     */
    email:string;
    /**
     * Path of the profile picture in the 'accounts' bucket using the pattern {account_id}/users/{user_id}/...
     */
    profile_image_path?:string;
    /**
     * Optional hero/cover image path in the 'accounts' bucket
     */
    hero_image_path?:string;
}

/**
 * @insertFor User
 * @table user
 * @schema public
 */
export interface User_insert
{
    id?:string;
    created_at?:string;
    name:string;
    email:string;
    profile_image_path?:string;
    hero_image_path?:string;
}