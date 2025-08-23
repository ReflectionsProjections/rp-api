import {
    post,
    postAsUser,
    postWithAuthorization,
} from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import { Registration } from "../registration/registration-schema";
import { AttendeeType } from "../attendee/attendee-schema";
import Config from "../../config";
import { AuthInfo } from "../auth/auth-schema";

const TEST_AUTH_INFO = {
    userId: "abcd-efgh",
    email: "registered@example.com",
    authId: "auth-id",
    displayName: "Bob",
} satisfies AuthInfo;

const TEST_REGISTRATION = {
    userId: TEST_AUTH_INFO.userId,
    email: TEST_AUTH_INFO.email,
    allergies: [],
    dietaryRestrictions: [],
    educationLevel: "",
    ethnicity: [],
    gender: "",
    graduationYear: "",
    hasResume: true,
    howDidYouHear: [],
    isInterestedMechMania: true,
    isInterestedPuzzleBang: true,
    majors: [],
    minors: [],
    name: "",
    opportunities: [],
    personalLinks: [],
    school: "",
    tags: [],
} satisfies Registration;

const TEST_ATTENDEE = {
    userId: TEST_REGISTRATION.userId,
    puzzlesCompleted: [],
    favoriteEvents: [],
    hasPriorityFri: false,
    hasPriorityMon: false,
    hasPrioritySat: false,
    hasPrioritySun: false,
    hasPriorityThu: false,
    hasPriorityTue: false,
    hasPriorityWed: false,
    hasRedeemedButton: false,
    hasRedeemedCap: false,
    hasRedeemedTote: false,
    hasRedeemedTshirt: false,
    isEligibleButton: false,
    isEligibleCap: false,
    isEligibleTote: false,
    isEligibleTshirt: false,
    points: 0,
    tags: [],
} satisfies AttendeeType;

const PUZZLE_ID = "12345";

beforeEach(async () => {
    await SupabaseDB.AUTH_INFO.insert(TEST_AUTH_INFO).throwOnError();
    await SupabaseDB.REGISTRATIONS.insert(TEST_REGISTRATION).throwOnError();
    await SupabaseDB.ATTENDEES.insert(TEST_ATTENDEE).throwOnError();
});

describe("POST /puzzlebang", () => {
    it("should complete puzzle and increment points on brand new attendee", async () => {
        const res = await postWithAuthorization(
            "/puzzlebang",
            Config.PUZZLEBANG_API_KEY
        )
            .send({ email: TEST_REGISTRATION.email, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.OK);

        expect(res.body).toEqual({
            email: TEST_REGISTRATION.email,
            puzzlesCompleted: [PUZZLE_ID],
        });

        const { data: updated } = await SupabaseDB.ATTENDEES.select(
            "points, puzzlesCompleted"
        )
            .eq("userId", TEST_ATTENDEE.userId)
            .single()
            .throwOnError();

        expect(updated).toEqual({
            points: 2,
            puzzlesCompleted: [PUZZLE_ID],
        });
    });

    it("should complete puzzle and increment points on updated attendee", async () => {
        const PREVIOUS_POINTS = 31;
        const ALREADY_COMPLETED = ["already", "done"];
        await SupabaseDB.ATTENDEES.update({
            points: PREVIOUS_POINTS,
            puzzlesCompleted: ALREADY_COMPLETED,
        });

        const res = await postWithAuthorization(
            "/puzzlebang",
            Config.PUZZLEBANG_API_KEY
        )
            .send({ email: TEST_REGISTRATION.email, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.OK);

        expect(res.body).toEqual({
            email: TEST_REGISTRATION.email,
            puzzlesCompleted: [...ALREADY_COMPLETED, PUZZLE_ID],
        });

        const { data: updated } = await SupabaseDB.ATTENDEES.select(
            "points, puzzlesCompleted"
        )
            .eq("userId", TEST_ATTENDEE.userId)
            .single()
            .throwOnError();

        expect(updated).toEqual({
            points: PREVIOUS_POINTS + 2,
            puzzlesCompleted: [...ALREADY_COMPLETED, PUZZLE_ID],
        });
    });

    it("fails if the puzzle was already completed", async () => {
        await SupabaseDB.ATTENDEES.update({
            puzzlesCompleted: [PUZZLE_ID],
        }).eq("userId", TEST_ATTENDEE.userId);

        const res = await postWithAuthorization(
            "/puzzlebang",
            Config.PUZZLEBANG_API_KEY
        )
            .send({ email: TEST_REGISTRATION.email, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.CONFLICT);
        expect(res.body).toHaveProperty("error", "AlreadyCompleted");
    });

    it("fails if the registration data does not exist", async () => {
        await SupabaseDB.REGISTRATIONS.delete();

        const res = await postWithAuthorization(
            "/puzzlebang",
            Config.PUZZLEBANG_API_KEY
        )
            .send({ email: TEST_REGISTRATION.email, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.NOT_FOUND);
        expect(res.body).toHaveProperty("error", "NotFound");
    });

    it("fails if the attendee does not exist", async () => {
        await SupabaseDB.ATTENDEES.delete();

        const res = await postWithAuthorization(
            "/puzzlebang",
            Config.PUZZLEBANG_API_KEY
        )
            .send({ email: TEST_REGISTRATION.email, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.NOT_FOUND);
        expect(res.body).toHaveProperty("error", "NotFound");
    });

    it("fails if no key provided", async () => {
        const res = await post("/puzzlebang")
            .send({ email: TEST_REGISTRATION.email, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.UNAUTHORIZED);
        expect(res.body).toHaveProperty("error", "NoKey");
    });

    it("fails if key is invalid", async () => {
        const res = await postWithAuthorization("/puzzlebang", "invalid-key")
            .send({ email: TEST_REGISTRATION.email, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.UNAUTHORIZED);
        expect(res.body).toHaveProperty("error", "InvalidKey");
    });

    it("fails if user auth is used", async () => {
        const res = await postAsUser("/puzzlebang")
            .send({ email: TEST_REGISTRATION.email, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.UNAUTHORIZED);
        expect(res.body).toHaveProperty("error", "InvalidKey");
    });

    it.each(["email", "puzzleId"])(
        "fails if body is missing '%s'",
        async (missing) => {
            const req = { email: TEST_REGISTRATION.email, puzzleId: PUZZLE_ID };
            delete req[missing as keyof typeof req];
            const res = await postWithAuthorization(
                "/puzzlebang",
                Config.PUZZLEBANG_API_KEY
            )
                .send(req)
                .expect(StatusCodes.BAD_REQUEST);
            expect(res.body).toHaveProperty("error", "BadRequest");
        }
    );
});
