import { beforeEach, describe, expect, it } from "@jest/globals";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import { Role } from "../auth/auth-models";
import { getAsStaff, get } from "../../../testing/testingTools";
import { getCurrentDay } from "../checkin/checkin-utils";

const currentDay = getCurrentDay();
const now = new Date();

const ATTENDEE_RITAM = {
    userId: "a1",
    name: "Ritam",
    email: "ritam@test.com",
    hasCheckedIn: true,
    points: 10,
    hasPriority: { [currentDay]: true },
};

const ATTENDEE_NATHAN = {
    userId: "a2",
    name: "Nathan",
    email: "nathan@test.com",
    hasCheckedIn: true,
    points: 25,
    hasPriority: { [currentDay]: false },
};

const ATTENDEE_TIMOTHY = {
    userId: "a3",
    name: "Timothy",
    email: "timothy@test.com",
    hasCheckedIn: false,
    points: 20,
    hasPriority: { [currentDay]: false },
};

const EVENT_1 = {
    eventId: "e1",
    name: "Event 1",
    startTime: new Date(now.getTime() - 120000),
    endTime: new Date(now.getTime() - 100000),
    points: 10,
    description: "Event 1 description",
    isVirtual: false,
    imageUrl: null,
    location: "Room A",
    eventType: "SPEAKER",
    attendanceCount: 20,
};
const EVENT_2 = {
    eventId: "e2",
    name: "Event 2",
    startTime: new Date(now.getTime() - 220000),
    endTime: new Date(now.getTime() - 200000),
    points: 15,
    description: "Event 2 description",
    isVirtual: true,
    imageUrl: null,
    location: null,
    eventType: "SPEAKER",
    attendanceCount: 50,
};
const EVENT_3 = {
    eventId: "e3",
    name: "Event 3",
    startTime: new Date(now.getTime() - 320000),
    endTime: new Date(now.getTime() - 300000),
    points: 5,
    description: "Event 3 description",
    isVirtual: false,
    imageUrl: null,
    location: "Room B",
    eventType: "SPEAKER",
    attendanceCount: 35,
};

const FUTURE_EVENT = {
    eventId: "future",
    name: "Future Event",
    startTime: new Date(Date.now() + 3600000),
    endTime: new Date(Date.now() + 3600000),
    points: 5,
    description: "Future event description",
    isVirtual: true,
    imageUrl: null,
    location: "Room B",
    eventType: "SPEAKER",
    attendanceCount: 123,
};

const ATTENDEES_DIETARY = [
    {
        userId: "a1",
        name: "None",
        email: "a1@test.com",
        dietaryRestrictions: [],
        allergies: [],
    },
    {
        userId: "a2",
        name: "DietOnly",
        email: "a2@test.com",
        dietaryRestrictions: ["Vegetarian"],
        allergies: [],
    },
    {
        userId: "a3",
        name: "AllergyOnly",
        email: "a3@test.com",
        dietaryRestrictions: [],
        allergies: ["Peanuts"],
    },
    {
        userId: "a4",
        name: "Both",
        email: "a4@test.com",
        dietaryRestrictions: ["Vegan"],
        allergies: ["Shellfish"],
    },
    {
        userId: "a5",
        name: "AllergyAgain",
        email: "a5@test.com",
        dietaryRestrictions: ["Vegetarian"],
        allergies: ["Peanuts"],
    },
];

describe("GET /stats/check-in", () => {
    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
        await Database.ATTENDEE.create([
            ATTENDEE_RITAM,
            ATTENDEE_NATHAN,
            ATTENDEE_TIMOTHY,
        ]);
    });

    it("should return correct count for checked-in attendees", async () => {
        const response = await getAsStaff("/stats/check-in").expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ count: 2 });
    });

    it("should return 0 if no attendees are checked in", async () => {
        await Database.ATTENDEE.updateMany({}, { hasCheckedIn: false });

        const response = await getAsStaff("/stats/check-in").expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ count: 0 });
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
        await Database.ATTENDEE.deleteMany({});
        await Database.ATTENDEE.create([
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

    it("should return 401 for unauthenticated users", async () => {
        await get("/stats/merch-item/20").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 for users without STAFF access", async () => {
        await get("/stats/merch-item/20", Role.enum.USER).expect(
            StatusCodes.FORBIDDEN
        );
    });
    it("should return 400 if PRICE is not a number", async () => {
        await getAsStaff(`/stats/merch-item/notanumber`).expect(
            StatusCodes.BAD_REQUEST
        );
    });
});

describe("GET /stats/priority-attendee", () => {
    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
        await Database.ATTENDEE.create([
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
        await Database.ATTENDEE.updateMany(
            {},
            { hasPriority: { [currentDay]: false } }
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
        await Database.EVENTS.deleteMany({});
    });

    it("should return attendance counts for the N most recent past events", async () => {
        await Database.EVENTS.insertMany([EVENT_1, EVENT_2, EVENT_3]);

        const response = await getAsStaff(`/stats/attendance/2`).expect(
            StatusCodes.OK
        );
        expect(response.body.attendanceCounts).toEqual([20, 50]);
    });

    it("should return all past events if fewer than N exist", async () => {
        await Database.EVENTS.insertMany([EVENT_3]);

        const response = await getAsStaff(`/stats/attendance/5`).expect(
            StatusCodes.OK
        );
        expect(response.body.attendanceCounts).toEqual([35]);
    });

    it("should return empty array if no past events exist", async () => {
        await Database.EVENTS.insertMany([FUTURE_EVENT]);

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
        await Database.ATTENDEE.deleteMany({});
        await Database.ATTENDEE.create(ATTENDEES_DIETARY);
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
        await Database.ATTENDEE.deleteMany({});

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
