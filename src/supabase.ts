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
