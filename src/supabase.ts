import { createClient } from "@supabase/supabase-js";
import { Database } from "./supabase.types";

export const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

export const SupabaseDB = {
    get ROLES() {
        return supabase.from("roles");
    },
    get STAFF() {
        return supabase.from("staff");
    },
    get MEETINGS() {
        return supabase.from("meetings");
    },
    get ATTENDEES() {
        return supabase.from("attendees");
    },
    get EVENTS() {
        return supabase.from("events");
    },
    get EVENT_ATTENDANCE() {
        return supabase.from("eventAttendance");
    },
    get ATTENDEE_ATTENDANCE() {
        return supabase.from("attendeeAttendance");
    },
    get REGISTRATIONS() {
        return supabase.from("registrations");
    },
    get NOTIFICATIONS() {
        return supabase.from("notifications");
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
