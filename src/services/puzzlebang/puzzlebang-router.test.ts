import { post } from "../../../testing/testingTools";
import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../supabase";

const TEST_USER_ID = "ritam123";
const TEST_EMAIL = "ritam@test.com";
const PUZZLE_ID = "P1";

function makeTestAttendee(overrides = {}) {
    return {
        user_id: TEST_USER_ID,
        points: 0,
        puzzles_completed: [],
        ...overrides,
    };
}

function makeTestRegistration(overrides = {}) {
    return {
        user_id: TEST_USER_ID,
        name: "Ritam",
        email: TEST_EMAIL,
        degree: "Bachelors",
        university: "UIUC",
        is_interested_mech_mania: false,
        is_interested_puzzle_bang: true,
        allergies: [],
        dietary_restrictions: [],
        ethnicity: null,
        gender: null,
        ...overrides,
    };
}

type InsertTestAttendeeOverrides = {
    user_id?: string;
    email?: string;
    points?: number;
    puzzles_completed?: string[];
    [key: string]: unknown;
};

async function insertTestAttendee(overrides: InsertTestAttendeeOverrides = {}) {
    const userId = overrides.user_id || TEST_USER_ID;
    const email = overrides.email || TEST_EMAIL;

    // Roles (needed first because of FK constraint)
    const { error: roleError } = await SupabaseDB.ROLES.insert([
        {
            user_id: userId,
            display_name: "Ritam",
            email,
            roles: [Role.enum.PUZZLEBANG],
        },
    ]);
    if (roleError) throw new Error("Role insert failed: " + roleError.message);

    // Registrations
    const { error: regError } = await SupabaseDB.REGISTRATIONS.insert([
        makeTestRegistration({ user_id: userId }),
    ]);
    if (regError)
        throw new Error("Registration insert failed: " + regError.message);

    // Attendee
    const { error: attError } = await SupabaseDB.ATTENDEES.insert([
        makeTestAttendee({ user_id: userId, ...overrides }),
    ]);
    if (attError)
        throw new Error("Attendee insert failed: " + attError.message);
}

describe("POST /puzzlebang", () => {
    beforeEach(async () => {
        // Clean up all possibly conflicting data
        await SupabaseDB.ATTENDEES.delete().eq("user_id", TEST_USER_ID);
        await SupabaseDB.REGISTRATIONS.delete().eq("user_id", TEST_USER_ID);
        await SupabaseDB.ROLES.delete().eq("user_id", TEST_USER_ID);

        await SupabaseDB.ATTENDEES.delete().eq("user_id", "nonexistent");
        await SupabaseDB.REGISTRATIONS.delete().eq("user_id", "nonexistent");
        await SupabaseDB.ROLES.delete().eq("user_id", "nonexistent");
    });

    it("should complete puzzle and increment points for PUZZLEBANG role", async () => {
        await insertTestAttendee();

        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ email: TEST_EMAIL, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.OK);

        const { data: updated, error } = await SupabaseDB.ATTENDEES.select(
            "points, puzzles_completed"
        )
            .eq("user_id", TEST_USER_ID)
            .single();

        if (error) throw error;
        expect(updated?.points).toBe(2);
        expect(updated?.puzzles_completed).toContain(PUZZLE_ID);
    }, 30000);

    it("should return 409 if puzzle was already completed", async () => {
        await insertTestAttendee({ puzzles_completed: [PUZZLE_ID] });

        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ email: TEST_EMAIL, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.CONFLICT);
    });

    it("should return 404 if attendee not found", async () => {
        // Insert dummy user to satisfy FKs
        await SupabaseDB.ROLES.insert([
            {
                user_id: "nonexistent",
                display_name: "Fake User",
                email: "fake@example.com",
                roles: [Role.enum.PUZZLEBANG],
            },
        ]);
        await SupabaseDB.REGISTRATIONS.insert([
            makeTestRegistration({
                user_id: "nonexistent",
                email: "fake@example.com",
            }),
        ]);

        // No attendee inserting for this case

        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ email: "fake@example.com", puzzleId: PUZZLE_ID })
            .expect(StatusCodes.NOT_FOUND);
    });

    it("should return 403 if user does not have PUZZLEBANG role", async () => {
        await SupabaseDB.ROLES.insert([
            {
                user_id: TEST_USER_ID,
                display_name: "Ritam",
                email: TEST_EMAIL,
                roles: [Role.enum.USER], // not PUZZLEBANG
            },
        ]);
        await SupabaseDB.REGISTRATIONS.insert([makeTestRegistration()]);
        await SupabaseDB.ATTENDEES.insert([makeTestAttendee()]);

        await post("/puzzlebang", Role.enum.USER)
            .send({ email: TEST_EMAIL, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.FORBIDDEN);
    });

    it("should return 401 if unauthenticated", async () => {
        await post("/puzzlebang")
            .send({ email: TEST_EMAIL, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 400 if body is missing fields", async () => {
        await insertTestAttendee();

        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ email: TEST_EMAIL }) // Missing puzzleId
            .expect(StatusCodes.BAD_REQUEST);

        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ puzzleId: PUZZLE_ID }) // Missing email
            .expect(StatusCodes.BAD_REQUEST);
    });
});
