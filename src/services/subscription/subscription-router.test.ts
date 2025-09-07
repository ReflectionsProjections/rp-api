import { beforeEach, describe, expect, it } from "@jest/globals";
import { post, getAsAdmin, postAsAdmin } from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import { IncomingSubscription } from "./subscription-schema";
import { SendEmailCommand } from "@aws-sdk/client-sesv2";

const EMAIL_1 = "testuser@example.com";
const EMAIL_2 = "otheruser@example.com";
const INVALID_EMAIL = "not-an-email";
const VALID_mailingList = "rp_interest";
const INVALID_mailingList = "invalid_list";

const SUBSCRIPTION_1 = {
    email: EMAIL_1,
    mailingList: VALID_mailingList,
} satisfies IncomingSubscription;
const SUBSCRIPTION_2 = {
    email: EMAIL_2,
    mailingList: VALID_mailingList,
} satisfies IncomingSubscription;
const SUBSCRIPTION_INVALID_EMAIL = {
    email: INVALID_EMAIL,
    mailingList: VALID_mailingList,
};
const SUBSCRIPTION_INVALID_LIST = {
    email: EMAIL_1,
    mailingList: INVALID_mailingList,
};

const mockSESV2Send = jest.fn();
jest.mock("@aws-sdk/client-sesv2", () => {
    return {
        SESv2Client: jest.fn(() => ({
            send: mockSESV2Send,
        })),
        SendEmailCommand: jest.fn((input) => input), // Mocks the command to return its input
    };
});

beforeEach(async () => {
    await SupabaseDB.SUBSCRIPTIONS.delete().neq(
        "mailingList",
        "a_value_that_will_never_exist"
    );
});

afterEach(async () => {
    await SupabaseDB.SUBSCRIPTIONS.delete().neq(
        "mailingList",
        "a_value_that_will_never_exist"
    );
});

describe("POST /subscription/", () => {
    it("should create a new subscription for a new mailing list", async () => {
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_1)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_1);
        const { data } = await SupabaseDB.SUBSCRIPTIONS.select().eq(
            "mailingList",
            VALID_mailingList
        );
        const dbEntry = data?.[0];
        expect(dbEntry).toMatchObject({
            mailingList: VALID_mailingList,
            subscriptions: [EMAIL_1],
        });
    }, 50000);

    it("should add a new email to an existing mailing list", async () => {
        await SupabaseDB.SUBSCRIPTIONS.insert([
            { mailingList: VALID_mailingList, subscriptions: [EMAIL_1] },
        ]);
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_2)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_2);
        const { data } = await SupabaseDB.SUBSCRIPTIONS.select().eq(
            "mailingList",
            VALID_mailingList
        );
        const dbEntry = data?.[0];
        expect(dbEntry).toMatchObject({
            mailingList: VALID_mailingList,
            subscriptions: expect.arrayContaining([EMAIL_1, EMAIL_2]),
        });
        expect(dbEntry?.subscriptions.length).toBe(2);
    });

    it("should not add duplicate emails to the same mailing list", async () => {
        await SupabaseDB.SUBSCRIPTIONS.insert([
            { mailingList: VALID_mailingList, subscriptions: [EMAIL_1] },
        ]);
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_1)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_1);
        const { data } = await SupabaseDB.SUBSCRIPTIONS.select().eq(
            "mailingList",
            VALID_mailingList
        );
        const dbEntry = data?.[0];
        expect(dbEntry?.subscriptions).toEqual([EMAIL_1]);
    });

    it.each([
        {
            description: "missing email",
            payload: { mailingList: VALID_mailingList },
        },
        {
            description: "missing mailingList",
            payload: { email: EMAIL_1 },
        },
        {
            description: "invalid email",
            payload: SUBSCRIPTION_INVALID_EMAIL,
        },
        {
            description: "invalid mailingList",
            payload: SUBSCRIPTION_INVALID_LIST,
        },
    ])("should return BAD_REQUEST when $description", async ({ payload }) => {
        await post("/subscription/")
            .send(payload)
            .expect(StatusCodes.BAD_REQUEST);
    });

    const SUBSCRIPTION_EXTRA = {
        ...SUBSCRIPTION_1,
        extraField: "should be ignored",
    };

    it("should ignore extra fields in the payload", async () => {
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_EXTRA)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_1);
        const { data } = await SupabaseDB.SUBSCRIPTIONS.select().eq(
            "mailingList",
            VALID_mailingList
        );
        const dbEntry = data?.[0];
        expect(dbEntry?.subscriptions).toEqual([EMAIL_1]);
    });

    it("should treat emails with different cases as the same subscription", async () => {
        await post("/subscription/").send({
            email: "test@example.com",
            mailingList: VALID_mailingList,
        });

        await post("/subscription/").send({
            email: "TEST@example.com",
            mailingList: VALID_mailingList,
        });

        const { data } = await SupabaseDB.SUBSCRIPTIONS.select().eq(
            "mailingList",
            VALID_mailingList
        );
        const dbEntry = data?.[0];

        expect(dbEntry?.subscriptions).toEqual(["test@example.com"]);
    });
});

describe("GET /subscription/", () => {
    it("should return an empty list when no subscriptions exist", async () => {
        const response = await getAsAdmin("/subscription/").expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual([]);
    });

    it("should return all subscriptions", async () => {
        const OTHER_VALID_LIST = "other_list";
        await SupabaseDB.SUBSCRIPTIONS.insert([
            { mailingList: VALID_mailingList, subscriptions: [EMAIL_1] },
            { mailingList: OTHER_VALID_LIST, subscriptions: [EMAIL_2] },
        ]);
        const response = await getAsAdmin("/subscription/").expect(
            StatusCodes.OK
        );

        expect(response.body.length).toBe(2);

        expect(response.body).toEqual(
            expect.arrayContaining([
                { mailingList: VALID_mailingList, subscriptions: [EMAIL_1] },
                { mailingList: OTHER_VALID_LIST, subscriptions: [EMAIL_2] },
            ])
        );
    });
});

describe("POST /subscription/send-email", () => {
    it("should send an email to all subscribers of a list", async () => {
        const mailingList = "test_list";
        const subscribers = ["email1@test.com", "email2@test.com"];
        await SupabaseDB.SUBSCRIPTIONS.insert({
            mailingList,
            subscriptions: subscribers,
        });

        const emailPayload = {
            mailingList: mailingList,
            subject: "Test Subject",
            htmlBody: "<p>Hello World</p>",
        };

        await postAsAdmin("/subscription/send-email")
            .send(emailPayload)
            .expect(StatusCodes.OK);

        expect(SendEmailCommand).toHaveBeenCalledWith({
            FromEmailAddress: process.env.FROM_EMAIL_ADDRESS,
            Destination: {
                ToAddresses: [process.env.FROM_EMAIL_ADDRESS],
                BccAddresses: subscribers,
            },
            Content: {
                Simple: {
                    Subject: { Data: "Test Subject" },
                    Body: { Html: { Data: "<p>Hello World</p>" } },
                },
            },
        });

        // Verify that the send method was actually invoked
        expect(mockSESV2Send).toHaveBeenCalledTimes(1);
    });
});
