import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { StatusCodes } from "http-status-codes";
import { get, post, TESTER } from "../../../testing/testingTools";
import { Database } from "../../database";
import { Role } from "../auth/auth-models";
import { sendHTMLEmail } from "../ses/ses-utils";

jest.mock("../ses/ses-utils", () => ({
    sendHTMLEmail: jest.fn(),
}));

jest.mock("./registration-utils", () => ({
    ...(jest.requireActual(
        "./registration-utils"
    ) as typeof import("./registration-utils")),
    generateEncryptedId: jest.fn(() => Promise.resolve("mock-encrypted-id")),
}));

const VALID_REGISTRATION = {
    name: "TEST TESTER",
    email: "test@tester.com",
    university: "UIUC",
    graduation: "2027",
    major: "CS + Econ",
    degree: "Bachelor",
    dietaryRestrictions: [],
    allergies: [],
    gender: "Male",
    ethnicity: ["Asian"],
    hearAboutRP: ["Website"],
    portfolios: ["https://portfolio.com"],
    jobInterest: ["API", "RP Dev Team"],
    isInterestedMechMania: false,
    isInterestedPuzzleBang: true,
    hasResume: true,
};

beforeEach(async () => {
    await Database.REGISTRATION.deleteMany({});
    await Database.ROLES.deleteMany({});
    await Database.ATTENDEE.deleteMany({});
});

describe("POST /registration/save", () => {
    it("should save a registration draft for an authenticated user", async () => {
        const response = await post("/registration/save", Role.enum.USER)
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.OK);

        expect(response.body.userId).toBe(TESTER.userId);
        expect(response.body.hasSubmitted).toBeFalsy();

        const dbEntry = await Database.REGISTRATION.findOne({
            userId: TESTER.userId,
        });
        expect(dbEntry).toBeDefined();
        expect(dbEntry?.hasSubmitted).toBe(false);
    });

    it("should not allow unauthenticated users to save registration", async () => {
        await post("/registration/save")
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 409 if user already submitted registration", async () => {
        await Database.REGISTRATION.create({
            ...VALID_REGISTRATION,
            userId: TESTER.userId,
            hasSubmitted: true,
        });

        await post("/registration/save", Role.enum.USER)
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.CONFLICT);
    });

    it("should return 400 for invalid registration data", async () => {
        const invalidRegistration = {
            ...VALID_REGISTRATION,
            email: "not-an-email",
        };

        await post("/registration/save", Role.enum.USER)
            .send(invalidRegistration)
            .expect(StatusCodes.BAD_REQUEST);
    });
});

describe("POST /registration/submit", () => {
    it("should submit registration, create attendee, and assign USER role", async () => {
        await post("/registration/submit", Role.enum.USER)
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.OK);

        const reg = await Database.REGISTRATION.findOne({
            userId: TESTER.userId,
        });
        expect(reg?.hasSubmitted).toBe(true);

        const attendee = await Database.ATTENDEE.findOne({
            userId: TESTER.userId,
        });
        expect(attendee).toBeDefined();
        expect(attendee?.email).toBe(VALID_REGISTRATION.email);

        const roles = await Database.ROLES.findOne({ userId: TESTER.userId });
        expect(roles?.roles).toContain(Role.enum.USER);
        expect(sendHTMLEmail).toHaveBeenCalled();
    });

    it("should not allow unauthenticated users to submit", async () => {
        await post("/registration/submit")
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 409 if user already submitted", async () => {
        await Database.REGISTRATION.create({
            ...VALID_REGISTRATION,
            userId: TESTER.userId,
            hasSubmitted: true,
        });

        await post("/registration/submit", Role.enum.USER)
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.CONFLICT);
    });

    it("should return 400 for invalid registration data", async () => {
        const invalidData = {
            ...VALID_REGISTRATION,
            name: "", // I think we shouldn't allow empty names
        };

        await post("/registration/submit", Role.enum.USER)
            .send(invalidData)
            .expect(StatusCodes.BAD_REQUEST);
    });
});

describe("GET /registration", () => {
    it("should get registration data for an authenticated user", async () => {
        await Database.REGISTRATION.create({
            ...VALID_REGISTRATION,
            userId: TESTER.userId,
            hasSubmitted: true,
        });

        const response = await get("/registration", Role.enum.USER).expect(
            StatusCodes.OK
        );
        expect(response.body.registration.userId).toBe(TESTER.userId);
        expect(response.body.registration.hasSubmitted).toBe(true);
    });

    it("should return 401 if no registration data found", async () => {
        await get("/registration").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return error if no registration data found", async () => {
        // was timing out, changed return in the router to fix this
        const response = await get("/registration", Role.enum.USER).expect(
            StatusCodes.NOT_FOUND
        );
        expect(response.body).toEqual({ error: "DoesNotExist" });
    });
});

describe("GET /registration/all", () => {
    const baseRegistration = {
        graduation: "2025",
        major: "CS",
        jobInterest: ["Backend"],
        degree: "Bachelor",
        name: "Test User",
        email: "test@example.com",
        university: "UIUC",
        dietaryRestrictions: [],
        allergies: [],
        gender: "random gender",
        ethnicity: [],
        hearAboutRP: [],
        portfolios: ["https://portfolio.com"],
        isInterestedMechMania: false,
        isInterestedPuzzleBang: false,
        hasResume: true,
        hasSubmitted: true,
    };

    beforeEach(async () => {
        await Database.REGISTRATION.deleteMany({});
    });

    it("should return registrants for matching filters on page 1", async () => {
        const docs = Array.from({ length: 10 }, (_, i) => ({
            ...baseRegistration,
            userId: `filter-user-${i}`,
            email: `filter-user-${i}@test.com`,
        }));

        await Database.REGISTRATION.insertMany(docs);

        const filters = {
            graduations: ["2025"],
            majors: ["CS"],
            jobInterests: ["Backend"],
            degrees: ["Bachelor"],
        };

        const response = await get("/registration/all", Role.enum.ADMIN)
            .send(filters)
            .expect(StatusCodes.OK);

        expect(response.body.registrants.length).toBe(10);
        expect(response.body.registrants[0]).toHaveProperty("userId");
    });

    it("should return 401 if unauthenticated", async () => {
        await get("/registration/all")
            .send({})
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 if user is not ADMIN or CORPORATE", async () => {
        await get("/registration/all", Role.enum.USER)
            .send({})
            .expect(StatusCodes.FORBIDDEN);
    });
});
