import { beforeEach, describe, expect, it } from "@jest/globals";
import { post, del, get } from "../../../testing/testingTools";
import { TESTER } from "../../../testing/testingTools";
import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../supabase";
import { v4 as uuidv4 } from "uuid";
import { getCurrentDay } from "../checkin/checkin-utils";

const otherEvent = uuidv4();

export async function insertTestAttendee(overrides: { registration?: any; attendee?: any } = {}) {
    const user_id = TESTER.user_id;
    const email = TESTER.email;

    // Insert role
    await SupabaseDB.ROLES.insert({
        user_id,
        display_name: "Test User",
        email,
        roles: [Role.enum.USER],
    }).throwOnError();

    // Insert registration
    await SupabaseDB.REGISTRATIONS
        .insert({
            user_id,
            email,
            name: "Test User",
            university: "UIUC", // default test value
            degree: "BS",       // default test value
            is_interested_mech_mania: true,
            is_interested_puzzle_bang: false,
            dietary_restrictions: [],
            allergies: [],
            ...overrides.registration,
        })
        .throwOnError();
    // Insert attendee
    await SupabaseDB.ATTENDEES
        .insert({
            user_id,
            // name: "Test User",
            points: 0,
            favorite_events: [],
            is_eligible_tshirt: true,
            is_eligible_cap: false,
            is_eligible_tote: false,
            is_eligible_button: false,
            has_redeemed_tshirt: false,
            has_redeemed_cap: false,
            has_redeemed_tote: false,
            has_redeemed_button: false,
            has_priority_mon: false,
            has_priority_tue: false,
            has_priority_wed: false,
            has_priority_thu: false,
            has_priority_fri: false,
            has_priority_sat: false,
            has_priority_sun: false,
            puzzles_completed: [],
            ...overrides.attendee,
        })
        .throwOnError();
}


const BASE_TEST_ATTENDEE = {
    user_id: TESTER.user_id,
    points: 0,
    // has_checked_in: false,
    puzzles_completed: [],
    
};

let eventId: string;
    beforeEach(async () => {
        eventId = uuidv4();
        await SupabaseDB.EVENT_ATTENDANCE.delete().neq("attendee", "");
        await SupabaseDB.ATTENDEE_ATTENDANCE.delete().neq("user_id", "");
        await SupabaseDB.EVENTS.delete().neq("event_id", "");
        await SupabaseDB.ATTENDEES.delete().neq("user_id", "");
        await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "");
        await SupabaseDB.ROLES.delete().neq("user_id", "");

        await SupabaseDB.EVENTS.insert({
            event_id: eventId,
            name: "Test Event",
            description: "Description",
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 3600000).toISOString(), // +1hr
            event_type: "SPECIAL", // use one of the allowed enums
            is_virtual: false,
            is_visible: true,
            location: "Test Location",
            points: 10,
        }).throwOnError();
    });

describe("POST /attendee/favorites/:eventId", () => {

    it("should add a favorite event ID to the user's attendee profile", async () => {
        await insertTestAttendee();

        await post(`/attendee/favorites/${eventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        const updated = await SupabaseDB.ATTENDEES.select("favorite_events").eq("user_id", TESTER.user_id);

        expect(updated.data?.[0]?.favorite_events).toContain(eventId);
    }, 50000);

    it("should not duplicate event ID in favorite_events", async () => {
        await insertTestAttendee({
            attendee: {
                favorite_events: [eventId],
            },
        });

        await post(`/attendee/favorites/${eventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        const updated = await SupabaseDB.ATTENDEES.select("favorite_events").eq("user_id", TESTER.user_id);

        expect(updated.data?.[0]?.favorite_events.length).toBe(1); // still only one
        expect(updated.data?.[0]?.favorite_events).toContain(eventId);
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

// beforeEach(async () => {
//     await SupabaseDB.ATTENDEES.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.ROLES.delete().neq("user_id", "").throwOnError();
// });


    it("should remove the event ID from the user's favorite_events", async () => {
        await insertTestAttendee({
            attendee: {
                favorite_events: [eventId, otherEvent],
            },
        });

        await del(`/attendee/favorites/${eventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        const updated = await SupabaseDB.ATTENDEES.select("favorite_events").eq("user_id", TESTER.user_id);
        expect(updated.data?.[0]?.favorite_events).not.toContain(eventId);
        expect(updated.data?.[0]?.favorite_events).toContain(otherEvent);
    });

    it("should handle event ID not being in favorite_events", async () => {
        await insertTestAttendee({
            attendee: {
                favorite_events: [otherEvent],
            },
        });

        await del(`/attendee/favorites/${eventId}`, Role.enum.USER).expect(
            StatusCodes.OK
        );

        const updated = await SupabaseDB.ATTENDEES.select("favorite_events").eq("user_id", TESTER.user_id);
        expect(updated.data?.[0]?.favorite_events).toEqual([otherEvent]);
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
    const uuidEvent1 = uuidv4();
    const uuidEvent2 = uuidv4();

// beforeEach(async () => {
//     await SupabaseDB.ATTENDEES.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.ROLES.delete().neq("user_id", "").throwOnError();
// });


    it("should return the attendee with their favorite_events", async () => {
        const favorite_events = [uuidEvent1, uuidEvent2];
        await insertTestAttendee({
            attendee: {
                favorite_events: favorite_events,
            },
        });

        const response = await get(
            "/attendee/favorites",
            Role.enum.USER
        ).expect(StatusCodes.OK);

        expect(response.body).toMatchObject({
            user_id: TESTER.user_id,
            favorite_events: favorite_events,
        });
    });

    it("should return an empty favorite_events array if none are set", async () => {
        await insertTestAttendee();

        const response = await get(
            "/attendee/favorites",
            Role.enum.USER
        ).expect(StatusCodes.OK);

        expect(response.body.favorite_events).toEqual([]);
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
        user_id: "testuser123",
    };

    beforeEach(async () => {
        await SupabaseDB.ROLES.insert({
            user_id: VALID_ATTENDEE_PAYLOAD.user_id,
            email: "test@test.com",
            display_name: "Test",
            roles: [Role.Enum.USER],
        });
    });

    it("should create a new attendee with valid data", async () => {
        const response = await post("/attendee/")
            .send(VALID_ATTENDEE_PAYLOAD)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(VALID_ATTENDEE_PAYLOAD);
        const dbRecord = await SupabaseDB.ATTENDEES.select()
            .eq("user_id", VALID_ATTENDEE_PAYLOAD.user_id)
            .single();

        expect(dbRecord.data?.user_id).toBe(VALID_ATTENDEE_PAYLOAD.user_id);
    });

    it("should return 400 if required fields are missing", async () => {
        const invalidPayload = {}; // Empty object, missing user_id

        await post("/attendee/")
            .send(invalidPayload)
            .expect(StatusCodes.BAD_REQUEST);
    });
});

describe("GET /attendee/points", () => {
// beforeEach(async () => {
//     await SupabaseDB.ATTENDEES.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.ROLES.delete().neq("user_id", "").throwOnError();
// });


    it("should return the user's points", async () => {
        await insertTestAttendee({
            attendee: {
                user_id: BASE_TEST_ATTENDEE.user_id,
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
                user_id: BASE_TEST_ATTENDEE.user_id,
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
    const currentDay = getCurrentDay().toLowerCase();

// beforeEach(async () => {
//     await SupabaseDB.ATTENDEES.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.ROLES.delete().neq("user_id", "").throwOnError();
// });


    it("should return foodwave 1 if attendee has priority today", async () => {

        await insertTestAttendee({
            attendee: {
                user_id: BASE_TEST_ATTENDEE.user_id,
                [`has_priority_${currentDay}`]: true,
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
                user_id: BASE_TEST_ATTENDEE.user_id,
                dietary_restrictions: ["VEGAN"],
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
                user_id: BASE_TEST_ATTENDEE.user_id,
                dietary_restrictions: ["GLUTEN-FREE"],
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
                user_id: BASE_TEST_ATTENDEE.user_id,
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
// beforeEach(async () => {
//     await SupabaseDB.ATTENDEES.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.ROLES.delete().neq("user_id", "").throwOnError();
// });


    it("should return the attendee data for an authenticated USER", async () => {
        await insertTestAttendee({
            attendee: {
                ...BASE_TEST_ATTENDEE,
            },
        });

        const response = await get("/attendee/", Role.enum.USER).expect(
            StatusCodes.OK
        );

        expect(response.body.user_id).toBe(TESTER.user_id);
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

describe("GET /attendee/id/:user_id", () => {
    const targetId = "some-user-id";
// beforeEach(async () => {
//     await SupabaseDB.ATTENDEES.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.ROLES.delete().neq("user_id", "").throwOnError();
// });

    beforeEach(async () => {
        await SupabaseDB.ROLES.insert({
            user_id: targetId,
            email: "some-user@test.com",
            display_name: "Some User",
            roles: [Role.Enum.USER],
        });
    });


    it.each([
        { role: Role.enum.STAFF, label: "STAFF" },
        { role: Role.enum.ADMIN, label: "ADMIN" },
    ])("should return attendee info for %s role", async ({ role }) => {
        await insertTestAttendee({
            attendee: { ...BASE_TEST_ATTENDEE, user_id: targetId },
        });

        const res = await get(`/attendee/id/${targetId}`, role).expect(
            StatusCodes.OK
        );

        expect(res.body.user_id).toBe(targetId);
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
// beforeEach(async () => {
//     await SupabaseDB.ATTENDEES.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.ROLES.delete().neq("user_id", "").throwOnError();
// });

    it.each([
        { role: Role.enum.STAFF, label: "STAFF" },
        { role: Role.enum.ADMIN, label: "ADMIN" },
    ])("should return all attendee emails and user_ids for %s role", async ({ role }) => {

        await SupabaseDB.ROLES.insert([
            { user_id: "u1", email: "u1@example.com", display_name: "User One", roles: [] },
            { user_id: "u2", email: "u2@example.com", display_name: "User Two", roles: [] },
        ]).throwOnError();

        await SupabaseDB.REGISTRATIONS.insert([
            {
                user_id: "u1",
                name: "User One",
                email: "u1@example.com",
                university: "N/A",
                degree: "N/A",
                is_interested_mech_mania: false,
                is_interested_puzzle_bang: false,
                dietary_restrictions: [],
                allergies: [],
            },
            {
                user_id: "u2",
                name: "User Two",
                email: "u2@example.com",
                university: "N/A",
                degree: "N/A",
                is_interested_mech_mania: false,
                is_interested_puzzle_bang: false,
                dietary_restrictions: [],
                allergies: [],
            },
        ]).throwOnError();


        const res = await get("/attendee/emails", role).expect(StatusCodes.OK);

        expect(res.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ user_id: "u1", email: "u1@example.com" }),
                expect.objectContaining({ user_id: "u2", email: "u2@example.com" }),
            ])
        );
    });

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
    const user_id = TESTER.user_id;

// beforeEach(async () => {
//     await SupabaseDB.ATTENDEES.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "").throwOnError();
//     await SupabaseDB.ROLES.delete().neq("user_id", "").throwOnError();
// });


    it.each([{ role: Role.enum.STAFF }, { role: Role.enum.ADMIN }])(
        "should redeem valid item for %s role",
        async ({ role }) => {

            await insertTestAttendee({
                attendee: { ...BASE_TEST_ATTENDEE, user_id },
            });

            const res = await post("/attendee/redeemMerch/Tshirt", role)
                .send({ user_id })
                .expect(StatusCodes.OK);

            expect(res.body).toEqual({ message: "Item Redeemed!" });

            const updated = await SupabaseDB.ATTENDEES.select("has_redeemed_tshirt").eq("user_id", user_id).maybeSingle().throwOnError();

            expect(updated.data?.has_redeemed_tshirt).toBe(true);
        }
    );

    it("should return 404 if user not found", async () => {
        await post("/attendee/redeemMerch/Tshirt", Role.enum.STAFF)
            .send({ user_id: "notreal" })
            .expect(StatusCodes.NOT_FOUND);
    });

    it("should return 400 for invalid item", async () => {
        await insertTestAttendee({
                attendee: { ...BASE_TEST_ATTENDEE, user_id },
            });
        await post("/attendee/redeemMerch/InvalidItem", Role.enum.ADMIN)
            .send({ user_id })
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 400 if item already redeemed", async () => {

        await insertTestAttendee({
            attendee: {
                ...BASE_TEST_ATTENDEE,
                user_id,
                has_redeemed_tshirt: true,
            },
        });

        await post("/attendee/redeemMerch/Tshirt", Role.enum.ADMIN)
            .send({ user_id })
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 400 if user not eligible for item", async () => {

        await insertTestAttendee({
            attendee: {
                ...BASE_TEST_ATTENDEE,
                user_id,
                has_redeemed_tshirt: true,
            },
        });

        await post("/attendee/redeemMerch/Cap", Role.enum.STAFF)
            .send({ user_id })
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 401 if unauthenticated", async () => {
        await post("/attendee/redeemMerch/Tshirt")
            .send({ user_id })
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 if user is not STAFF or ADMIN", async () => {
        await insertTestAttendee({
                attendee: { ...BASE_TEST_ATTENDEE, user_id },
    });

        await post("/attendee/redeemMerch/Tshirt", Role.enum.USER)
            .send({ user_id })
            .expect(StatusCodes.FORBIDDEN);
    });
});
