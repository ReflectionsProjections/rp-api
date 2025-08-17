import { post } from "../../../testing/testingTools";
import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../supabase";

const TEST_USER_ID = "ritam123";
const TEST_EMAIL = "ritam@test.com";
const PUZZLE_ID = "P1";

jest.setTimeout(100000);

function makeTestAttendee(overrides = {}) {
    return {
        userId: TEST_USER_ID,
        points: 0,
        puzzlesCompleted: [],
        ...overrides,
    };
}

function makeTestRegistration(overrides = {}) {
    return {
        userId: TEST_USER_ID,
        name: "Ritam",
        email: TEST_EMAIL,
        educationLevel: "Bachelors",
        school: "UIUC",
        isInterestedMechMania: false,
        isInterestedPuzzleBang: true,
        allergies: [],
        dietaryRestrictions: [],
        ethnicity: [],
        gender: "Prefer not to say",
        graduationYear: "2027",
        resume: "resume.pdf",
        ...overrides,
    };
}

type InsertTestAttendeeOverrides = {
    userId?: string;
    email?: string;
    points?: number;
    puzzlesCompleted?: string[];
    [key: string]: unknown;
};

async function insertTestAttendee(overrides: InsertTestAttendeeOverrides = {}) {
    const userId = overrides.userId || TEST_USER_ID;
    const email = overrides.email || TEST_EMAIL;

    await SupabaseDB.AUTH_INFO.insert([
        {
            userId: userId,
            displayName: "Ritam",
            email,
            authId: null,
        },
    ]).throwOnError();
    await SupabaseDB.AUTH_ROLES.insert([
        {
            userId: userId,
            role: Role.enum.PUZZLEBANG,
        },
    ]).throwOnError();

    // Registrations
    await SupabaseDB.REGISTRATIONS.insert([
        makeTestRegistration({ userId: userId }),
    ]).throwOnError();

    // Attendee
    await SupabaseDB.ATTENDEES.insert([
        makeTestAttendee({ userId: userId, ...overrides }),
    ]).throwOnError();
}

describe("POST /puzzlebang", () => {
    beforeEach(async () => {
        // Clean up all possibly conflicting data
        await SupabaseDB.ATTENDEES.delete().eq("userId", TEST_USER_ID);
        await SupabaseDB.REGISTRATIONS.delete().eq("userId", TEST_USER_ID);
        await SupabaseDB.AUTH_ROLES.delete().eq("userId", TEST_USER_ID);
        await SupabaseDB.AUTH_INFO.delete().eq("userId", TEST_USER_ID);

        await SupabaseDB.ATTENDEES.delete().eq("userId", "nonexistent");
        await SupabaseDB.REGISTRATIONS.delete().eq("userId", "nonexistent");
        await SupabaseDB.AUTH_ROLES.delete().eq("userId", "nonexistent");
        await SupabaseDB.AUTH_INFO.delete().eq("userId", "nonexistent");
    });

    afterEach(async () => {
        // clean up after tests
        await SupabaseDB.ATTENDEES.delete()
            .eq("userId", TEST_USER_ID)
            .throwOnError();
        await SupabaseDB.REGISTRATIONS.delete()
            .eq("userId", TEST_USER_ID)
            .throwOnError();
        await SupabaseDB.AUTH_ROLES.delete()
            .eq("userId", TEST_USER_ID)
            .throwOnError();
        await SupabaseDB.AUTH_INFO.delete()
            .eq("userId", TEST_USER_ID)
            .throwOnError();

        await SupabaseDB.ATTENDEES.delete()
            .eq("userId", "nonexistent")
            .throwOnError();
        await SupabaseDB.REGISTRATIONS.delete()
            .eq("userId", "nonexistent")
            .throwOnError();
        await SupabaseDB.AUTH_ROLES.delete()
            .eq("userId", "nonexistent")
            .throwOnError();
        await SupabaseDB.AUTH_INFO.delete()
            .eq("userId", "nonexistent")
            .throwOnError();
    });

    it("should complete puzzle and increment points for PUZZLEBANG role", async () => {
        await insertTestAttendee();

        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ email: TEST_EMAIL, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.OK);

        const { data: updated } = await SupabaseDB.ATTENDEES.select(
            "points, puzzlesCompleted"
        )
            .eq("userId", TEST_USER_ID)
            .single()
            .throwOnError();

        expect(updated?.points).toBe(2);
        expect(updated?.puzzlesCompleted).toContain(PUZZLE_ID);
    }, 30000);

    it("should return 409 if puzzle was already completed", async () => {
        await insertTestAttendee({ puzzlesCompleted: [PUZZLE_ID] });

        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ email: TEST_EMAIL, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.CONFLICT);
    });

    it("should return 404 if attendee not found", async () => {
        // Insert dummy user to satisfy FKs
        await SupabaseDB.AUTH_INFO.insert([
            {
                userId: "nonexistent",
                displayName: "Fake User",
                email: "fake@example.com",
                authId: null,
            },
        ]).throwOnError();
        await SupabaseDB.AUTH_ROLES.insert([
            {
                userId: "nonexistent",
                role: Role.enum.PUZZLEBANG,
            },
        ]).throwOnError();
        await SupabaseDB.REGISTRATIONS.insert([
            makeTestRegistration({
                userId: "nonexistent",
                email: "fake@example.com",
            }),
        ]);

        // No attendee inserting for this case

        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ email: "fake@example.com", puzzleId: PUZZLE_ID })
            .expect(StatusCodes.NOT_FOUND);
    });

    it("should return 403 if user does not have PUZZLEBANG role", async () => {
        await SupabaseDB.AUTH_INFO.insert([
            {
                userId: TEST_USER_ID,
                displayName: "Ritam",
                email: TEST_EMAIL,
                authId: null,
            },
        ]).throwOnError();
        await SupabaseDB.AUTH_ROLES.insert([
            {
                userId: TEST_USER_ID,
                role: Role.enum.USER,
            },
        ]).throwOnError();
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
