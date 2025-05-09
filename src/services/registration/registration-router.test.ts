import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { post, get } from "../../../testing/testingTools";
import { TESTER } from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import { Role } from "../auth/auth-models";
import Config from "../../config";
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

/*
Save tests:
1) Saves a new reg draft for an authenticated user
2) Fails if already submitted reg
3) Requires authentication
4) Registration data is valid
*/

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

/*
Submit tests:
1) Submits a new reg for an authenticated user
2) Fails if already submitted reg
3) Adds USER role to the submitter
4) Send confirmation email (mocked)
5) Creates attendee
6) Validates the input
7) Requires authentication
*/

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

/*
GET tests:
1) Get registration data for an authenticated user
2) Requires authentication
3) Returns 401 if no registration data found
*/

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

/*
POST filter pagecount tests:
1) Should return correct page count for matching filters
2) Should return 0 pages if no records match filters
3) Should return 401 for unauthenticated users
4) Should return 403 for users without ADMIN or CORPORATE role
5) Should return 400 if invalid filters are sent
*/

describe("POST /registration/filter/pagecount", () => {
    const NUM_ENTRIES = 53;
    const entriesPerPage = Config.SPONSOR_ENTIRES_PER_PAGE;

    beforeEach(async () => {
        await Database.REGISTRATION.deleteMany({});
    });

    it("should return correct page count for matching filters", async () => {
        const base = {
            graduation: "2025",
            major: "CS",
            jobInterest: ["Backend"],
            degree: "Bachelor",
            name: "Test User",
            email: "test@example.com",
            university: "UIUC",
            dietaryRestrictions: [],
            allergies: [],
            gender: "Female",
            ethnicity: [],
            hearAboutRP: [],
            portfolios: ["https://portfolio.com"],
            isInterestedMechMania: false,
            isInterestedPuzzleBang: false,
            hasResume: true,
            hasSubmitted: true,
        };

        const bulkDocs = Array.from({ length: NUM_ENTRIES }, (_, i) => ({
            ...base,
            userId: `user${i}`,
            email: `user${i}@example.com`,
        }));

        await Database.REGISTRATION.insertMany(bulkDocs);

        const filters = {
            graduations: ["2025"],
            majors: ["CS"],
            jobInterests: ["Backend"],
            degrees: ["Bachelor"],
        };

        const response = await post(
            "/registration/filter/pagecount",
            Role.enum.ADMIN
        )
            .send(filters)
            .expect(StatusCodes.OK);

        const expectedPageCount = Math.ceil(NUM_ENTRIES / entriesPerPage);
        expect(response.body.pagecount).toBe(expectedPageCount);
    });

    it("should return 0 pages if no records match", async () => {
        const filters = {
            graduations: ["3000"],
            majors: ["Astrophysics"],
            jobInterests: ["Zookeeper"],
            degrees: ["PhD"],
        };

        const response = await post(
            "/registration/filter/pagecount",
            Role.enum.ADMIN
        )
            .send(filters)
            .expect(StatusCodes.OK);

        expect(response.body.pagecount).toBe(0);
    });

    it("should return 401 for unauthenticated users", async () => {
        await post("/registration/filter/pagecount")
            .send({})
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 for users without permission", async () => {
        await post("/registration/filter/pagecount", Role.enum.USER)
            .send({})
            .expect(StatusCodes.FORBIDDEN);
    });

    it("should return 400 if filters are invalid", async () => {
        const badFilters = {
            graduations: "not-an-array",
        };

        await post("/registration/filter/pagecount", Role.enum.ADMIN)
            .send(badFilters)
            .expect(StatusCodes.BAD_REQUEST);
    });
});

describe("POST /registration/filter/:PAGE", () => {
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

        const response = await post("/registration/filter/1", Role.enum.ADMIN)
            .send(filters)
            .expect(StatusCodes.OK);

        expect(response.body.page).toBe(1);
        expect(response.body.registrants.length).toBe(10);
        expect(response.body.registrants[0]).toHaveProperty("userId");
    });

    it("should return empty array if page exceeds data", async () => {
        const filters = {
            graduations: ["2025"],
            majors: ["CS"],
            jobInterests: ["Backend"],
            degrees: ["Bachelor"],
        };

        const response = await post("/registration/filter/999", Role.enum.ADMIN)
            .send(filters)
            .expect(StatusCodes.OK);

        expect(response.body.page).toBe(999);
        expect(response.body.registrants).toEqual([]);
    });

    it("should return 400 for invalid page number", async () => {
        await post("/registration/filter/notanumber", Role.enum.ADMIN)
            .send({})
            .expect(StatusCodes.BAD_REQUEST);

        await post("/registration/filter/0", Role.enum.ADMIN)
            .send({})
            .expect(StatusCodes.BAD_REQUEST);

        await post("/registration/filter/-5", Role.enum.ADMIN)
            .send({})
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 401 if unauthenticated", async () => {
        await post("/registration/filter/1")
            .send({})
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 403 if user is not ADMIN or CORPORATE", async () => {
        await post("/registration/filter/1", Role.enum.USER)
            .send({})
            .expect(StatusCodes.FORBIDDEN);
    });

    it("should return 400 for invalid filter schema", async () => {
        const badFilters = {
            graduations: "not-an-array", // should be array
        };

        await post("/registration/filter/1", Role.enum.ADMIN)
            .send(badFilters)
            .expect(StatusCodes.BAD_REQUEST);
    });
});
