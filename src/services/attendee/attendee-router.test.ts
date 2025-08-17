import { beforeEach, describe, expect, it } from "@jest/globals";
import { post, del, get } from "../../../testing/testingTools";
import { TESTER } from "../../../testing/testingTools";
import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../supabase";
import { v4 as uuidv4 } from "uuid";
import { getCurrentDay } from "../checkin/checkin-utils";

const otherEvent = uuidv4();
const dummyUUID = "00000000-0000-0000-0000-000000000000";
const TEST_AUTH_ID = "test-auth-id";

async function createTestEvent() {
    const testEventId = uuidv4();

    await SupabaseDB.EVENTS.insert({
        eventId: testEventId,
        name: "Test Event",
        description: "Description",
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(), // +1hr
        eventType: "SPECIAL", // use one of the allowed enums
        isVirtual: false,
        isVisible: true,
        location: "Test Location",
        points: 10,
    }).throwOnError();

    return testEventId;
}

type RegistrationOverride = {
    userId?: string;
    email?: string;
    name?: string;
    school?: string;
    educationLevel?: string;
    isInterestedMechMania?: boolean;
    isInterestedPuzzleBang?: boolean;
    dietaryRestrictions?: string[];
    allergies?: string[];
};

type AttendeeOverride = {
    userId?: string;
    displayName?: string;
    points?: number;
    favoriteEvents?: string[];
    isEligibleTshirt?: boolean;
    isEligibleCap?: boolean;
    isEligibleTote?: boolean;
    isEligibleButton?: boolean;
    hasRedeemedTshirt?: boolean;
    hasRedeemedCap?: boolean;
    hasRedeemedTote?: boolean;
    hasRedeemedButton?: boolean;
    hasPriorityMon?: boolean;
    hasPriorityTue?: boolean;
    hasPriorityWed?: boolean;
    hasPriorityThu?: boolean;
    hasPriorityFri?: boolean;
    hasPrioritySat?: boolean;
    hasPrioritySun?: boolean;
    puzzlesCompleted?: string[];
};

export async function insertTestAttendee(
    overrides: {
        registration?: RegistrationOverride;
        attendee?: AttendeeOverride;
    } = {}
) {
    const userId = TESTER.userId;
    const email = TESTER.email;

    // Insert role
    await SupabaseDB.AUTH_INFO.insert([
        {
            userId: userId,
            displayName: "Test User",
            email,
            authId: TEST_AUTH_ID,
        },
    ]).throwOnError();

    await SupabaseDB.AUTH_ROLES.insert([
        {
            userId: userId,
            role: Role.enum.USER,
        },
    ]).throwOnError();

    // Insert registration
    await SupabaseDB.REGISTRATIONS.insert({
        userId,
        email,
        name: "Test User",
        school: "UIUC", // default test value
        educationLevel: "BS", // default test value
        isInterestedMechMania: true,
        isInterestedPuzzleBang: false,
        dietaryRestrictions: [],
        allergies: [],
        gender: "Prefer not to say",
        ethnicity: [],
        graduationYear: "2027",
        ...overrides.registration,
    }).throwOnError();

    // Insert attendee
    await SupabaseDB.ATTENDEES.insert({
        userId,
        points: 0,
        favoriteEvents: [],
        isEligibleTshirt: true,
        isEligibleCap: false,
        isEligibleTote: false,
        isEligibleButton: false,
        hasRedeemedTshirt: false,
        hasRedeemedCap: false,
        hasRedeemedTote: false,
        hasRedeemedButton: false,
        hasPriorityMon: false,
        hasPriorityTue: false,
        hasPriorityWed: false,
        hasPriorityThu: false,
        hasPriorityFri: false,
        hasPrioritySat: false,
        hasPrioritySun: false,
        puzzlesCompleted: [],
        ...overrides.attendee,
    }).throwOnError();
}

const BASE_TEST_ATTENDEE = {
    userId: TESTER.userId,
    points: 0,
    puzzlesCompleted: [],
};

beforeEach(async () => {
    try {
        await SupabaseDB.EVENT_ATTENDANCES.delete()
            .neq("attendee", "NONEXISTENT_VALUE_THAT_WILL_NEVER_EXIST")
            .throwOnError();
        await SupabaseDB.ATTENDEE_ATTENDANCES.delete()
            .neq("userId", dummyUUID)
            .throwOnError();
        await SupabaseDB.EVENTS.delete()
            .neq("eventId", dummyUUID)
            .throwOnError();
        await SupabaseDB.ATTENDEES.delete()
            .neq("userId", dummyUUID)
            .throwOnError();
        await SupabaseDB.REGISTRATIONS.delete()
            .neq("userId", dummyUUID)
            .throwOnError();
        await SupabaseDB.AUTH_ROLES.delete()
            .eq("userId", dummyUUID)
            .throwOnError();
        await SupabaseDB.AUTH_INFO.delete()
            .eq("userId", dummyUUID)
            .throwOnError();

        await SupabaseDB.AUTH_ROLES.delete()
            .eq("userId", TESTER.userId)
            .throwOnError();
        await SupabaseDB.AUTH_INFO.delete()
            .eq("userId", TESTER.userId)
            .throwOnError();
        await SupabaseDB.REGISTRATIONS.delete()
            .eq("userId", TESTER.userId)
            .throwOnError();
        await SupabaseDB.ATTENDEES.delete()
            .eq("userId", TESTER.userId)
            .throwOnError();
    } catch (error) {
        console.log("Cleanup in beforeEach (expected):", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
});

describe("POST /attendee/favorites/:eventId", () => {
    it("should add a favorite event ID to the user's attendee profile", async () => {
        const eventId = await createTestEvent();
        await insertTestAttendee();

        await post(`/attendee/favorites/${eventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        const updated = await SupabaseDB.ATTENDEES.select("favoriteEvents").eq(
            "userId",
            TESTER.userId
        );

        expect(updated.data?.[0]?.favoriteEvents).toContain(eventId);
    }, 50000);

    it("should not duplicate event ID in favoriteEvents", async () => {
        const eventId = await createTestEvent();

        await insertTestAttendee({
            attendee: {
                favoriteEvents: [eventId],
            },
        });

        await post(`/attendee/favorites/${eventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        const updated = await SupabaseDB.ATTENDEES.select("favoriteEvents").eq(
            "userId",
            TESTER.userId
        );

        expect(updated.data?.[0]?.favoriteEvents.length).toBe(1); // still only one
        expect(updated.data?.[0]?.favoriteEvents).toContain(eventId);
    });

    it("should return 404 if attendee is not found", async () => {
        const eventId = await createTestEvent();

        const res = await post(
            `/attendee/favorites/${eventId}`,
            Role.enum.USER
        ).expect(StatusCodes.NOT_FOUND);

        expect(res.body).toEqual({ error: "UserNotFound" });
    });

    it("should return 401 if user is unauthenticated", async () => {
        const eventId = await createTestEvent();

        await post(`/attendee/favorites/${eventId}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should return 403 if user does not have USER role", async () => {
        const eventId = await createTestEvent();

        await post(`/attendee/favorites/${eventId}`, Role.enum.STAFF).expect(
            StatusCodes.FORBIDDEN
        );
    });

    it("should return 400 for invalid event ID", async () => {
        const invalidEventId = "this-is-not-a-valid-uuid";

        await post(
            `/attendee/favorites/${invalidEventId}`,
            Role.enum.USER
        ).expect(StatusCodes.BAD_REQUEST);
    });
});

describe("DELETE /attendee/favorites/:eventId", () => {
    it("should remove the event ID from the user's favoriteEvents", async () => {
        const eventId = await createTestEvent();

        await insertTestAttendee({
            attendee: {
                favoriteEvents: [eventId, otherEvent],
            },
        });

        await del(`/attendee/favorites/${eventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        const updated = await SupabaseDB.ATTENDEES.select("favoriteEvents").eq(
            "userId",
            TESTER.userId
        );

        expect(updated.data?.[0]?.favoriteEvents).not.toContain(eventId);
        expect(updated.data?.[0]?.favoriteEvents).toContain(otherEvent);
    });

    it("should handle event ID not being in favorite_events", async () => {
        const eventId = await createTestEvent();

        await insertTestAttendee({
            attendee: {
                favoriteEvents: [otherEvent],
            },
        });

        await del(`/attendee/favorites/${eventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        const updated = await SupabaseDB.ATTENDEES.select("favoriteEvents").eq(
            "userId",
            TESTER.userId
        );
        expect(updated.data?.[0]?.favoriteEvents).toEqual([otherEvent]);
    });

    it("should return 404 if attendee is not found", async () => {
        const eventId = await createTestEvent();

        const res = await del(
            `/attendee/favorites/${eventId}`,
            Role.enum.USER
        ).expect(StatusCodes.NOT_FOUND);

        expect(res.body).toEqual({ error: "UserNotFound" });
    });

    it("should return 401 if user is unauthenticated", async () => {
        const eventId = await createTestEvent();

        await del(`/attendee/favorites/${eventId}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should return 403 if user does not have USER role", async () => {
        const eventId = await createTestEvent();

        await del(`/attendee/favorites/${eventId}`, Role.enum.STAFF).expect(
            StatusCodes.FORBIDDEN
        );
    });

    it("should return 400 for invalid event ID", async () => {
        const invalidEventId = "this-is-not-a-valid-uuid";

        await del(
            `/attendee/favorites/${invalidEventId}`,
            Role.enum.USER
        ).expect(StatusCodes.BAD_REQUEST);
    });
});

describe("GET /attendee/favorites", () => {
    const uuidEvent1 = uuidv4();
    const uuidEvent2 = uuidv4();

    it("should return the attendee with their favoriteEvents", async () => {
        const favoriteEvents = [uuidEvent1, uuidEvent2];
        await insertTestAttendee({
            attendee: {
                favoriteEvents: favoriteEvents,
            },
        });

        const response = await get(
            "/attendee/favorites",
            Role.enum.USER
        ).expect(StatusCodes.OK);

        expect(response.body).toMatchObject({
            userId: TESTER.userId,
            favoriteEvents: favoriteEvents,
        });
    });

    it("should return an empty favoriteEvents array if none are set", async () => {
        await insertTestAttendee();

        const response = await get(
            "/attendee/favorites",
            Role.enum.USER
        ).expect(StatusCodes.OK);

        expect(response.body.favoriteEvents).toEqual([]);
    });

    it("should return 404 if attendee is not found", async () => {
        await get("/attendee/favorites", Role.enum.USER).expect(
            StatusCodes.NOT_FOUND
        );
    });

    it("should return 401 if unauthenticated", async () => {
        await get("/attendee/favorites").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 if user does not have USER role", async () => {
        await get("/attendee/favorites", Role.enum.STAFF).expect(
            StatusCodes.FORBIDDEN
        );
    });
});

describe("POST /attendee/", () => {
    const VALID_ATTENDEE_PAYLOAD = {
        userId: "testuser123",
        tags: ["testtag1", "testtag2"],
    };

    beforeEach(async () => {
        await SupabaseDB.AUTH_INFO.insert([
            {
                userId: VALID_ATTENDEE_PAYLOAD.userId,
                displayName: "Test",
                email: "test@test.com",
                authId: TEST_AUTH_ID,
            },
        ]).throwOnError();

        await SupabaseDB.AUTH_ROLES.insert([
            {
                userId: VALID_ATTENDEE_PAYLOAD.userId,
                role: Role.enum.USER,
            },
        ]).throwOnError();
    });

    it("should create a new attendee with valid data", async () => {
        const response = await post("/attendee/")
            .send(VALID_ATTENDEE_PAYLOAD)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(VALID_ATTENDEE_PAYLOAD);
        const dbRecord = await SupabaseDB.ATTENDEES.select()
            .eq("userId", VALID_ATTENDEE_PAYLOAD.userId)
            .single();

        expect(dbRecord.data?.userId).toBe(VALID_ATTENDEE_PAYLOAD.userId);
    });

    it("should return 400 if required fields are missing", async () => {
        const invalidPayload = {}; // Empty object, missing userId

        await post("/attendee/")
            .send(invalidPayload)
            .expect(StatusCodes.BAD_REQUEST);
    });
});

describe("GET /attendee/points", () => {
    it("should return the user's points", async () => {
        await insertTestAttendee({
            attendee: {
                userId: BASE_TEST_ATTENDEE.userId,
                points: 42,
            },
        });

        const response = await get("/attendee/points", Role.enum.USER).expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ points: 42 });
    });

    it("should return 0 points if not explicitly set", async () => {
        await insertTestAttendee({
            attendee: {
                userId: BASE_TEST_ATTENDEE.userId,
            },
        });
        const response = await get("/attendee/points", Role.enum.USER).expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ points: 0 });
    });

    it("should return 404 if attendee is not found", async () => {
        await get("/attendee/points", Role.enum.USER).expect(
            StatusCodes.NOT_FOUND
        );
    });

    it("should return 401 if unauthenticated", async () => {
        await get("/attendee/points").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 if user does not have USER role", async () => {
        await get("/attendee/points", Role.enum.STAFF).expect(
            StatusCodes.FORBIDDEN
        );
    });
});

describe("GET /attendee/foodwave", () => {
    const currentDay = getCurrentDay();

    it("should return foodwave 1 if attendee has priority today", async () => {
        await insertTestAttendee({
            attendee: {
                userId: BASE_TEST_ATTENDEE.userId,
                [`hasPriority${currentDay}`]: true,
            },
        });

        const response = await get("/attendee/foodwave", Role.enum.USER).expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual({ foodwave: 1 });
    });

    it("should return foodwave 1 if attendee has dietary restriction VEGAN", async () => {
        await insertTestAttendee({
            registration: {
                userId: BASE_TEST_ATTENDEE.userId,
                dietaryRestrictions: ["VEGAN"],
            },
        });

        const response = await get("/attendee/foodwave", Role.enum.USER).expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual({ foodwave: 1 });
    });

    it("should return foodwave 1 if attendee has dietary restriction GLUTEN-FREE", async () => {
        await insertTestAttendee({
            registration: {
                userId: BASE_TEST_ATTENDEE.userId,
                dietaryRestrictions: ["GLUTEN-FREE"],
            },
        });

        const response = await get("/attendee/foodwave", Role.enum.USER).expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual({ foodwave: 1 });
    });

    it("should return foodwave 2 if no priority and no restrictions", async () => {
        await insertTestAttendee({
            attendee: {
                userId: BASE_TEST_ATTENDEE.userId,
            },
        });

        const response = await get("/attendee/foodwave", Role.enum.USER).expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual({ foodwave: 2 });
    });

    it("should return 404 if attendee not found", async () => {
        await get("/attendee/foodwave", Role.enum.USER).expect(
            StatusCodes.NOT_FOUND
        );
    });

    it("should return 401 if unauthenticated", async () => {
        await get("/attendee/foodwave").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 if user does not have USER role", async () => {
        await get("/attendee/foodwave", Role.enum.STAFF).expect(
            StatusCodes.FORBIDDEN
        );
    });
});

describe("GET /attendee/", () => {
    it("should return the attendee data for an authenticated USER", async () => {
        await insertTestAttendee({
            attendee: {
                ...BASE_TEST_ATTENDEE,
            },
        });

        const response = await get("/attendee/", Role.enum.USER).expect(
            StatusCodes.OK
        );

        expect(response.body.userId).toBe(TESTER.userId);
    });

    it("should return 404 if attendee not found", async () => {
        await get("/attendee/", Role.enum.USER).expect(StatusCodes.NOT_FOUND);
    });

    it("should return 401 if unauthenticated", async () => {
        await get("/attendee/").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 if not a USER", async () => {
        await get("/attendee/", Role.enum.STAFF).expect(StatusCodes.FORBIDDEN);
    });
});

describe("GET /attendee/id/:userId", () => {
    const targetId = "some-user-id";
    const targetAuthId = "some-auth-id";

    beforeEach(async () => {
        await SupabaseDB.AUTH_INFO.insert([
            {
                userId: targetId,
                displayName: "Some User",
                email: "some-user@test.com",
                authId: targetAuthId,
            },
        ]).throwOnError();

        await SupabaseDB.AUTH_ROLES.insert([
            {
                userId: targetId,
                role: Role.enum.USER,
            },
        ]).throwOnError();
    });

    it.each([
        { role: Role.enum.STAFF, label: "STAFF" },
        { role: Role.enum.ADMIN, label: "ADMIN" },
    ])("should return attendee info for %s role", async ({ role }) => {
        await insertTestAttendee({
            attendee: { ...BASE_TEST_ATTENDEE, userId: targetId },
        });

        const res = await get(`/attendee/id/${targetId}`, role).expect(
            StatusCodes.OK
        );

        expect(res.body.userId).toBe(targetId);
    });

    it("should return 404 if attendee not found", async () => {
        await get(`/attendee/id/unknown-id`, Role.enum.STAFF).expect(
            StatusCodes.NOT_FOUND
        );
    });

    it("should return 401 if unauthenticated", async () => {
        await get(`/attendee/id/${targetId}`).expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 if user does not have STAFF or ADMIN role", async () => {
        await get(`/attendee/id/${targetId}`, Role.enum.USER).expect(
            StatusCodes.FORBIDDEN
        );
    });
});

describe("GET /attendee/emails", () => {
    const targetAuthId = "some-auth-id";
    const targetAuthId2 = "some-auth-id-2";

    it.each([
        { role: Role.enum.STAFF, label: "STAFF" },
        { role: Role.enum.ADMIN, label: "ADMIN" },
    ])(
        "should return all attendee emails and userIds for %s role",
        async ({ role }) => {
            await SupabaseDB.AUTH_INFO.insert([
                {
                    userId: "u1",
                    email: "u1@example.com",
                    displayName: "User One",
                    authId: targetAuthId,
                },
                {
                    userId: "u2",
                    email: "u2@example.com",
                    displayName: "User Two",
                    authId: targetAuthId2,
                },
            ]).throwOnError();

            await SupabaseDB.AUTH_ROLES.insert([
                {
                    userId: "u1",
                    role: Role.enum.USER,
                },
                {
                    userId: "u2",
                    role: Role.enum.USER,
                },
            ]).throwOnError();

            await SupabaseDB.REGISTRATIONS.insert([
                {
                    userId: "u1",
                    name: "User One",
                    email: "u1@example.com",
                    school: "N/A",
                    educationLevel: "N/A",
                    isInterestedMechMania: false,
                    isInterestedPuzzleBang: false,
                    dietaryRestrictions: [],
                    allergies: [],
                    gender: "Prefer not to say",
                    ethnicity: [],
                    graduationYear: "2027",
                },
                {
                    userId: "u2",
                    name: "User Two",
                    email: "u2@example.com",
                    school: "N/A",
                    educationLevel: "N/A",
                    isInterestedMechMania: false,
                    isInterestedPuzzleBang: false,
                    dietaryRestrictions: [],
                    allergies: [],
                    gender: "Prefer not to say",
                    ethnicity: [],
                    graduationYear: "2027",
                },
            ]).throwOnError();

            const res = await get("/attendee/emails", role).expect(
                StatusCodes.OK
            );

            expect(res.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        userId: "u1",
                        email: "u1@example.com",
                    }),
                    expect.objectContaining({
                        userId: "u2",
                        email: "u2@example.com",
                    }),
                ])
            );
        }
    );

    it("should return empty array if no attendees exist", async () => {
        const res = await get("/attendee/emails", Role.enum.ADMIN).expect(
            StatusCodes.OK
        );

        expect(res.body).toEqual([]);
    });

    it("should return 401 if unauthenticated", async () => {
        await get("/attendee/emails").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 if user is not STAFF or ADMIN", async () => {
        await get("/attendee/emails", Role.enum.USER).expect(
            StatusCodes.FORBIDDEN
        );
    });
});

describe("POST /attendee/redeemMerch/:ITEM", () => {
    const userId = TESTER.userId;

    it.each([{ role: Role.enum.STAFF }, { role: Role.enum.ADMIN }])(
        "should redeem valid item for %s role",
        async ({ role }) => {
            await insertTestAttendee({
                attendee: { ...BASE_TEST_ATTENDEE, userId: userId },
            });

            const res = await post("/attendee/redeemMerch/Tshirt", role)
                .send({ userId })
                .expect(StatusCodes.OK);

            expect(res.body).toEqual({ message: "Item Redeemed!" });

            const updated = await SupabaseDB.ATTENDEES.select(
                "hasRedeemedTshirt"
            )
                .eq("userId", userId)
                .maybeSingle()
                .throwOnError();

            expect(updated.data?.hasRedeemedTshirt).toBe(true);
        }
    );

    it("should return 404 if user not found", async () => {
        await post("/attendee/redeemMerch/Tshirt", Role.enum.STAFF)
            .send({ userId: "notreal" })
            .expect(StatusCodes.NOT_FOUND);
    });

    it("should return 400 for invalid item", async () => {
        await insertTestAttendee({
            attendee: { ...BASE_TEST_ATTENDEE, userId: userId },
        });
        await post("/attendee/redeemMerch/InvalidItem", Role.enum.ADMIN)
            .send({ userId })
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 400 if item already redeemed", async () => {
        await insertTestAttendee({
            attendee: {
                ...BASE_TEST_ATTENDEE,
                userId: userId,
                hasRedeemedTshirt: true,
            },
        });

        await post("/attendee/redeemMerch/Tshirt", Role.enum.ADMIN)
            .send({ userId })
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 400 if user not eligible for item", async () => {
        await insertTestAttendee({
            attendee: {
                ...BASE_TEST_ATTENDEE,
                userId: userId,
                hasRedeemedTshirt: true,
            },
        });

        await post("/attendee/redeemMerch/Cap", Role.enum.STAFF)
            .send({ userId })
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 401 if unauthenticated", async () => {
        await post("/attendee/redeemMerch/Tshirt")
            .send({ userId })
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 if user is not STAFF or ADMIN", async () => {
        await insertTestAttendee({
            attendee: { ...BASE_TEST_ATTENDEE, userId: userId },
        });

        await post("/attendee/redeemMerch/Tshirt", Role.enum.USER)
            .send({ userId })
            .expect(StatusCodes.FORBIDDEN);
    });
});
