import { createClient } from "@supabase/supabase-js";
import { Database } from "./supabase.types";

const supabase = createClient<Database>(
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
