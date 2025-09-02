import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { StatusCodes } from "http-status-codes";
import { get, post, TESTER } from "../../../testing/testingTools";
import { Role } from "../auth/auth-models";
import { sendHTMLEmail } from "../ses/ses-utils";
import { SupabaseDB } from "../../database";
import { render } from "mustache";
import templates from "../../templates/templates";

jest.mock("../ses/ses-utils", () => ({
    sendHTMLEmail: jest.fn(),
}));

const MUSTACHE_RENDER_RESULT = "<html>cool</html>";
jest.mock("mustache", () => ({
    render: jest.fn().mockImplementation(() => MUSTACHE_RENDER_RESULT),
}));

const VALID_DRAFT = {
    allergies: ["Peanuts"],
    allergiesOther: "",
    dietaryRestrictions: ["Vegetarian"],
    dietaryOther: "",
    educationLevel: "Undergraduate",
    educationOther: "",
    email: "test@example.com",
    ethnicity: ["Asian"],
    ethnicityOther: "",
    gender: "Male",
    genderOther: "",
    graduationYear: "2025",
    howDidYouHear: ["Social Media"],
    majors: ["Computer Science"],
    minors: ["Mathematics"],
    name: "Test User",
    opportunities: ["Internship"],
    personalLinks: ["https://github.com/testuser"],
    school: "University of Illinois",
    isInterestedMechMania: true,
    isInterestedPuzzleBang: false,
    tags: ["backend", "frontend"],
};

const VALID_REGISTRATION = {
    allergies: ["Peanuts"],
    dietaryRestrictions: ["Vegetarian"],
    educationLevel: "Undergraduate",
    email: "test@example.com",
    ethnicity: ["Asian"],
    gender: "Male",
    graduationYear: "2025",
    howDidYouHear: ["Social Media"],
    majors: ["Computer Science"],
    minors: [],
    name: "Test User",
    opportunities: ["Internship"],
    personalLinks: ["https://github.com/testuser"],
    school: "University of Illinois",
    isInterestedMechMania: true,
    isInterestedPuzzleBang: false,
    tags: ["backend", "frontend"],
    hasResume: true,
};

const VALID_REGISTRATION_NO_RESUME = {
    allergies: ["Peanuts"],
    dietaryRestrictions: ["Vegetarian"],
    educationLevel: "Undergraduate",
    email: "test2@example.com",
    ethnicity: ["Asian"],
    gender: "Male",
    graduationYear: "2025",
    howDidYouHear: ["Social Media"],
    majors: ["Computer Science"],
    minors: ["Mathematics"],
    name: "Test User 2",
    opportunities: ["Internship"],
    personalLinks: ["https://github.com/testuser2"],
    school: "University of Illinois",
    isInterestedMechMania: true,
    isInterestedPuzzleBang: false,
    tags: ["backend", "frontend"],
    hasResume: false,
};

beforeEach(async () => {
    jest.clearAllMocks();

    await SupabaseDB.ATTENDEES.delete()
        .neq("userId", "00000000-0000-0000-0000-000000000000")
        .throwOnError();
    await SupabaseDB.DRAFT_REGISTRATIONS.delete()
        .neq("userId", "00000000-0000-0000-0000-000000000000")
        .throwOnError();
    await SupabaseDB.REGISTRATIONS.delete()
        .neq("userId", "00000000-0000-0000-0000-000000000000")
        .throwOnError();
    await SupabaseDB.AUTH_ROLES.delete()
        .neq("userId", "00000000-0000-0000-0000-000000000000")
        .throwOnError();

    await SupabaseDB.AUTH_INFO.insert({
        ...TESTER,
        roles: undefined,
    }).throwOnError();
});

describe("POST /registration/draft", () => {
    it("should save a registration draft for an authenticated user", async () => {
        const response = await post("/registration/draft", Role.enum.USER)
            .send(VALID_DRAFT)
            .expect(StatusCodes.OK);

        expect(response.body.userId).toBe(TESTER.userId);

        const { data: dbEntry } = await SupabaseDB.DRAFT_REGISTRATIONS.select(
            "*"
        )
            .eq("userId", TESTER.userId)
            .single()
            .throwOnError();
        expect(dbEntry).toBeDefined();
    });

    it("should not allow unauthenticated users to save registration", async () => {
        await post("/registration/draft")
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should update an existing draft", async () => {
        await SupabaseDB.DRAFT_REGISTRATIONS.insert({
            ...VALID_DRAFT,
            userId: TESTER.userId,
        }).throwOnError();
        const updatedDraft = { ...VALID_DRAFT, name: "Updated Name" };
        const res = await post("/registration/draft", Role.enum.USER)
            .send(updatedDraft)
            .expect(StatusCodes.OK);

        expect(res.body.name).toEqual("Updated Name");

        const { data: dbEntry } = await SupabaseDB.DRAFT_REGISTRATIONS.select(
            "*"
        )
            .eq("userId", TESTER.userId)
            .single()
            .throwOnError();
        expect(dbEntry).toBeDefined();
        expect(dbEntry.name).toBe("Updated Name");
    });

    it("should return 400 for invalid registration data", async () => {
        const invalidRegistration = {
            ...VALID_REGISTRATION,
            email: "not-an-email",
        };

        await post("/registration/draft", Role.enum.USER)
            .send(invalidRegistration)
            .expect(StatusCodes.BAD_REQUEST);
    });
});

describe("GET /registration/draft", () => {
    it("should get registration draft for an authenticated user", async () => {
        await SupabaseDB.DRAFT_REGISTRATIONS.insert({
            ...VALID_DRAFT,
            userId: TESTER.userId,
        }).throwOnError();

        const response = await get(
            "/registration/draft",
            Role.enum.USER
        ).expect(StatusCodes.OK);

        expect(response.body.userId).toBe(TESTER.userId);
        expect(response.body.name).toBe(VALID_DRAFT.name);
    });

    it("should return 401 for unauthenticated users", async () => {
        await get("/registration/draft").expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 404 if no registration draft found", async () => {
        const response = await get(
            "/registration/draft",
            Role.enum.USER
        ).expect(StatusCodes.NOT_FOUND);
        expect(response.body).toEqual({ error: "DoesNotExist" });
    });
});

describe("POST /registration/submit", () => {
    it("should submit registration, create attendee, assign USER role, and send confirmation email", async () => {
        await post("/registration/submit", Role.enum.USER)
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.OK);

        const { data: reg } = await SupabaseDB.REGISTRATIONS.select("*")
            .eq("userId", TESTER.userId)
            .single()
            .throwOnError();
        expect(reg).toBeDefined();

        const { data: attendee } = await SupabaseDB.ATTENDEES.select("*")
            .eq("userId", TESTER.userId)
            .single()
            .throwOnError();
        expect(attendee).toBeDefined();

        await SupabaseDB.AUTH_ROLES.select("*")
            .eq("userId", TESTER.userId)
            .eq("role", Role.Enum.USER)
            .single()
            .throwOnError();

        const expectedSubs = {
            ...Object.fromEntries(
                Object.entries(VALID_REGISTRATION)
                    .filter(([key, _value]) => !["email"].includes(key))
                    .map(([key, value]) => [
                        key,
                        Array.isArray(value)
                            ? value.length == 0
                                ? "N/A"
                                : value.join(", ")
                            : value,
                    ])
            ),
            personalLinks: VALID_REGISTRATION.personalLinks,
        };
        expect(render).toHaveBeenCalledWith(
            templates.REGISTRATION_CONFIRMATION,
            expectedSubs
        );

        expect(sendHTMLEmail).toHaveBeenCalledWith(
            TESTER.email,
            expect.stringMatching(/confirmation/i),
            MUSTACHE_RENDER_RESULT
        );
    });

    it("updates existing registration", async () => {
        await SupabaseDB.REGISTRATIONS.insert({
            ...VALID_REGISTRATION,
            userId: TESTER.userId,
        }).throwOnError();
        const updated = { ...VALID_REGISTRATION, name: "Updated Name" };
        await post("/registration/submit", Role.Enum.USER)
            .send(updated)
            .expect(StatusCodes.OK);

        const { data: reg } = await SupabaseDB.REGISTRATIONS.select("*")
            .eq("userId", TESTER.userId)
            .single()
            .throwOnError();
        expect(reg?.name).toBe("Updated Name");

        const expectedSubs = {
            ...Object.fromEntries(
                Object.entries(updated)
                    .filter(([key, _value]) => !["email"].includes(key))
                    .map(([key, value]) => [
                        key,
                        Array.isArray(value)
                            ? value.length == 0
                                ? "N/A"
                                : value.join(", ")
                            : value,
                    ])
            ),
            personalLinks: VALID_REGISTRATION.personalLinks,
        };
        expect(render).toHaveBeenCalledWith(
            templates.REGISTRATION_UPDATE_CONFIRMATION,
            expectedSubs
        );

        expect(sendHTMLEmail).toHaveBeenCalledWith(
            TESTER.email,
            expect.stringMatching(/updated/i),
            MUSTACHE_RENDER_RESULT
        );
    });

    it("should not allow unauthenticated users to submit", async () => {
        await post("/registration/submit")
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.UNAUTHORIZED);
    });

    it("should return 400 for invalid registration data", async () => {
        const invalidData = {
            ...VALID_REGISTRATION,
            name: undefined,
        };

        await post("/registration/submit", Role.enum.USER)
            .send(invalidData)
            .expect(StatusCodes.BAD_REQUEST);
    });
});

describe("GET /registration/all", () => {
    it.each([Role.enum.ADMIN, Role.enum.CORPORATE])(
        "should return only registrants with resumes for %s",
        async (role) => {
            await post("/registration/submit", Role.Enum.USER).send(
                VALID_REGISTRATION
            );

            await SupabaseDB.AUTH_INFO.insert({
                userId: "test-user-2",
                authId: "123",
                displayName: "User 2",
                email: "test2@example.org",
            });

            await SupabaseDB.REGISTRATIONS.insert({
                ...VALID_REGISTRATION_NO_RESUME,
                userId: "test-user-2",
            }).throwOnError();

            const res = await get("/registration/all", role).expect(
                StatusCodes.OK
            );

            expect(res.body.length).toBe(1);
            expect(res.body[0]).toHaveProperty("userId");
            expect(res.body[0].name).toBe("Test User");
        }
    );

    it("returns 403 for non-ADMIN/CORPORATE", async () => {
        await get("/registration/all", Role.Enum.STAFF).expect(
            StatusCodes.FORBIDDEN
        );
    });

    it("should return 401 for unauthenticated users", async () => {
        await get("/registration/all").expect(StatusCodes.UNAUTHORIZED);
    });
});
