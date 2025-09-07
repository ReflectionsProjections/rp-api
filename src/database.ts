import { createClient } from "@supabase/supabase-js";
import { Database, Enums } from "./database.types";

export const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

export const SupabaseDB = {
    get AUTH_INFO() {
        return supabase.from("authInfo");
    },
    get AUTH_ROLES() {
        return supabase.from("authRoles");
    },
    get AUTH_CODES() {
        return supabase.from("authCodes");
    },
    get CORPORATE() {
        return supabase.from("corporate");
    },
    get STAFF() {
        return supabase.from("staff");
    },
    get MEETINGS() {
        return supabase.from("meetings");
    },
    get DRAFT_REGISTRATIONS() {
        return supabase.from("draftRegistrations");
    },
    get SPEAKERS() {
        return supabase.from("speakers");
    },
    get ATTENDEES() {
        return supabase.from("attendees");
    },
    get EVENTS() {
        return supabase.from("events");
    },
    get EVENT_ATTENDANCES() {
        return supabase.from("eventAttendances");
    },
    get ATTENDEE_ATTENDANCES() {
        return supabase.from("attendeeAttendances");
    },
    get REGISTRATIONS() {
        return supabase.from("registrations");
    },
    get SUBSCRIPTIONS() {
        return supabase.from("subscriptions");
    },
    get LEADERBOARD_SUBMISSIONS() {
        return supabase.from("leaderboardSubmissions");
    },
    get NOTIFICATIONS() {
        return supabase.from("notifications");
    },
    get CUSTOM_TOPICS() {
        return supabase.from("customTopics");
    },
    get REDEMPTIONS() {
        return supabase.from("redemptions");
    },
};

// Common type exports for consistency across the application
export type TierType = Enums<"tierType">;
export type IconColorType = Enums<"iconColorType">;
export type RoleType = Enums<"roleType">;
export type CommitteeType = Enums<"committeeNames">;
export type EventType = Enums<"eventType">;
export type StaffAttendanceType = Enums<"staffAttendanceType">;

export const RoleTypes: Record<RoleType, RoleType> = {
    USER: "USER",
    STAFF: "STAFF",
    ADMIN: "ADMIN",
    CORPORATE: "CORPORATE",
};

export const CommitteeTypes: Record<string, CommitteeType> = {
    CONTENT: "CONTENT",
    CORPORATE: "CORPORATE",
    DESIGN: "DESIGN",
    DEV: "DEV",
    ["FULL TEAM"]: "FULL TEAM",
    MARKETING: "MARKETING",
    OPERATIONS: "OPERATIONS",
};

export const TierTypes: Record<TierType, TierType> = {
    TIER1: "TIER1",
    TIER2: "TIER2",
    TIER3: "TIER3",
    TIER4: "TIER4",
};

export const IconColorTypes: Record<IconColorType, IconColorType> = {
    BLUE: "BLUE",
    RED: "RED",
    GREEN: "GREEN",
    PINK: "PINK",
    PURPLE: "PURPLE",
    ORANGE: "ORANGE",
};
