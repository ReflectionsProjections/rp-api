import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { StatusCodes } from "http-status-codes";
import { get, post, TESTER } from "../../../testing/testingTools";
import { Role } from "../auth/auth-models";
import { sendHTMLEmail } from "../ses/ses-utils";
import { SupabaseDB } from "../../supabase";

jest.mock("../ses/ses-utils", () => ({
    sendHTMLEmail: jest.fn(),
}));

const VALID_DRAFT = {
    userId: "1234",
    name: "Draft User",
    email: "fake@gmail.com",
    school: "UIUC",
    educationLevel: "Undergraduate",
    graduationYear: "2026",
    dietaryRestrictions: ["Vegetarian"],
    allergies: ["Peanuts"],
    gender: "Non-binary",
    ethnicity: ["Asian"],
    personalLinks: ["https://draft.com"],
    tags: ["tag1", "tag2"],
    opportunities: ["Internship"],
    howDidYouHear: ["Newsletter"],
    minors: [],
};

const VALID_REGISTRATION = {
    ...VALID_DRAFT,
    majors: ["CS"],
    resume: "resume.pdf",
};

beforeEach(async () => {
    jest.clearAllMocks();

    await SupabaseDB.ATTENDEES.delete().neq(
        "userId",
        "00000000-0000-0000-0000-000000000000"
    );
    await SupabaseDB.DRAFT_REGISTRATIONS.delete().neq(
        "userId",
        "00000000-0000-0000-0000-000000000000"
    );
    await SupabaseDB.REGISTRATIONS.delete().neq(
        "userId",
        "00000000-0000-0000-0000-000000000000"
    );
    await SupabaseDB.ROLES.delete().neq(
        "userId",
        "00000000-0000-0000-0000-000000000000"
    );

    await SupabaseDB.ROLES.insert(TESTER);
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

        const { data: draft_reg } = await SupabaseDB.DRAFT_REGISTRATIONS.select(
            "*"
        )
            .eq("userId", TESTER.userId)
            .single()
            .throwOnError();
        expect(draft_reg).toBeDefined();

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

        const { data: roles } = await SupabaseDB.ROLES.select("*")
            .eq("userId", TESTER.userId)
            .single()
            .throwOnError();
        expect(roles?.roles).toContain(Role.enum.USER);
        expect(sendHTMLEmail).toHaveBeenCalled();
    });

    it("updates existing registration", async () => {
        await SupabaseDB.REGISTRATIONS.insert({
            ...VALID_REGISTRATION,
            userId: TESTER.userId,
        }).throwOnError();
        await post("/registration/submit", Role.Enum.USER)
            .send({ ...VALID_REGISTRATION, name: "Updated Name" })
            .expect(StatusCodes.OK);

        const { data: reg } = await SupabaseDB.REGISTRATIONS.select("*")
            .eq("userId", TESTER.userId)
            .single();
        expect(reg?.name).toBe("Updated Name");

        expect(sendHTMLEmail).not.toHaveBeenCalled();
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
        "should return registrants for %s",
        async (role) => {
            await post("/registration/submit", Role.Enum.USER).send(
                VALID_REGISTRATION
            );

            const res = await get("/registration/all", role).expect(
                StatusCodes.OK
            );

            expect(res.body.length).toBe(1);
            expect(res.body[0]).toHaveProperty("userId");
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
