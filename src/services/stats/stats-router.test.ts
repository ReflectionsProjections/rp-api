import { beforeEach, describe, expect, it } from "@jest/globals";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../supabase";
import { Role } from "../auth/auth-models";
import { getAsStaff, get } from "../../../testing/testingTools";
import { getCurrentDay } from "../checkin/checkin-utils";
import { v4 as uuidv4 } from "uuid";

const currentDay = getCurrentDay();
const now = new Date();

// Test attendee data matching Postgres schema
const ATTENDEE_RITAM = {
    user_id: "a1",
    points: 10,
    has_priority_mon: currentDay === "Mon",
    has_priority_tue: currentDay === "Tue", 
    has_priority_wed: currentDay === "Wed",
    has_priority_thu: currentDay === "Thu",
    has_priority_fri: currentDay === "Fri",
    has_priority_sat: currentDay === "Sat",
    has_priority_sun: currentDay === "Sun",
    has_redeemed_tshirt: false,
    has_redeemed_button: false,
    has_redeemed_tote: false,
    has_redeemed_cap: false,
    is_eligible_tshirt: true,
    is_eligible_button: false,
    is_eligible_tote: false,
    is_eligible_cap: false,
    favorite_events: [],
    puzzles_completed: [],
};

const ATTENDEE_NATHAN = {
    user_id: "a2",
    points: 25,
    has_priority_mon: false,
    has_priority_tue: false,
    has_priority_wed: false,
    has_priority_thu: false,
    has_priority_fri: false,
    has_priority_sat: false,
    has_priority_sun: false,
    has_redeemed_tshirt: false,
    has_redeemed_button: false,
    has_redeemed_tote: false,
    has_redeemed_cap: false,
    is_eligible_tshirt: true,
    is_eligible_button: false,
    is_eligible_tote: false,
    is_eligible_cap: false,
    favorite_events: [],
    puzzles_completed: [],
};

const ATTENDEE_TIMOTHY = {
    user_id: "a3",
    points: 20,
    has_priority_mon: false,
    has_priority_tue: false,
    has_priority_wed: false,
    has_priority_thu: false,
    has_priority_fri: false,
    has_priority_sat: false,
    has_priority_sun: false,
    has_redeemed_tshirt: false,
    has_redeemed_button: false,
    has_redeemed_tote: false,
    has_redeemed_cap: false,
    is_eligible_tshirt: true,
    is_eligible_button: false,
    is_eligible_tote: false,
    is_eligible_cap: false,
    favorite_events: [],
    puzzles_completed: [],
};

// Roles records required for foreign key constraints
const ROLE_RITAM = {
    user_id: "a1",
    display_name: "Ritam Test",
    email: "ritam@test.com",
    roles: [Role.enum.USER],
};

const ROLE_NATHAN = {
    user_id: "a2", 
    display_name: "Nathan Test",
    email: "nathan@test.com",
    roles: [Role.enum.USER],
};

const ROLE_TIMOTHY = {
    user_id: "a3",
    display_name: "Timothy Test", 
    email: "timothy@test.com",
    roles: [Role.enum.USER],
};

// CHECKIN event for testing check-in functionality
const CHECKIN_EVENT = {
    event_id: uuidv4(),
    name: "Check-in Event",
    start_time: new Date(now.getTime() - 3600000).toISOString(),
    end_time: new Date(now.getTime() + 3600000).toISOString(),
    points: 0,
    description: "Daily check-in",
    is_virtual: false,
    image_url: null,
    location: null,
    event_type: "CHECKIN" as const,
    attendance_count: 0,
    is_visible: true,
};

// Event attendance records to simulate checked-in users
const EVENT_ATTENDANCE_RITAM = {
    event_id: CHECKIN_EVENT.event_id,
    attendee: "a1",
};

const EVENT_ATTENDANCE_NATHAN = {
    event_id: CHECKIN_EVENT.event_id,
    attendee: "a2",
};

// Past events for attendance testing
const EVENT_1 = {
    event_id: uuidv4(),
    name: "Event 1",
    start_time: new Date(now.getTime() - 120000).toISOString(),
    end_time: new Date(now.getTime() - 100000).toISOString(),
    points: 10,
    description: "Event 1 description",
    is_virtual: false,
    image_url: null,
    location: "Room A",
    event_type: "SPEAKER" as const,
    attendance_count: 20,
    is_visible: true,
};

const EVENT_2 = {
    event_id: uuidv4(),
    name: "Event 2",
    start_time: new Date(now.getTime() - 220000).toISOString(),
    end_time: new Date(now.getTime() - 200000).toISOString(),
    points: 15,
    description: "Event 2 description",
    is_virtual: true,
    image_url: null,
    location: null,
    event_type: "SPEAKER" as const,
    attendance_count: 50,
    is_visible: true,
};

const EVENT_3 = {
    event_id: uuidv4(),
    name: "Event 3",
    start_time: new Date(now.getTime() - 320000).toISOString(),
    end_time: new Date(now.getTime() - 300000).toISOString(),
    points: 5,
    description: "Event 3 description",
    is_virtual: false,
    image_url: null,
    location: "Room B",
    event_type: "SPEAKER" as const,
    attendance_count: 35,
    is_visible: true,
};

const FUTURE_EVENT = {
    event_id: uuidv4(),
    name: "Future Event",
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    points: 5,
    description: "Future event description",
    is_virtual: true,
    image_url: null,
    location: "Room B",
    event_type: "SPEAKER" as const,
    attendance_count: 123,
    is_visible: true,
};

// Additional events for check-in testing
const SECOND_CHECKIN_EVENT = {
    event_id: uuidv4(),
    name: "Second Check-in Event",
    start_time: new Date(now.getTime() - 1800000).toISOString(),
    end_time: new Date(now.getTime() + 1800000).toISOString(),
    points: 0,
    description: "Another daily check-in",
    is_virtual: false,
    image_url: null,
    location: null,
    event_type: "CHECKIN" as const,
    attendance_count: 0,
    is_visible: true,
};

const SPEAKER_EVENT = {
    event_id: uuidv4(),
    name: "Speaker Event",
    start_time: new Date(now.getTime() - 1800000).toISOString(),
    end_time: new Date(now.getTime() + 1800000).toISOString(),
    points: 10,
    description: "A speaker presentation",
    is_virtual: false,
    image_url: null,
    location: "Main Hall",
    event_type: "SPEAKER" as const,
    attendance_count: 0,
    is_visible: true,
};

// Additional attendance records for testing
const EVENT_ATTENDANCE_RITAM_SECOND_CHECKIN = {
    event_id: SECOND_CHECKIN_EVENT.event_id,
    attendee: "a1",
};

const EVENT_ATTENDANCE_TIMOTHY_SPEAKER = {
    event_id: SPEAKER_EVENT.event_id,
    attendee: "a3",
};

// Registration data for dietary restrictions testing
const ATTENDEES_DIETARY = [
    {
        user_id: "a1",
        name: "Test User 1",
        email: "a1@test.com",
        university: "University of Illinois",
        degree: "Computer Science",
        graduation: "2025",
        major: "Computer Science",
        dietary_restrictions: [],
        allergies: [],
        gender: null,
        ethnicity: [],
        hear_about_rp: [],
        portfolios: [],
        job_interest: [],
        is_interested_mech_mania: false,
        is_interested_puzzle_bang: false,
        has_resume: false,
        has_submitted: false,
    },
    {
        user_id: "a2", 
        name: "Test User 2",
        email: "a2@test.com",
        university: "University of Illinois",
        degree: "Computer Science",
        graduation: "2024",
        major: "Computer Science",
        dietary_restrictions: ["Vegetarian"],
        allergies: [],
        gender: null,
        ethnicity: [],
        hear_about_rp: [],
        portfolios: [],
        job_interest: [],
        is_interested_mech_mania: false,
        is_interested_puzzle_bang: false,
        has_resume: false,
        has_submitted: false,
    },
    {
        user_id: "a3",
        name: "Test User 3",
        email: "a3@test.com",
        university: "University of Illinois",
        degree: "Computer Science",
        graduation: "2023",
        major: "Computer Science",
        dietary_restrictions: [],
        allergies: ["Peanuts"],
        gender: null,
        ethnicity: [],
        hear_about_rp: [],
        portfolios: [],
        job_interest: [],
        is_interested_mech_mania: false,
        is_interested_puzzle_bang: false,
        has_resume: false,
        has_submitted: false,
    },
    {
        user_id: "a4",
        name: "Test User 4",
        email: "a4@test.com",
        university: "University of Illinois",
        degree: "Computer Science",
        graduation: "2022",
        major: "Computer Science",
        dietary_restrictions: ["Vegan"],
        allergies: ["Shellfish"],
        gender: null,
        ethnicity: [],
        hear_about_rp: [],
        portfolios: [],
        job_interest: [],
        is_interested_mech_mania: false,
        is_interested_puzzle_bang: false,
        has_resume: false,
        has_submitted: false,
    },
    {
        user_id: "a5",
        name: "Test User 5",
        email: "a5@test.com",
        university: "University of Illinois",
        degree: "Computer Science",
        graduation: "2021",
        major: "Computer Science",
        dietary_restrictions: ["Vegetarian"],
        allergies: ["Peanuts"],
        gender: null,
        ethnicity: [],
        hear_about_rp: [],
        portfolios: [],
        job_interest: [],
        is_interested_mech_mania: false,
        is_interested_puzzle_bang: false,
        has_resume: false,
        has_submitted: false,
    },
];

describe("GET /stats/check-in", () => {
    beforeEach(async () => {
        await SupabaseDB.EVENT_ATTENDANCE.delete().neq(
            "event_id",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.EVENTS.delete().neq(
            "event_id",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.ATTENDEES.delete().neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.ROLES.delete().neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.ROLES.insert([
            ROLE_RITAM,
            ROLE_NATHAN,
            ROLE_TIMOTHY,
        ]);
        
        await SupabaseDB.ATTENDEES.insert([
            ATTENDEE_RITAM,
            ATTENDEE_NATHAN,
            ATTENDEE_TIMOTHY,
        ]);
        
        await SupabaseDB.EVENTS.insert([CHECKIN_EVENT]);
        
        await SupabaseDB.EVENT_ATTENDANCE.insert([
            EVENT_ATTENDANCE_RITAM,
            EVENT_ATTENDANCE_NATHAN,
        ]);
    });

    it("should return correct count for checked-in attendees", async () => {
        const response = await getAsStaff("/stats/check-in").expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ count: 2 });
    });

    it("should return 0 if no attendees are checked in", async () => {
        await SupabaseDB.EVENT_ATTENDANCE.delete().neq(
            "event_id",
            "00000000-0000-0000-0000-000000000000"
        );

        const response = await getAsStaff("/stats/check-in").expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ count: 0 });
    });

    it("should return 0 if no CHECKIN events exist", async () => {
        await SupabaseDB.EVENT_ATTENDANCE.delete().neq(
            "event_id",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.EVENTS.delete().neq(
            "event_id",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.ATTENDEES.delete().neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.ROLES.delete().neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.ROLES.insert([
            ROLE_RITAM,
            ROLE_NATHAN,
            ROLE_TIMOTHY,
        ]);
        await SupabaseDB.ATTENDEES.insert([
            ATTENDEE_RITAM,
            ATTENDEE_NATHAN,
            ATTENDEE_TIMOTHY,
        ]);

        const response = await getAsStaff("/stats/check-in").expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ count: 0 });
    });

    it("should count unique attendees even if they checked into multiple CHECKIN events", async () => {
        await SupabaseDB.EVENTS.insert([SECOND_CHECKIN_EVENT]);
        
        await SupabaseDB.EVENT_ATTENDANCE.insert([EVENT_ATTENDANCE_RITAM_SECOND_CHECKIN]);

        const response = await getAsStaff("/stats/check-in").expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ count: 2 });
    });

    it("should only count attendees who checked into CHECKIN events, not other event types", async () => {
        await SupabaseDB.EVENTS.insert([SPEAKER_EVENT]);
        
        await SupabaseDB.EVENT_ATTENDANCE.insert([EVENT_ATTENDANCE_TIMOTHY_SPEAKER]);

        const response = await getAsStaff("/stats/check-in").expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ count: 2 });
    });

    it("should return 401 for unauthenticated users", async () => {
        await get("/stats/check-in").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 for users without STAFF access", async () => {
        await get("/stats/check-in", Role.enum.USER).expect(
            StatusCodes.FORBIDDEN
        );
    });
});

describe("GET /stats/merch-item/:PRICE", () => {
    beforeEach(async () => {
        await SupabaseDB.ATTENDEES.delete().neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.ROLES.delete().neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.ROLES.insert([
            ROLE_RITAM,
            ROLE_NATHAN,
            ROLE_TIMOTHY,
        ]);
        
        await SupabaseDB.ATTENDEES.insert([
            ATTENDEE_RITAM,
            ATTENDEE_NATHAN,
            ATTENDEE_TIMOTHY,
        ]);
    });

    it("should return correct count for people with points threshold", async () => {
        const pointsThreshold = 20;
        const response = await getAsStaff(
            `/stats/merch-item/${pointsThreshold}`
        ).expect(StatusCodes.OK);
        
        expect(response.body).toEqual({ count: 2 });
    });

    it("should return 0 if no one has enough points", async () => {
        const pointsThreshold = 30;
        const response = await getAsStaff(
            `/stats/merch-item/${pointsThreshold}`
        ).expect(StatusCodes.OK);
        
        expect(response.body).toEqual({ count: 0 });
    });

    it("should return all attendees if threshold is 0", async () => {
        const pointsThreshold = 0;
        const response = await getAsStaff(
            `/stats/merch-item/${pointsThreshold}`
        ).expect(StatusCodes.OK);
        
        expect(response.body).toEqual({ count: 3 });
    });

    it("should return exact count when threshold equals someone's points", async () => {
        const pointsThreshold = 10;
        const response = await getAsStaff(
            `/stats/merch-item/${pointsThreshold}`
        ).expect(StatusCodes.OK);
        
        expect(response.body).toEqual({ count: 3 });
    });

    it("should return 400 if PRICE is not a number", async () => {
        const response = await getAsStaff(`/stats/merch-item/notanumber`).expect(
            StatusCodes.BAD_REQUEST
        );
        
        expect(response.body).toHaveProperty("error");
    });

    it("should return 400 if PRICE is negative", async () => {
        const response = await getAsStaff(`/stats/merch-item/-5`).expect(
            StatusCodes.BAD_REQUEST
        );
        
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("non-negative");
    });

    it("should return 400 if PRICE is not an integer", async () => {
        const response = await getAsStaff(`/stats/merch-item/10.5`).expect(
            StatusCodes.BAD_REQUEST
        );
        
        expect(response.body).toHaveProperty("error");
    });

    it("should return 401 for unauthenticated users", async () => {
        await get("/stats/merch-item/20").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 for users without STAFF access", async () => {
        await get("/stats/merch-item/20", Role.enum.USER).expect(
            StatusCodes.FORBIDDEN
        );
    });
});

describe("GET /stats/priority-attendee", () => {
    beforeEach(async () => {
        await SupabaseDB.ATTENDEES.delete().neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.ROLES.delete().neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.ROLES.insert([
            ROLE_RITAM,
            ROLE_NATHAN,
            ROLE_TIMOTHY,
        ]);

        await SupabaseDB.ATTENDEES.insert([
            ATTENDEE_RITAM,
            ATTENDEE_NATHAN,
            ATTENDEE_TIMOTHY,
        ]);
    });

    it("should return correct count for people with priority attendance for today", async () => {
        const response = await getAsStaff("/stats/priority-attendee").expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual({ count: 1 });
    });

    it("should return 0 if no attendee has priority for today", async () => {
        const dayFieldMap = {
            "Mon": "has_priority_mon",
            "Tue": "has_priority_tue", 
            "Wed": "has_priority_wed",
            "Thu": "has_priority_thu",
            "Fri": "has_priority_fri",
            "Sat": "has_priority_sat",
            "Sun": "has_priority_sun"
        };
        
        const updateData = Object.fromEntries(
            Object.values(dayFieldMap).map(field => [field, false])
        );

        await SupabaseDB.ATTENDEES.update(updateData).neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );

        const response = await getAsStaff("/stats/priority-attendee").expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual({ count: 0 });
    });

    it("should return 401 for unauthenticated users", async () => {
        await get("/stats/priority-attendee").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 for users without STAFF role", async () => {
        await get("/stats/priority-attendee", Role.enum.USER).expect(
            StatusCodes.FORBIDDEN
        );
    });
});

describe("GET /stats/attendance/:N", () => {
    beforeEach(async () => {    
        await SupabaseDB.EVENT_ATTENDANCE.delete().neq(
            "event_id",
            "00000000-0000-0000-0000-000000000000"
        );
        
        await SupabaseDB.EVENTS.delete().neq(
            "event_id",
            "00000000-0000-0000-0000-000000000000"
        );
    });

    it("should return attendance counts for the N most recent past events", async () => {
        await SupabaseDB.EVENTS.insert([EVENT_1, EVENT_2, EVENT_3]);

        const response = await getAsStaff(`/stats/attendance/2`).expect(
            StatusCodes.OK
        );
        expect(response.body.attendanceCounts).toEqual([20, 50]);
    });

    it("should return all past events if fewer than N exist", async () => {
        await SupabaseDB.EVENTS.insert([EVENT_3]);

        const response = await getAsStaff(`/stats/attendance/5`).expect(
            StatusCodes.OK
        );
        expect(response.body.attendanceCounts).toEqual([35]);
    });

    it("should return empty array if no past events exist", async () => {
        await SupabaseDB.EVENTS.insert([FUTURE_EVENT]);

        const response = await getAsStaff(`/stats/attendance/3`).expect(
            StatusCodes.OK
        );
        expect(response.body.attendanceCounts).toEqual([]);
    });

    it("should return 400 for invalid or missing N param", async () => {
        await getAsStaff(`/stats/attendance/not-a-number`).expect(
            StatusCodes.BAD_REQUEST
        );
        await getAsStaff(`/stats/attendance/`).expect(StatusCodes.NOT_FOUND);
    });

    it("should return 401 for unauthenticated users", async () => {
        await get(`/stats/attendance/2`).expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 for users without STAFF access", async () => {
        await get(`/stats/attendance/2`, Role.enum.USER).expect(
            StatusCodes.FORBIDDEN
        );
    });
});

describe("GET /stats/dietary-restrictions", () => {
    beforeEach(async () => {
        await SupabaseDB.ATTENDEES.delete().neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.REGISTRATIONS.delete().neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.ROLES.delete().neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );

        const requiredRoles = ATTENDEES_DIETARY.map(attendee => ({
            user_id: attendee.user_id,
            display_name: attendee.name,
            email: attendee.email,
            roles: [Role.enum.USER],
        }));
        
        await SupabaseDB.ROLES.insert(requiredRoles);
        
        await SupabaseDB.REGISTRATIONS.insert(ATTENDEES_DIETARY);
    });

    it("should return correct dietary/allergy aggregation counts", async () => {
        const response = await get(
            "/stats/dietary-restrictions",
            Role.enum.STAFF
        ).expect(StatusCodes.OK);

        expect(response.body).toEqual({
            none: 1,
            dietaryRestrictions: 1,
            allergies: 1,
            both: 2,
            allergyCounts: {
                Peanuts: 2,
                Shellfish: 1,
            },
            dietaryRestrictionCounts: {
                Vegetarian: 2,
                Vegan: 1,
            },
        });
    });

    it("should return all zeros and empty maps if no attendees exist", async () => {
        await SupabaseDB.REGISTRATIONS.delete().neq(
            "user_id",
            "00000000-0000-0000-0000-000000000000"
        );

        const response = await get(
            "/stats/dietary-restrictions",
            Role.enum.STAFF
        ).expect(StatusCodes.OK);
        expect(response.body).toEqual({
            none: 0,
            dietaryRestrictions: 0,
            allergies: 0,
            both: 0,
            allergyCounts: {},
            dietaryRestrictionCounts: {},
        });
    });

    it("should return 401 for unauthenticated users", async () => {
        await get("/stats/dietary-restrictions").expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should return 403 for users without STAFF role", async () => {
        await get("/stats/dietary-restrictions", Role.enum.USER).expect(
            StatusCodes.FORBIDDEN
        );
    });
});
