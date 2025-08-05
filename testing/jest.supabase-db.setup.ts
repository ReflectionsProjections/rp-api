import { clearSupabaseTables } from "./testingTools";
import { afterEach, jest, beforeAll } from "@jest/globals";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient;

function mockSupabase(supabaseUrl: string, supabaseAnonKey: string) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);

    if (!supabase) {
        throw new Error("Failed to create test Supabase client");
    }

    jest.mock("../src/supabase", () => {
        return {
            supabase: supabase,
            SupabaseDB: {
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
                get EVENT_ATTENDANCES() {
                    return supabase.from("eventAttendances");
                },
                get ATTENDEE_ATTENDANCES() {
                    return supabase.from("attendeeAttendances");
                },
                get REGISTRATIONS() {
                    return supabase.from("registrations");
                },
            },
            __esModule: true,
        };
    });

    (globalThis as typeof globalThis & { supabase: SupabaseClient }).supabase =
        supabase;
}

beforeAll(async () => {
    mockSupabase(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
});

afterEach(async () => {
    await clearSupabaseTables(supabase);
});
