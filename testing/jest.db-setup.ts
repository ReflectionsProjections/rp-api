import { clearSupabaseTables } from "./testingTools";
import { afterEach, jest, beforeAll } from "@jest/globals";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient;

function mockSupabase(supabaseUrl: string, supabaseServiceKey: string) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!supabase) {
        throw new Error("Failed to create test Supabase client");
    }

    jest.mock("../src/database", () => {
        return {
            supabase: supabase,
            SupabaseDB: {
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

                get SPEAKERS() {
                    return supabase.from("speakers");
                },

                get SUBSCRIPTIONS() {
                    return supabase.from("subscriptions");
                },
                get SHIFTS() {
                    return supabase.from("shifts");
                },
                get SHIFT_ASSIGNMENTS() {
                    return supabase.from("shiftAssignments");
                },
                get CUSTOM_TOPICS() {
                    return supabase.from("customTopics");
                },
                get NOTIFICATIONS() {
                    return supabase.from("notifications");
                },
                get REDEMPTIONS() {
                    return supabase.from("redemptions");
                },
                get LEADERBOARD_SUBMISSIONS() {
                    return supabase.from("leaderboardSubmissions");
                },
            },
            __esModule: true,
        };
    });

    (globalThis as typeof globalThis & { supabase: SupabaseClient }).supabase =
        supabase;
}

beforeAll(async () => {
    mockSupabase(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
});

afterEach(async () => {
    await clearSupabaseTables(supabase);
});
