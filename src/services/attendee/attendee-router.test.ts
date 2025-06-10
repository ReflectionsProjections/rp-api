import { beforeEach, describe, expect, it } from "@jest/globals";
import { post, del, get } from "../../../testing/testingTools";
import { TESTER } from "../../../testing/testingTools";
import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import { v4 as uuidv4 } from "uuid";
import { getCurrentDay } from "../checkin/checkin-utils";

function makeTestAttendee(overrides = {}) {
    return {
        userId: TESTER.userId,
        name: "Test User",
        email: TESTER.email,
        favorites: [],
        dietaryRestrictions: [],
        allergies: [],
        hasPriority: {
            Mon: false,
            Tue: false,
            Wed: false,
            Thu: false,
            Fri: false,
            Sat: false,
            Sun: false,
        },
        isEligibleMerch: {
            Tshirt: true,
            Cap: false,
            Tote: false,
            Button: false,
        },
        hasRedeemedMerch: {
            Tshirt: false,
            Cap: false,
            Tote: false,
            Button: false,
        },
        ...overrides,
    };
}

describe("POST /attendee/favorites/:eventId", () => {
    const eventId = uuidv4();

    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
    });

    it("should add a favorite event ID to the user's attendee profile", async () => {
        await Database.ATTENDEE.create(makeTestAttendee());

        await post(`/attendee/favorites/${eventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        const updated = await Database.ATTENDEE.findOne({
            userId: TESTER.userId,
        });
        expect(updated?.favorites).toContain(eventId);
    });

    it("should not duplicate event ID in favorites", async () => {
        await Database.ATTENDEE.create(
            makeTestAttendee({ favorites: [eventId] })
        );

        await post(`/attendee/favorites/${eventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        const updated = await Database.ATTENDEE.findOne({
            userId: TESTER.userId,
        });
        expect(updated?.favorites.length).toBe(1); // still only one
        expect(updated?.favorites).toContain(eventId);
    });

    it("should return 404 if attendee is not found", async () => {
        const res = await post(
            `/attendee/favorites/${eventId}`,
            Role.enum.USER
        ).expect(StatusCodes.NOT_FOUND);

        expect(res.body).toEqual({ error: "UserNotFound" });
    });

    it("should return 401 if user is unauthenticated", async () => {
        await post(`/attendee/favorites/${eventId}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should return 403 if user does not have USER role", async () => {
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
    const eventId = uuidv4();

    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
    });

    it("should remove the event ID from the user's favorites", async () => {
        await Database.ATTENDEE.create(
            makeTestAttendee({ favorites: [eventId, "otherEvent"] })
        );

        await del(`/attendee/favorites/${eventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        const updated = await Database.ATTENDEE.findOne({
            userId: TESTER.userId,
        });
        expect(updated?.favorites).not.toContain(eventId);
        expect(updated?.favorites).toContain("otherEvent");
    });

    it("should handle event ID not being in favorites", async () => {
        await Database.ATTENDEE.create(
            makeTestAttendee({ favorites: ["otherEvent"] })
        );

        await del(`/attendee/favorites/${eventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        const updated = await Database.ATTENDEE.findOne({
            userId: TESTER.userId,
        });
        expect(updated?.favorites).toEqual(["otherEvent"]);
    });

    it("should return 404 if attendee is not found", async () => {
        const res = await del(
            `/attendee/favorites/${eventId}`,
            Role.enum.USER
        ).expect(StatusCodes.NOT_FOUND);

        expect(res.body).toEqual({ error: "UserNotFound" });
    });

    it("should return 401 if user is unauthenticated", async () => {
        await del(`/attendee/favorites/${eventId}`).expect(
            StatusCodes.UNAUTHORIZED
        );
    });

    it("should return 403 if user does not have USER role", async () => {
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
    const uuidEvent = "123e4567-e89b-12d3-a456-426614174000";

    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
    });

    it("should return the attendee with their favorites", async () => {
        const favorites = [uuidEvent, "f7bd25b0-c749-4900-a56e-4a680e4d79fb"];
        await Database.ATTENDEE.create(makeTestAttendee({ favorites }));

        const response = await get(
            "/attendee/favorites",
            Role.enum.USER
        ).expect(StatusCodes.OK);

        expect(response.body).toMatchObject({
            userId: TESTER.userId,
            favorites: favorites,
        });
    });

    it("should return an empty favorites array if none are set", async () => {
        await Database.ATTENDEE.create(makeTestAttendee());

        const response = await get(
            "/attendee/favorites",
            Role.enum.USER
        ).expect(StatusCodes.OK);

        expect(response.body.favorites).toEqual([]);
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
    const validAttendee = {
        userId: "testuser123",
        name: "Test User",
        email: "test@example.com",
        dietaryRestrictions: ["Vegetarian"],
        allergies: ["Peanuts"],
    };

    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
    });

    it("should create a new attendee with valid data", async () => {
        const response = await post("/attendee/")
            .send(validAttendee)
            .expect(StatusCodes.CREATED);

        expect(response.body).toEqual(validAttendee);

        const inDb = await Database.ATTENDEE.findOne({
            userId: validAttendee.userId,
        });
        expect(inDb).not.toBeNull();
        expect(inDb?.email).toBe(validAttendee.email);
    });

    it("should return 400 if required fields are missing", async () => {
        const invalidAttendee: Partial<typeof validAttendee> = {
            ...validAttendee,
        };
        delete invalidAttendee.email;

        await post("/attendee/")
            .send(invalidAttendee)
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 400 if email is invalid", async () => {
        const invalidAttendee = { ...validAttendee, email: "not-an-email" };

        await post("/attendee/")
            .send(invalidAttendee)
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 400 if dietaryRestrictions is not an array", async () => {
        const invalidAttendee = {
            ...validAttendee,
            dietaryRestrictions: "Vegetarian",
        };

        await post("/attendee/")
            .send(invalidAttendee)
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 400 if allergies is not an array", async () => {
        const invalidAttendee = { ...validAttendee, allergies: "Peanuts" };

        await post("/attendee/")
            .send(invalidAttendee)
            .expect(StatusCodes.BAD_REQUEST);
    });
});

describe("GET /attendee/points", () => {
    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
    });

    it("should return the user's points", async () => {
        await Database.ATTENDEE.create(makeTestAttendee({ points: 42 }));

        const response = await get("/attendee/points", Role.enum.USER).expect(
            StatusCodes.OK
        );

        expect(response.body).toEqual({ points: 42 });
    });

    it("should return 0 points if not explicitly set", async () => {
        await Database.ATTENDEE.create(makeTestAttendee());

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

    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
    });

    it("should return foodwave 1 if attendee has priority today", async () => {
        await Database.ATTENDEE.create(
            makeTestAttendee({
                hasPriority: {
                    ...makeTestAttendee().hasPriority,
                    [currentDay]: true,
                },
            })
        );

        const response = await get("/attendee/foodwave", Role.enum.USER).expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual({ foodwave: 1 });
    });

    it("should return foodwave 1 if attendee has dietary restriction VEGAN", async () => {
        await Database.ATTENDEE.create(
            makeTestAttendee({
                dietaryRestrictions: ["VEGAN"],
            })
        );

        const response = await get("/attendee/foodwave", Role.enum.USER).expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual({ foodwave: 1 });
    });

    it("should return foodwave 1 if attendee has dietary restriction GLUTEN-FREE", async () => {
        await Database.ATTENDEE.create(
            makeTestAttendee({
                dietaryRestrictions: ["GLUTEN-FREE"],
            })
        );

        const response = await get("/attendee/foodwave", Role.enum.USER).expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual({ foodwave: 1 });
    });

    it("should return foodwave 2 if no priority and no restrictions", async () => {
        await Database.ATTENDEE.create(makeTestAttendee());

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
    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
    });

    it("should return the attendee data for an authenticated USER", async () => {
        await Database.ATTENDEE.create(makeTestAttendee());

        const response = await get("/attendee/", Role.enum.USER).expect(
            StatusCodes.OK
        );

        expect(response.body.userId).toBe(TESTER.userId);
        expect(response.body.email).toBe(TESTER.email);
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

describe("GET /attendee/id/:USERID", () => {
    const targetId = "some-user-id";

    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
    });

    it.each([
        { role: Role.enum.STAFF, label: "STAFF" },
        { role: Role.enum.ADMIN, label: "ADMIN" },
    ])("should return attendee info for %s role", async ({ role }) => {
        await Database.ATTENDEE.create(makeTestAttendee({ userId: targetId }));

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
    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
    });

    it.each([
        { role: Role.enum.STAFF, label: "STAFF" },
        { role: Role.enum.ADMIN, label: "ADMIN" },
    ])(
        "should return all attendee emails and userIds for %s role",
        async ({ role }) => {
            await Database.ATTENDEE.create([
                makeTestAttendee({ userId: "u1", email: "u1@example.com" }),
                makeTestAttendee({ userId: "u2", email: "u2@example.com" }),
            ]);

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

    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
    });

    it.each([{ role: Role.enum.STAFF }, { role: Role.enum.ADMIN }])(
        "should redeem valid item for %s role",
        async ({ role }) => {
            await Database.ATTENDEE.create(makeTestAttendee());

            const res = await post("/attendee/redeemMerch/Tshirt", role)
                .send({ userId })
                .expect(StatusCodes.OK);

            expect(res.body).toEqual({ message: "Item Redeemed!" });

            const updated = await Database.ATTENDEE.findOne({ userId });
            expect(updated?.hasRedeemedMerch?.Tshirt).toBe(true);
        }
    );

    it("should return 404 if user not found", async () => {
        await post("/attendee/redeemMerch/Tshirt", Role.enum.STAFF)
            .send({ userId: "notreal" })
            .expect(StatusCodes.NOT_FOUND);
    });

    it("should return 400 for invalid item", async () => {
        await Database.ATTENDEE.create(makeTestAttendee());

        await post("/attendee/redeemMerch/InvalidItem", Role.enum.ADMIN)
            .send({ userId })
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 400 if item already redeemed", async () => {
        await Database.ATTENDEE.create(
            makeTestAttendee({
                hasRedeemedMerch: {
                    Tshirt: true,
                    Cap: false,
                    Tote: false,
                    Button: false,
                },
            })
        );

        await post("/attendee/redeemMerch/Tshirt", Role.enum.ADMIN)
            .send({ userId })
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 400 if user not eligible for item", async () => {
        await Database.ATTENDEE.create(makeTestAttendee());

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
        await Database.ATTENDEE.create(makeTestAttendee());

        await post("/attendee/redeemMerch/Tshirt", Role.enum.USER)
            .send({ userId })
            .expect(StatusCodes.FORBIDDEN);
    });
});
