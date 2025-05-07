import { beforeEach, describe, expect, it } from "@jest/globals";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import { Role } from "../auth/auth-models";
import { getAsStaff, get } from "../../../testing/testingTools";
import { getCurrentDay } from "../checkin/checkin-utils";

describe("GET /stats/check-in", () => {
    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
    });

    it("should return correct count for checked-in attendees", async () => {
        await Database.ATTENDEE.create([
            {
                userId: "a1",
                name: "Ritam",
                email: "ritam@test.com",
                hasCheckedIn: true,
            },
            {
                userId: "a2",
                name: "Nathan",
                email: "nathan@test.com",
                hasCheckedIn: true,
            },
            {
                userId: "a3",
                name: "Timothy",
                email: "timothy@test.com",
                hasCheckedIn: false,
            },
        ]);

        const response = await getAsStaff("/stats/check-in").expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ count: 2 });
    });

    it("should return 0 if no attendees are checked in", async () => {
        await Database.ATTENDEE.create([
            {
                userId: "a1",
                name: "Ritam",
                email: "ritam@test.com",
                hasCheckedIn: false,
            },
        ]);

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
    });

    it("should return correct count for people with points threshold", async () => {
        await Database.ATTENDEE.create([
            {
                userId: "a1",
                name: "Ritam",
                email: "ritam@test.com",
                points: 10,
            },
            {
                userId: "a2",
                name: "Nathan",
                email: "nathan@test.com",
                points: 25,
            },
            {
                userId: "a3",
                name: "Timothy",
                email: "timothy@test.com",
                points: 20,
            },
        ]);

        const pointsThreshold = 20;
        const response = await getAsStaff(
            `/stats/merch-item/${pointsThreshold}`
        ).expect(StatusCodes.OK);
        expect(response.body).toEqual({ count: 2 });
    });

    it("should return 0 if no one has enough points", async () => {
        await Database.ATTENDEE.create([
            {
                userId: "a1",
                name: "Ritam",
                email: "ritam@test.com",
                points: 10,
            },
            {
                userId: "a2",
                name: "Nathan",
                email: "nathan@test.com",
                points: 25,
            },
            {
                userId: "a3",
                name: "Timothy",
                email: "timothy@test.com",
                points: 20,
            },
        ]);

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
    });

    it("should return correct count for people with priority attendance for today", async () => {
        const currentDay = getCurrentDay();
        await Database.ATTENDEE.create([
            {
                userId: "a1",
                name: "Ritam",
                email: "ritam@test.com",
                hasPriority: { [currentDay]: true },
            },
            {
                userId: "a2",
                name: "Nathan",
                email: "nathan@test.com",
                hasPriority: { [currentDay]: false },
            },
            {
                userId: "a3",
                name: "Timothy",
                email: "timothy@test.com",
                hasPriority: { [currentDay]: false },
            },
        ]);

        const response = await getAsStaff("/stats/priority-attendee").expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual({ count: 1 });
    });

    it("should return 0 if no attendee has priority for today", async () => {
        const currentDay = getCurrentDay();
        await Database.ATTENDEE.create([
            {
                userId: "a1",
                name: "Ritam",
                email: "ritam@test.com",
                hasPriority: { [currentDay]: false },
            },
            {
                userId: "a2",
                name: "Nathan",
                email: "nathan@test.com",
                hasPriority: { [currentDay]: false },
            },
            {
                userId: "a3",
                name: "Timothy",
                email: "timothy@test.com",
                hasPriority: { [currentDay]: false },
            },
        ]);

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
        const now = new Date();
        const pastEvents = [
            {
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
            },
            {
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
            },
            {
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
            },
        ];

        await Database.EVENTS.insertMany(pastEvents);

        const response = await getAsStaff(`/stats/attendance/2`).expect(
            StatusCodes.OK
        );

        // Should return the 2 most recent events in descending order by endTime
        expect(response.body.attendanceCounts).toEqual([20, 50]);
    });

    it("should return all past events if fewer than N exist", async () => {
        const now = new Date();
        await Database.EVENTS.insertMany([
            {
                eventId: "e1",
                name: "Solo event",
                startTime: new Date(now.getTime() - 320000),
                endTime: new Date(now.getTime() - 300000),
                points: 5,
                description: "Event 3 description",
                isVirtual: false,
                imageUrl: null,
                location: "Room B",
                eventType: "SPEAKER",
                attendanceCount: 99,
            },
        ]);

        const response = await getAsStaff(`/stats/attendance/5`).expect(
            StatusCodes.OK
        );
        expect(response.body.attendanceCounts).toEqual([99]);
    });

    it("should return empty array if no past events exist", async () => {
        const futureTime = new Date(Date.now() + 3600000);
        await Database.EVENTS.create({
            eventId: "future",
            name: "future event",
            startTime: futureTime,
            endTime: futureTime,
            points: 5,
            description: "future event description",
            isVirtual: true,
            imageUrl: null,
            location: "Room B",
            eventType: "SPEAKER",
            attendanceCount: 123,
        });

        const response = await getAsStaff(`/stats/attendance/3`).expect(
            StatusCodes.OK
        );
        expect(response.body.attendanceCounts).toEqual([]);
    });

    it("should return 400 for invalid or missing N param", async () => {
        await getAsStaff(`/stats/attendance/not-a-number`).expect(
            StatusCodes.BAD_REQUEST
        );
        await getAsStaff(`/stats/attendance/`).expect(StatusCodes.NOT_FOUND); // No param at all
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
    });

    it("should return correct dietary/allergy aggregation counts", async () => {
        await Database.ATTENDEE.create([
            // neither
            {
                userId: "a1",
                name: "None",
                email: "a1@test.com",
                dietaryRestrictions: [],
                allergies: [],
            },

            // only dietary
            {
                userId: "a2",
                name: "DietOnly",
                email: "a2@test.com",
                dietaryRestrictions: ["Vegetarian"],
                allergies: [],
            },

            // only allergy
            {
                userId: "a3",
                name: "AllergyOnly",
                email: "a3@test.com",
                dietaryRestrictions: [],
                allergies: ["Peanuts"],
            },

            // both
            {
                userId: "a4",
                name: "Both",
                email: "a4@test.com",
                dietaryRestrictions: ["Vegan"],
                allergies: ["Shellfish"],
            },

            // duplicates
            {
                userId: "a5",
                name: "AllergyAgain",
                email: "a5@test.com",
                dietaryRestrictions: ["Vegetarian"],
                allergies: ["Peanuts"],
            },
        ]);

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
