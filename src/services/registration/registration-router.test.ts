import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { post, get } from "../../../testing/testingTools";
import { TESTER } from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../supabase";
import { Role } from "../auth/auth-models";
import Config from "../../config";
import { sendHTMLEmail } from "../ses/ses-utils";
import { RegistrationValidator } from "./registration-schema";
import { z } from "zod";

jest.mock("../ses/ses-utils", () => ({
    sendHTMLEmail: jest.fn(),
}));

jest.mock("./registration-utils", () => ({
    ...(jest.requireActual(
        "./registration-utils"
    ) as typeof import("./registration-utils")),
    generateEncryptedId: jest.fn(() => Promise.resolve("mock-encrypted-id")),
}));

type RegistrationData = z.infer<typeof RegistrationValidator>;

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

// Helper function to convert camelCase registration data to snake_case for database insertion
const toDbRegistration = (
    registration: Omit<RegistrationData, "userId">,
    userId: string,
    hasSubmitted = false
) => ({
    user_id: userId,
    name: registration.name,
    email: registration.email,
    university: registration.university,
    graduation: registration.graduation,
    major: registration.major,
    degree: registration.degree,
    dietary_restrictions: registration.dietaryRestrictions,
    allergies: registration.allergies,
    gender: registration.gender,
    ethnicity: registration.ethnicity,
    hear_about_rp: registration.hearAboutRP,
    portfolios: registration.portfolios,
    job_interest: registration.jobInterest,
    is_interested_mech_mania: registration.isInterestedMechMania,
    is_interested_puzzle_bang: registration.isInterestedPuzzleBang,
    has_resume: registration.hasResume,
    has_submitted: hasSubmitted,
});

// Helper function to create test role record
const createTestRole = (userId: string, displayName: string, email: string, roles: ("USER" | "STAFF" | "ADMIN" | "CORPORATE" | "PUZZLEBANG")[] = []) => ({
    user_id: userId,
    display_name: displayName,
    email: email,
    roles: roles,
});

beforeEach(async () => {
    await SupabaseDB.ATTENDEES.delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
    await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
    await SupabaseDB.ROLES.delete().neq("user_id", "00000000-0000-0000-0000-000000000000");

    await SupabaseDB.ROLES.insert(createTestRole(TESTER.userId, TESTER.displayName, TESTER.email));
});

describe("POST /registration/save", () => {
    it("should save a registration draft for an authenticated user", async () => {
        const response = await post("/registration/save", Role.enum.USER)
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.OK);

        expect(response.body.userId).toBe(TESTER.userId);
        expect(response.body.hasSubmitted).toBeFalsy();

        const { data: dbEntry } = await SupabaseDB.REGISTRATIONS
            .select("*")
            .eq("user_id", TESTER.userId)
            .single();
        expect(dbEntry).toBeDefined();
        expect(dbEntry?.has_submitted).toBe(false);
    });

    it("should not allow unauthenticated users to save registration", async () => {
        await post("/registration/save")
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 409 if user already submitted registration", async () => {
        await SupabaseDB.REGISTRATIONS.insert(toDbRegistration(VALID_REGISTRATION, TESTER.userId, true));

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

        const { data: reg } = await SupabaseDB.REGISTRATIONS
            .select("*")
            .eq("user_id", TESTER.userId)
            .single();
        expect(reg?.has_submitted).toBe(true);

        const { data: attendee } = await SupabaseDB.ATTENDEES
            .select("*")
            .eq("user_id", TESTER.userId)
            .single();
        expect(attendee).toBeDefined();
        // Note: attendee table doesn't have email field, it only has user_id

        const { data: roles } = await SupabaseDB.ROLES
            .select("*")
            .eq("user_id", TESTER.userId)
            .single();
        expect(roles?.roles).toContain(Role.enum.USER);
        expect(sendHTMLEmail).toHaveBeenCalled();
    });

    it("should not allow unauthenticated users to submit", async () => {
        await post("/registration/submit")
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 409 if user already submitted", async () => {
        await SupabaseDB.REGISTRATIONS.insert(toDbRegistration(VALID_REGISTRATION, TESTER.userId, true));

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
        await SupabaseDB.REGISTRATIONS.insert(toDbRegistration(VALID_REGISTRATION, TESTER.userId, true));

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

describe("POST /registration/filter/pagecount", () => {
    const NUM_ENTRIES = 53;
    const entriesPerPage = Config.SPONSOR_ENTIRES_PER_PAGE;

    beforeEach(async () => {
        await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
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

        const bulkRoles = Array.from({ length: NUM_ENTRIES }, (_, i) => 
            createTestRole(`user${i}`, `Test User ${i}`, `user${i}@example.com`)
        );
        await SupabaseDB.ROLES.insert(bulkRoles);

        const bulkDocs = Array.from({ length: NUM_ENTRIES }, (_, i) => 
            toDbRegistration({
                ...base,
                email: `user${i}@example.com`,
            }, `user${i}`, true)
        );

        await SupabaseDB.REGISTRATIONS.insert(bulkDocs);

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
        await SupabaseDB.REGISTRATIONS.delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
    });

    it("should return registrants for matching filters on page 1", async () => {

        const bulkRoles = Array.from({ length: 10 }, (_, i) => 
            createTestRole(`filter-user-${i}`, `Filter User ${i}`, `filter-user-${i}@test.com`)
        );
        await SupabaseDB.ROLES.insert(bulkRoles);

        const docs = Array.from({ length: 10 }, (_, i) => 
            toDbRegistration({
                ...baseRegistration,
                email: `filter-user-${i}@test.com`,
            }, `filter-user-${i}`, true)
        );

        await SupabaseDB.REGISTRATIONS.insert(docs);

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
