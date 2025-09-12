import { beforeEach, describe, expect, it, afterAll } from "@jest/globals";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import { Tiers, IconColors } from "../attendee/attendee-schema";
import { Role } from "../auth/auth-models";
import { getAsStaff, get } from "../../../testing/testingTools";
import { getCurrentDay } from "../checkin/checkin-utils";
import { v4 as uuidv4 } from "uuid";

const currentDay = getCurrentDay();
const now = new Date();

const ATTENDEE_RITAM = {
    userId: "a1",
    tags: ["testtag1", "testtag2"],
    points: 10,
    currentTier: Tiers.Enum.TIER1,
    icon: IconColors.Enum.RED,
    hasPriorityMon: currentDay === "Mon",
    hasPriorityTue: currentDay === "Tue",
    hasPriorityWed: currentDay === "Wed",
    hasPriorityThu: currentDay === "Thu",
    hasPriorityFri: currentDay === "Fri",
    hasPrioritySat: currentDay === "Sat",
    hasPrioritySun: currentDay === "Sun",
    favoriteEvents: [],
    puzzlesCompleted: [],
};

const ATTENDEE_NATHAN = {
    userId: "a2",
    tags: ["testtag1", "testtag2"],
    points: 25,
    currentTier: Tiers.Enum.TIER1,
    icon: IconColors.Enum.BLUE,
    hasPriorityMon: false,
    hasPriorityTue: false,
    hasPriorityWed: false,
    hasPriorityThu: false,
    hasPriorityFri: false,
    hasPrioritySat: false,
    hasPrioritySun: false,
    favoriteEvents: [],
    puzzlesCompleted: [],
};

const ATTENDEE_TIMOTHY = {
    userId: "a3",
    tags: ["testtag1", "testtag2"],
    points: 20,
    currentTier: Tiers.Enum.TIER1,
    icon: IconColors.Enum.GREEN,
    hasPriorityMon: false,
    hasPriorityTue: false,
    hasPriorityWed: false,
    hasPriorityThu: false,
    hasPriorityFri: false,
    hasPrioritySat: false,
    hasPrioritySun: false,
    favoriteEvents: [],
    puzzlesCompleted: [],
};

// Auth records required for foreign key constraints
const AUTH_INFO_RITAM = {
    userId: "a1",
    displayName: "Ritam Test",
    email: "ritam@test.com",
    authId: "auth_ritam",
};

const AUTH_INFO_NATHAN = {
    userId: "a2",
    displayName: "Nathan Test",
    email: "nathan@test.com",
    authId: "auth_nathan",
};

const AUTH_INFO_TIMOTHY = {
    userId: "a3",
    displayName: "Timothy Test",
    email: "timothy@test.com",
    authId: "auth_timothy",
};

const AUTH_ROLES_RITAM = {
    userId: "a1",
    role: Role.enum.USER,
};

const AUTH_ROLES_NATHAN = {
    userId: "a2",
    role: Role.enum.USER,
};

const AUTH_ROLES_TIMOTHY = {
    userId: "a3",
    role: Role.enum.USER,
};

// CHECKIN event for testing check-in functionality
const CHECKIN_EVENT = {
    eventId: uuidv4(),
    name: "Check-in Event",
    startTime: new Date(now.getTime() - 3600000).toISOString(),
    endTime: new Date(now.getTime() + 3600000).toISOString(),
    points: 0,
    description: "Daily check-in",
    isVirtual: false,
    imageUrl: null,
    location: null,
    eventType: "CHECKIN" as const,
    attendanceCount: 0,
    isVisible: true,
};

// Event attendance records to simulate checked-in users
const EVENT_ATTENDANCES_RITAM = {
    eventId: CHECKIN_EVENT.eventId,
    attendee: "a1",
};

const EVENT_ATTENDANCES_NATHAN = {
    eventId: CHECKIN_EVENT.eventId,
    attendee: "a2",
};

// Past events for attendance testing
const EVENT_1 = {
    eventId: uuidv4(),
    name: "Event 1",
    startTime: new Date(now.getTime() - 120000).toISOString(),
    endTime: new Date(now.getTime() - 100000).toISOString(),
    points: 10,
    description: "Event 1 description",
    isVirtual: false,
    imageUrl: null,
    location: "Room A",
    eventType: "SPEAKER" as const,
    attendanceCount: 20,
    isVisible: true,
};

const EVENT_2 = {
    eventId: uuidv4(),
    name: "Event 2",
    startTime: new Date(now.getTime() - 220000).toISOString(),
    endTime: new Date(now.getTime() - 200000).toISOString(),
    points: 15,
    description: "Event 2 description",
    isVirtual: true,
    imageUrl: null,
    location: null,
    eventType: "SPEAKER" as const,
    attendanceCount: 50,
    isVisible: true,
};

const EVENT_3 = {
    eventId: uuidv4(),
    name: "Event 3",
    startTime: new Date(now.getTime() - 320000).toISOString(),
    endTime: new Date(now.getTime() - 300000).toISOString(),
    points: 5,
    description: "Event 3 description",
    isVirtual: false,
    imageUrl: null,
    location: "Room B",
    eventType: "SPEAKER" as const,
    attendanceCount: 35,
    isVisible: true,
};

const FUTURE_EVENT = {
    eventId: uuidv4(),
    name: "Future Event",
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    points: 5,
    description: "Future event description",
    isVirtual: true,
    imageUrl: null,
    location: "Room B",
    eventType: "SPEAKER" as const,
    attendanceCount: 123,
    isVisible: true,
};

// Additional events for check-in testing
const SECOND_CHECKIN_EVENT = {
    eventId: uuidv4(),
    name: "Second Check-in Event",
    startTime: new Date(now.getTime() - 1800000).toISOString(),
    endTime: new Date(now.getTime() + 1800000).toISOString(),
    points: 0,
    description: "Another daily check-in",
    isVirtual: false,
    imageUrl: null,
    location: null,
    eventType: "CHECKIN" as const,
    attendanceCount: 0,
    isVisible: true,
};

const SPEAKER_EVENT = {
    eventId: uuidv4(),
    name: "Speaker Event",
    startTime: new Date(now.getTime() - 1800000).toISOString(),
    endTime: new Date(now.getTime() + 1800000).toISOString(),
    points: 10,
    description: "A speaker presentation",
    isVirtual: false,
    imageUrl: null,
    location: "Main Hall",
    eventType: "SPEAKER" as const,
    attendanceCount: 0,
    isVisible: true,
};

// Additional attendance records for testing
const EVENT_ATTENDANCES_RITAM_SECOND_CHECKIN = {
    eventId: SECOND_CHECKIN_EVENT.eventId,
    attendee: "a1",
};

const EVENT_ATTENDANCES_TIMOTHY_SPEAKER = {
    eventId: SPEAKER_EVENT.eventId,
    attendee: "a3",
};

// Registration data for dietary restrictions testing
const ATTENDEES_DIETARY = [
    {
        userId: "a1",
        name: "Test User 1",
        tags: ["testtag1", "testtag2"],
        email: "a1@test.com",
        school: "University of Illinois",
        educationLevel: "Computer Science",
        graduationYear: "2025",
        majors: ["Computer Science"],
        dietaryRestrictions: [],
        allergies: [],
        gender: "Prefer not to say",
        ethnicity: [],
        howDidYouHear: [],
        personalLinks: [],
        opportunities: [],
        isInterestedMechMania: false,
        isInterestedPuzzleBang: false,
    },
    {
        userId: "a2",
        name: "Test User 2",
        tags: ["testtag1", "testtag2"],
        email: "a2@test.com",
        school: "University of Illinois",
        educationLevel: "Computer Science",
        graduationYear: "2024",
        majors: ["Computer Science"],
        dietaryRestrictions: ["Vegetarian"],
        allergies: [],
        gender: "Prefer not to say",
        ethnicity: [],
        howDidYouHear: [],
        personalLinks: [],
        opportunities: [],
        isInterestedMechMania: false,
        isInterestedPuzzleBang: false,
    },
    {
        userId: "a3",
        name: "Test User 3",
        tags: ["testtag1", "testtag2"],
        email: "a3@test.com",
        school: "University of Illinois",
        educationLevel: "Computer Science",
        graduationYear: "2023",
        majors: ["Computer Science"],
        dietaryRestrictions: [],
        allergies: ["Peanuts"],
        gender: "Prefer not to say",
        ethnicity: [],
        howDidYouHear: [],
        personalLinks: [],
        opportunities: [],
        isInterestedMechMania: false,
        isInterestedPuzzleBang: false,
    },
    {
        userId: "a4",
        name: "Test User 4",
        tags: ["testtag1", "testtag2"],
        email: "a4@test.com",
        school: "University of Illinois",
        educationLevel: "Computer Science",
        graduationYear: "2022",
        majors: ["Computer Science"],
        dietaryRestrictions: ["Vegan"],
        allergies: ["Shellfish"],
        gender: "Prefer not to say",
        ethnicity: [],
        howDidYouHear: [],
        personalLinks: [],
        opportunities: [],
        isInterestedMechMania: false,
        isInterestedPuzzleBang: false,
    },
    {
        userId: "a5",
        name: "Test User 5",
        tags: ["testtag1", "testtag2"],
        email: "a5@test.com",
        school: "University of Illinois",
        educationLevel: "Computer Science",
        graduationYear: "2021",
        majors: ["Computer Science"],
        dietaryRestrictions: ["Vegetarian"],
        allergies: ["Peanuts"],
        gender: "Prefer not to say",
        ethnicity: [],
        howDidYouHear: [],
        personalLinks: [],
        opportunities: [],
        isInterestedMechMania: false,
        isInterestedPuzzleBang: false,
    },
];

afterAll(async () => {
    await SupabaseDB.EVENT_ATTENDANCES.delete().neq(
        "eventId",
        "00000000-0000-0000-0000-000000000000"
    );

    await SupabaseDB.EVENTS.delete().neq(
        "eventId",
        "00000000-0000-0000-0000-000000000000"
    );

    await SupabaseDB.REGISTRATIONS.delete().neq(
        "userId",
        "00000000-0000-0000-0000-000000000000"
    );

    await SupabaseDB.ATTENDEES.delete().neq(
        "userId",
        "00000000-0000-0000-0000-000000000000"
    );

    await SupabaseDB.AUTH_ROLES.delete().neq(
        "userId",
        "00000000-0000-0000-0000-000000000000"
    );

    await SupabaseDB.AUTH_INFO.delete().neq(
        "userId",
        "00000000-0000-0000-0000-000000000000"
    );
});

describe("GET /stats/check-in", () => {
    beforeEach(async () => {
        await SupabaseDB.EVENT_ATTENDANCES.delete().neq(
            "eventId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.EVENTS.delete().neq(
            "eventId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.ATTENDEES.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.AUTH_ROLES.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.AUTH_INFO.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.AUTH_INFO.insert([
            AUTH_INFO_RITAM,
            AUTH_INFO_NATHAN,
            AUTH_INFO_TIMOTHY,
        ]);
        await SupabaseDB.AUTH_ROLES.insert([
            AUTH_ROLES_RITAM,
            AUTH_ROLES_NATHAN,
            AUTH_ROLES_TIMOTHY,
        ]);

        await SupabaseDB.ATTENDEES.insert([
            ATTENDEE_RITAM,
            ATTENDEE_NATHAN,
            ATTENDEE_TIMOTHY,
        ]);

        await SupabaseDB.EVENTS.insert([CHECKIN_EVENT]);

        await SupabaseDB.EVENT_ATTENDANCES.insert([
            EVENT_ATTENDANCES_RITAM,
            EVENT_ATTENDANCES_NATHAN,
        ]).throwOnError();
    });

    it("should return correct count for checked-in attendees", async () => {
        const response = await getAsStaff("/stats/check-in").expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ count: 2 });
    });

    it("should return 0 if no attendees are checked in", async () => {
        await SupabaseDB.EVENT_ATTENDANCES.delete().neq(
            "eventId",
            "00000000-0000-0000-0000-000000000000"
        );

        const response = await getAsStaff("/stats/check-in").expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ count: 0 });
    });

    it("should return 0 if no CHECKIN events exist", async () => {
        await SupabaseDB.EVENT_ATTENDANCES.delete().neq(
            "eventId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.EVENTS.delete().neq(
            "eventId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.ATTENDEES.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.AUTH_ROLES.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.AUTH_INFO.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.AUTH_INFO.insert([
            AUTH_INFO_RITAM,
            AUTH_INFO_NATHAN,
            AUTH_INFO_TIMOTHY,
        ]);
        await SupabaseDB.AUTH_ROLES.insert([
            AUTH_ROLES_RITAM,
            AUTH_ROLES_NATHAN,
            AUTH_ROLES_TIMOTHY,
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

        await SupabaseDB.EVENT_ATTENDANCES.insert([
            EVENT_ATTENDANCES_RITAM_SECOND_CHECKIN,
        ]);

        const response = await getAsStaff("/stats/check-in").expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ count: 2 });
    });

    it("should only count attendees who checked into CHECKIN events, not other event types", async () => {
        await SupabaseDB.EVENTS.insert([SPEAKER_EVENT]);

        await SupabaseDB.EVENT_ATTENDANCES.insert([
            EVENT_ATTENDANCES_TIMOTHY_SPEAKER,
        ]);

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
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.AUTH_ROLES.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.AUTH_INFO.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.AUTH_INFO.insert([
            AUTH_INFO_RITAM,
            AUTH_INFO_NATHAN,
            AUTH_INFO_TIMOTHY,
        ]);
        await SupabaseDB.AUTH_ROLES.insert([
            AUTH_ROLES_RITAM,
            AUTH_ROLES_NATHAN,
            AUTH_ROLES_TIMOTHY,
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
        const response = await getAsStaff(
            `/stats/merch-item/notanumber`
        ).expect(StatusCodes.BAD_REQUEST);

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
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.AUTH_ROLES.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.AUTH_INFO.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.AUTH_INFO.insert([
            AUTH_INFO_RITAM,
            AUTH_INFO_NATHAN,
            AUTH_INFO_TIMOTHY,
        ]);
        await SupabaseDB.AUTH_ROLES.insert([
            AUTH_ROLES_RITAM,
            AUTH_ROLES_NATHAN,
            AUTH_ROLES_TIMOTHY,
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
            Mon: "hasPriorityMon",
            Tue: "hasPriorityTue",
            Wed: "hasPriorityWed",
            Thu: "hasPriorityThu",
            Fri: "hasPriorityFri",
            Sat: "hasPrioritySat",
            Sun: "hasPrioritySun",
        };

        const updateData = Object.fromEntries(
            Object.values(dayFieldMap).map((field) => [field, false])
        );

        await SupabaseDB.ATTENDEES.update(updateData).neq(
            "userId",
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
        await SupabaseDB.EVENT_ATTENDANCES.delete().neq(
            "eventId",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.EVENTS.delete().neq(
            "eventId",
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
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.REGISTRATIONS.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );

        await SupabaseDB.AUTH_ROLES.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );
        await SupabaseDB.AUTH_INFO.delete().neq(
            "userId",
            "00000000-0000-0000-0000-000000000000"
        );

        const requiredAuthInfo = ATTENDEES_DIETARY.map((attendee, index) => ({
            userId: attendee.userId,
            displayName: attendee.name,
            email: attendee.email,
            authId: `auth_attendee_${index}`,
        }));

        const requiredAuthRoles = ATTENDEES_DIETARY.map((attendee) => ({
            userId: attendee.userId,
            role: Role.enum.USER,
        }));

        await SupabaseDB.AUTH_INFO.insert(requiredAuthInfo);
        await SupabaseDB.AUTH_ROLES.insert(requiredAuthRoles);

        await SupabaseDB.REGISTRATIONS.insert(ATTENDEES_DIETARY).throwOnError();
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
            "userId",
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

describe("GET /stats/registrations", () => {
    beforeEach(async () => {
        await SupabaseDB.REGISTRATIONS.delete().neq("userId", "non-existent");
        await SupabaseDB.AUTH_INFO.delete().neq("userId", "non-existent");

        await SupabaseDB.AUTH_INFO.insert([AUTH_INFO_RITAM, AUTH_INFO_NATHAN]);
        await SupabaseDB.REGISTRATIONS.insert([
            {
                userId: "a1",
                name: "Ritam",
                email: "ritam@test.com",
                school: "University of Illinois",
                educationLevel: "Computer Science",
                graduationYear: "2025",
                majors: ["Computer Science"],
                dietaryRestrictions: [],
                allergies: [],
                gender: "Prefer not to say",
                ethnicity: [],
                howDidYouHear: [],
                personalLinks: [],
                opportunities: [],
                isInterestedMechMania: false,
                isInterestedPuzzleBang: false,
            },
            {
                userId: "a2",
                name: "Nathan",
                email: "nathan@test.com",
                school: "University of Illinois",
                educationLevel: "Computer Science",
                graduationYear: "2024",
                majors: ["Computer Science"],
                dietaryRestrictions: [],
                allergies: [],
                gender: "Prefer not to say",
                ethnicity: [],
                howDidYouHear: [],
                personalLinks: [],
                opportunities: [],
                isInterestedMechMania: false,
                isInterestedPuzzleBang: false,
            },
        ]);
    });

    it("should return the correct count of total registrations", async () => {
        const response = await getAsStaff("/stats/registrations").expect(
            StatusCodes.OK
        );
        expect(response.body.count).toBe(2);
    });

    it("should return 0 when no registrations exist", async () => {
        await SupabaseDB.REGISTRATIONS.delete().neq("userId", "non-existent");
        const response = await getAsStaff("/stats/registrations").expect(
            StatusCodes.OK
        );
        expect(response.body.count).toBe(0);
    });
});

describe("GET /stats/event/:EVENT_ID/attendance", () => {
    beforeEach(async () => {
        await SupabaseDB.EVENTS.delete().neq("eventId", uuidv4());
        await SupabaseDB.EVENTS.insert(EVENT_1);
    });

    it("should return the attendance count for a specific event", async () => {
        const response = await getAsStaff(
            `/stats/event/${EVENT_1.eventId}/attendance`
        ).expect(StatusCodes.OK);
        expect(response.body.attendanceCount).toBe(EVENT_1.attendanceCount);
    });

    it("should return 404 for a non-existent event", async () => {
        await getAsStaff(`/stats/event/${uuidv4()}/attendance`).expect(
            StatusCodes.NOT_FOUND
        );
    });

    it("should return 400 for an invalid event ID format", async () => {
        await getAsStaff("/stats/event/not-a-uuid/attendance").expect(
            StatusCodes.BAD_REQUEST
        );
    });
});

describe("GET /stats/tier-counts", () => {
    beforeEach(async () => {
        await SupabaseDB.ATTENDEES.delete().neq("userId", "non-existent");
        await SupabaseDB.AUTH_INFO.delete().neq("userId", "non-existent");

        await SupabaseDB.AUTH_INFO.insert([
            AUTH_INFO_RITAM,
            AUTH_INFO_NATHAN,
            AUTH_INFO_TIMOTHY,
        ]);
        // Setup attendees with different tiers
        await SupabaseDB.ATTENDEES.insert([
            { ...ATTENDEE_RITAM, currentTier: Tiers.Enum.TIER1 },
            { ...ATTENDEE_NATHAN, currentTier: Tiers.Enum.TIER2 },
            { ...ATTENDEE_TIMOTHY, currentTier: Tiers.Enum.TIER1 },
        ]);
    });

    it("should return the count of attendees in each tier", async () => {
        const response = await getAsStaff("/stats/tier-counts").expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual({
            TIER1: 2,
            TIER2: 1,
            TIER3: 0,
        });
    });
});

describe("GET /stats/tag-counts", () => {
    beforeEach(async () => {
        await SupabaseDB.ATTENDEES.delete().neq("userId", "non-existent");
        await SupabaseDB.AUTH_INFO.delete().neq("userId", "non-existent");

        await SupabaseDB.AUTH_INFO.insert([AUTH_INFO_RITAM, AUTH_INFO_NATHAN]);
        // Setup attendees with overlapping tags
        await SupabaseDB.ATTENDEES.insert([
            { ...ATTENDEE_RITAM, tags: ["AI", "career_readiness"] },
            { ...ATTENDEE_NATHAN, tags: ["AI", "networking"] },
        ]);
    });

    it("should return the count of each tag used by attendees", async () => {
        const response = await getAsStaff("/stats/tag-counts").expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual({
            AI: 2,
            career_readiness: 1,
            networking: 1,
        });
    });
});
