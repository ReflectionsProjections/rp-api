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
    get NOTIFICATIONS() {
        return supabase.from("notifications");
    },
    get CUSTOM_TOPICS() {
        return supabase.from("customTopics");
    },
};

export const RoleTypes: Record<
    string,
    Database["public"]["Enums"]["roleType"]
> = {
    USER: "USER",
    STAFF: "STAFF",
    ADMIN: "ADMIN",
    CORPORATE: "CORPORATE",
    PUZZLEBANG: "PUZZLEBANG",
};

export const CommitteeTypes: Record<
    string,
    Database["public"]["Enums"]["committeeNames"]
> = {
    CONTENT: "CONTENT",
    CORPORATE: "CORPORATE",
    DESIGN: "DESIGN",
    DEV: "DEV",
    FULLTEAM: "FULL TEAM",
    MARKETING: "MARKETING",
    OPERATIONS: "OPERATIONS",
};
