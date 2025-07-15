import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { StatusCodes } from "http-status-codes";
import { get, post, TESTER } from "../../../testing/testingTools";
import { Database } from "../../database";
import { Role } from "../auth/auth-models";
import { sendHTMLEmail } from "../ses/ses-utils";
import Config from "../../config";

jest.mock("../ses/ses-utils", () => ({
    sendHTMLEmail: jest.fn(),
}));

const VALID_DRAFT = {
    name: "Draft User",
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
};

const VALID_REGISTRATION = {
    ...VALID_DRAFT,
    major: "CS",
};

const CONFIRMATION_EMAIL = `<!DOCTYPE html>
        <html>
            <body>
                <div class="container">
                    <p> Thank you for registering for R|P 2025. We have received your information, and will be sending next steps shortly.  </p>
                    
                    <p> Need to update your registration? Return to the 
                        <a href="${Config.WEB_REGISTER_ROUTE}">registration form</a>
                    to edit your responses!</p>

                    <p> For your reference, your submission included the following information: </p>
                    <ul>
                        <li> <b> Name: </b>  Draft User </li>
                        <li> <b> School: </b>  UIUC </li>
                        <li> <b> Education Level: </b>  Undergraduate </li>
                        <li> <b> Major: </b>  CS </li>
                        <li> <b> Graduation Year: </b>  2026 </li>
                        <li> <b> Dietary Restrictions: </b> Vegetarian </li>
                        <li> <b> Allergies: </b> Peanuts </li>
                        <li> <b> Gender: </b> Non-binary </li>
                        <li> <b> Race/Ethnicity: </b> Asian </li>
                        <li> <b> Personal Links: </b> https:&#x2F;&#x2F;draft.com </li>
                        <li> <b> Interest Tags: </b> tag1, tag2 </li>
                        <li> <b> Opportunities Interest: </b> Internship </li>
                    </ul>

                </div>
            </body>
        </html>
    `;

beforeEach(async () => {
    jest.clearAllMocks();
    await Database.DRAFT_REGISTRATION.deleteMany({});
    await Database.REGISTRATION.deleteMany({});
    await Database.ATTENDEE.deleteMany({});
    await Database.ROLES.deleteMany({});
});

describe("POST /registration/drafts", () => {
    it("should create a new draft if none exists", async () => {
        const res = await post("/registration/drafts", true)
            .send(VALID_DRAFT)
            .expect(StatusCodes.CREATED);

        expect(res.body).toEqual({ message: "Draft created" });

        const draft = await Database.DRAFT_REGISTRATION.findOne({
            userId: TESTER.userId,
        });
        expect(draft).toBeTruthy();
    });

    it("should update an existing draft", async () => {
        await Database.DRAFT_REGISTRATION.create({
            ...VALID_DRAFT,
            userId: TESTER.userId,
        });
        const updatedDraft = { ...VALID_DRAFT, name: "Updated Name" };
        const res = await post("/registration/drafts", true)
            .send(updatedDraft)
            .expect(StatusCodes.OK);
        expect(res.body).toEqual({ message: "Draft updated" });

        const draft = await Database.DRAFT_REGISTRATION.findOne({
            userId: TESTER.userId,
        });
        expect(draft?.name).toBe("Updated Name");
    });

    it("should return 400 for invalid draft data", async () => {
        await post("/registration/drafts", true)
            .send({ ...VALID_DRAFT, allergies: "not-an-array" })
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 401 for unauthenticated users", async () => {
        await post("/registration/drafts")
            .send(VALID_DRAFT)
            .expect(StatusCodes.UNAUTHORIZED);
    });
});

describe("GET /registration/drafts", () => {
    it("should return draft for authenticated user", async () => {
        await Database.DRAFT_REGISTRATION.create({
            ...VALID_DRAFT,
            userId: TESTER.userId,
        });
        const res = await get("/registration/drafts", true).expect(
            StatusCodes.OK
        );

        expect(res.body.userId).toBe(TESTER.userId);
        expect(res.body.name).toBe(VALID_DRAFT.name);
    });

    it("returns 404 if no draft exists", async () => {
        const res = await get("/registration/drafts", true).expect(
            StatusCodes.NOT_FOUND
        );

        expect(res.body).toEqual({ error: "NotFound" });
    });

    it("should return 401 for unauthenticated users", async () => {
        await get("/registration/drafts").expect(StatusCodes.UNAUTHORIZED);
    });
});

describe("POST /registration/submit", () => {
    it("creates new registration, attendee, role, and sends email", async () => {
        await post("/registration/submit", true)
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.CREATED);

        const reg = await Database.REGISTRATION.findOne({
            userId: TESTER.userId,
        });
        expect(reg).toBeTruthy();

        const attendee = await Database.ATTENDEE.findOne({
            userId: TESTER.userId,
        });
        expect(attendee).toBeTruthy();

        const roles = await Database.ROLES.findOne({ userId: TESTER.userId });
        expect(roles?.roles).toContain(Role.Values.USER);

        expect(sendHTMLEmail).toHaveBeenCalled();
        const emailArgs = (sendHTMLEmail as jest.Mock).mock.calls[0];
        expect(emailArgs[2]).toBe(CONFIRMATION_EMAIL);
    });

    it("updates existing registration", async () => {
        await Database.REGISTRATION.create({
            ...VALID_REGISTRATION,
            userId: TESTER.userId,
        });
        await post("/registration/submit", true)
            .send({ ...VALID_REGISTRATION, name: "Updated Name" })
            .expect(StatusCodes.OK);

        const reg = await Database.REGISTRATION.findOne({
            userId: TESTER.userId,
        });
        expect(reg?.name).toBe("Updated Name");

        expect(sendHTMLEmail).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid registration data", async () => {
        await post("/registration/submit", true)
            .send({ ...VALID_REGISTRATION, allergies: "not-an-array" })
            .expect(StatusCodes.BAD_REQUEST);
    });

    it("should return 401 for unauthenticated users", async () => {
        await post("/registration/submit")
            .send(VALID_REGISTRATION)
            .expect(StatusCodes.UNAUTHORIZED);
    });
});

describe("GET /registration/all", () => {
    beforeEach(async () => {
        await Database.REGISTRATION.deleteMany({});
    });

    it.each([Role.enum.ADMIN, Role.enum.CORPORATE])(
        "should return registrants for %s",
        async (role) => {
            await Database.REGISTRATION.insertMany([
                { ...VALID_REGISTRATION, userId: "user1", hasResume: true },
                { ...VALID_REGISTRATION, userId: "user2", hasResume: true },
                { ...VALID_REGISTRATION, userId: "user3", hasResume: false },
                { ...VALID_REGISTRATION, userId: "user4", hasResume: true },
            ]);
            const res = await get("/registration/all", true, [role]).expect(
                StatusCodes.OK
            );

            expect(res.body.registrants.length).toBe(3);
            expect(res.body.registrants[0]).toHaveProperty("userId");
            expect(res.body.registrants[0]).not.toHaveProperty("_id");
        }
    );

    it("returns 403 for non-ADMIN/CORPORATE", async () => {
        await get("/registration/all", true, [
            Role.enum.STAFF,
            Role.enum.USER,
        ]).expect(StatusCodes.FORBIDDEN);
    });

    it("should return 401 for unauthenticated users", async () => {
        await get("/registration/all").expect(StatusCodes.UNAUTHORIZED);
    });
});
