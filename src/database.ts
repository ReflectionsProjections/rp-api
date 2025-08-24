import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

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
};

// Common type exports for consistency across the application
export type TierType = Database["public"]["Enums"]["tierType"];
export type IconColorType = Database["public"]["Enums"]["iconColorType"];
export type RoleType = Database["public"]["Enums"]["roleType"];
export type CommitteeType = Database["public"]["Enums"]["committeeNames"];
export type EventType = Database["public"]["Enums"]["eventType"];
export type StaffAttendanceType =
    Database["public"]["Enums"]["staffAttendanceType"];

export const RoleTypes: Record<RoleType, RoleType> = {
    USER: "USER",
    STAFF: "STAFF",
    ADMIN: "ADMIN",
    CORPORATE: "CORPORATE",
    PUZZLEBANG: "PUZZLEBANG",
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
};

export const IconColorTypes: Record<IconColorType, IconColorType> = {
    BLUE: "BLUE",
    RED: "RED",
    GREEN: "GREEN",
    YELLOW: "YELLOW",
    PINK: "PINK",
    BLACK: "BLACK",
    PURPLE: "PURPLE",
    ORANGE: "ORANGE",
};
