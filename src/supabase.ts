import { createClient } from "@supabase/supabase-js";
import { Database } from "./supabase.types";

export const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

export const SupabaseDB = {
    get AUTH_INFO() {
        return supabase.from("authInfo");
    },
    get AUTH_ROLES() {
        return supabase.from("authRoles");
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

export const RoleTypes: Record<
    string,
    Database["public"]["Enums"]["role_type"]
> = {
    USER: "USER",
    STAFF: "STAFF",
    ADMIN: "ADMIN",
    CORPORATE: "CORPORATE",
    PUZZLEBANG: "PUZZLEBANG",
};

export const CommitteeTypes: Record<
    string,
    Database["public"]["Enums"]["committee_names"]
> = {
    CONTENT: "CONTENT",
    CORPORATE: "CORPORATE",
    DESIGN: "DESIGN",
    DEV: "DEV",
    FULLTEAM: "FULL TEAM",
    MARKETING: "MARKETING",
    OPERATIONS: "OPERATIONS",
};

export interface User {
    userId: string;
    points: number;
    favoriteEvents: string[];
    puzzlesCompleted: string[];
    hasPriorityMon: boolean;
    hasPriorityTue: boolean;
    hasPriorityWed: boolean;
    hasPriorityThu: boolean;
    hasPriorityFri: boolean;
    hasPrioritySat: boolean;
    hasPrioritySun: boolean;
    isEligibleTshirt: boolean;
    isEligibleCap: boolean;
    isEligibleTote: boolean;
    isEligibleButton: boolean;
    hasRedeemedTshirt: boolean;
    hasRedeemedCap: boolean;
    hasRedeemedTote: boolean;
    hasRedeemedButton: boolean;
}
