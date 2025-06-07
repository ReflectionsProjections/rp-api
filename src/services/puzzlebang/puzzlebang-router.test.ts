import { post } from "../../../testing/testingTools";
import { Role } from "../auth/auth-models";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";

const TEST_EMAIL = "ritam@test.com";
const PUZZLE_ID = "puzzle-1";

function makeTestAttendee(overrides = {}) {
    return {
        userId: "ritam123",
        name: "Ritam Nandi",
        email: TEST_EMAIL,
        dietaryRestrictions: [],
        allergies: [],
        points: 0,
        puzzlesCompleted: [],
        ...overrides,
    };
}

describe("POST /puzzlebang", () => {
    beforeEach(async () => {
        await Database.ATTENDEE.deleteMany({});
    });

    it("should complete puzzle and increment points for PUZZLEBANG role", async () => {
        await Database.ATTENDEE.create(makeTestAttendee());

        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ email: TEST_EMAIL, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.OK);

        const updated = await Database.ATTENDEE.findOne({ email: TEST_EMAIL });
        expect(updated?.points).toBe(2);
        expect(updated?.puzzlesCompleted).toContain(PUZZLE_ID);
    });

    it("should return 401 if puzzle was already completed", async () => {
        await Database.ATTENDEE.create(makeTestAttendee({ puzzlesCompleted: [PUZZLE_ID] }));

        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ email: TEST_EMAIL, puzzleId: PUZZLE_ID })
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 404 if attendee not found", async () => {
        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ email: "fake_nathan@test.com", puzzleId: PUZZLE_ID })
            .expect(StatusCodes.NOT_FOUND);
    });

    it("should return 403 if user does not have PUZZLEBANG role", async () => {
        await Database.ATTENDEE.create(makeTestAttendee());

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
        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ email: TEST_EMAIL }) // missing puzzleId
            .expect(StatusCodes.BAD_REQUEST);

        await post("/puzzlebang", Role.enum.PUZZLEBANG)
            .send({ puzzleId: PUZZLE_ID }) // missing email
            .expect(StatusCodes.BAD_REQUEST);
    });
});