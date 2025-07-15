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
        return supabase.from("event_attendance");
    },
    get ATTENDEE_ATTENDANCE() {
        return supabase.from("attendee_attendance");
    },
    get REGISTRATIONS() {
        return supabase.from("registrations");
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
    user_id: string;
    points: number;
    favorite_events: string[];
    puzzles_completed: string[];
    has_priority_mon: boolean;
    has_priority_tue: boolean;
    has_priority_wed: boolean;
    has_priority_thu: boolean;
    has_priority_fri: boolean;
    has_priority_sat: boolean;
    has_priority_sun: boolean;
    is_eligible_tshirt: boolean;
    is_eligible_cap: boolean;
    is_eligible_tote: boolean;
    is_eligible_button: boolean;
    has_redeemed_tshirt: boolean;
    has_redeemed_cap: boolean;
    has_redeemed_tote: boolean;
    has_redeemed_button: boolean;
}
