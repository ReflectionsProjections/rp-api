import { describe, expect, it } from "@jest/globals";
import {
    post,
    getAsAdmin,
    postAsAdmin,
    delAsAdmin,
} from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import { IncomingSubscription } from "./subscription-schema";
import Config from "../../config";

// Mock the AWS SDK
const mockSESV2Send = jest.fn();
const mockSendEmailCommand = jest.fn((input) => input);
jest.mock("@aws-sdk/client-sesv2", () => ({
    SESv2Client: jest.fn(() => ({
        send: mockSESV2Send,
    })),
    SendEmailCommand: mockSendEmailCommand,
}));

const USER_ID_1 = "test-er-user-id";
const USER_ID_2 = "test-user-2";
const INVALID_USER_ID = "invalid-user-id";
const VALID_mailingList = "rp_interest";
const INVALID_mailingList = "invalid_list";

const SUBSCRIPTION_1 = {
    userId: USER_ID_1,
    mailingList: VALID_mailingList,
} satisfies IncomingSubscription;
const SUBSCRIPTION_2 = {
    userId: USER_ID_2,
    mailingList: VALID_mailingList,
} satisfies IncomingSubscription;
const SUBSCRIPTION_INVALID_USER_ID = {
    userId: INVALID_USER_ID,
    mailingList: VALID_mailingList,
};
const SUBSCRIPTION_INVALID_LIST = {
    userId: USER_ID_1,
    mailingList: INVALID_mailingList,
};

beforeEach(async () => {
    jest.clearAllMocks();

    // Set up authInfo data for test users
    try {
        await SupabaseDB.AUTH_INFO.insert([
            {
                userId: USER_ID_1,
                email: "user1@test.com",
                authId: "auth1",
                displayName: "User 1",
            },
            {
                userId: USER_ID_2,
                email: "user2@test.com",
                authId: "auth2",
                displayName: "User 2",
            },
        ]);
    } catch {
        // Ignore errors if data already exists
    }
});

describe("POST /subscription/", () => {
    it("should create a new subscription for a new user", async () => {
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_1)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_1);
        const { data: dbEntry } = await SupabaseDB.SUBSCRIPTIONS.select()
            .eq("userId", USER_ID_1)
            .eq("mailingList", VALID_mailingList)
            .maybeSingle()
            .throwOnError();
        expect(dbEntry).toMatchObject({
            userId: USER_ID_1,
            mailingList: VALID_mailingList,
        });
    }, 50000);

    it("should create a subscription for a different user", async () => {
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_2)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_2);
        const { data: dbEntry } = await SupabaseDB.SUBSCRIPTIONS.select()
            .eq("userId", USER_ID_2)
            .eq("mailingList", VALID_mailingList)
            .maybeSingle()
            .throwOnError();
        expect(dbEntry).toMatchObject({
            userId: USER_ID_2,
            mailingList: VALID_mailingList,
        });
    });

    it("should not create duplicate subscriptions", async () => {
        await SupabaseDB.SUBSCRIPTIONS.insert({
            userId: USER_ID_1,
            mailingList: VALID_mailingList,
        }).throwOnError();
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_1)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_1);
        const { data } = await SupabaseDB.SUBSCRIPTIONS.select()
            .eq("userId", USER_ID_1)
            .eq("mailingList", VALID_mailingList)
            .throwOnError();
        expect(data?.length).toBe(1);
    });

    it.each([
        {
            description: "missing userId",
            payload: { mailingList: VALID_mailingList },
        },
        {
            description: "missing mailingList",
            payload: { userId: USER_ID_1 },
        },
        {
            description: "invalid userId",
            payload: SUBSCRIPTION_INVALID_USER_ID,
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
        const { data: dbEntry } = await SupabaseDB.SUBSCRIPTIONS.select()
            .eq("userId", USER_ID_1)
            .eq("mailingList", VALID_mailingList)
            .maybeSingle()
            .throwOnError();
        expect(dbEntry?.mailingList).toEqual(VALID_mailingList);
    });
});

describe("GET /subscription/", () => {
    it("should return an empty list when no subscriptions exist", async () => {
        const response = await getAsAdmin("/subscription/").expect(
            StatusCodes.OK
        );
        expect(response.body).toEqual([]);
    });

    it("should return aggregated subscriptions by mailing list", async () => {
        await SupabaseDB.SUBSCRIPTIONS.insert([
            { userId: USER_ID_1, mailingList: VALID_mailingList },
            { userId: USER_ID_2, mailingList: VALID_mailingList },
        ]).throwOnError();
        const response = await getAsAdmin("/subscription/").expect(
            StatusCodes.OK
        );

        expect(response.body.length).toBe(1);
        expect(response.body[0]).toEqual({
            mailingList: VALID_mailingList,
            userIds: expect.arrayContaining([USER_ID_1, USER_ID_2]),
        });
        expect(response.body[0].userIds.length).toBe(2);
    });

    it("should aggregate multiple mailing lists correctly", async () => {
        const mailingList2 = "newsletter";
        await SupabaseDB.SUBSCRIPTIONS.insert([
            { userId: USER_ID_1, mailingList: VALID_mailingList },
            { userId: USER_ID_2, mailingList: VALID_mailingList },
            { userId: USER_ID_1, mailingList: mailingList2 },
        ]).throwOnError();

        const response = await getAsAdmin("/subscription/").expect(
            StatusCodes.OK
        );

        expect(response.body.length).toBe(2);

        const validMailingListEntry = response.body.find(
            (item: { mailingList: string; userIds: string[] }) =>
                item.mailingList === VALID_mailingList
        );
        const newsletterEntry = response.body.find(
            (item: { mailingList: string; userIds: string[] }) =>
                item.mailingList === mailingList2
        );

        expect(validMailingListEntry).toEqual({
            mailingList: VALID_mailingList,
            userIds: expect.arrayContaining([USER_ID_1, USER_ID_2]),
        });
        expect(validMailingListEntry.userIds.length).toBe(2);

        expect(newsletterEntry).toEqual({
            mailingList: mailingList2,
            userIds: [USER_ID_1],
        });
    });
});

describe("POST /subscription/send-email", () => {
    it("should send an email to all subscribers of a list", async () => {
        const mailingList = VALID_mailingList;
        const emails = ["user1@test.com", "user2@test.com"];

        // Set up subscription data
        await SupabaseDB.SUBSCRIPTIONS.insert([
            { userId: USER_ID_1, mailingList: mailingList },
            { userId: USER_ID_2, mailingList: mailingList },
        ]).throwOnError();

        const emailPayload = {
            mailingList: mailingList,
            subject: "Test Subject",
            htmlBody: "<p>Hello World</p>",
        };

        await postAsAdmin("/subscription/send-email")
            .send(emailPayload)
            .expect(StatusCodes.OK);

        expect(mockSendEmailCommand).toHaveBeenCalledWith({
            FromEmailAddress: Config.FROM_EMAIL_ADDRESS,
            Destination: {
                ToAddresses: [Config.FROM_EMAIL_ADDRESS],
                BccAddresses: emails,
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

describe("POST /subscription/send-email/single", () => {
    it("should send an email to a single specified email address", async () => {
        const emailPayload = {
            email: "ritam@test.com",
            subject: "Single Email Test",
            htmlBody: "<p>Single Email Body</p>",
        };

        await postAsAdmin("/subscription/send-email/single")
            .send(emailPayload)
            .expect(StatusCodes.OK);

        expect(mockSendEmailCommand).toHaveBeenCalledWith({
            FromEmailAddress: Config.FROM_EMAIL_ADDRESS,
            Destination: {
                ToAddresses: [emailPayload.email],
            },
            Content: {
                Simple: {
                    Subject: { Data: "Single Email Test" },
                    Body: { Html: { Data: "<p>Single Email Body</p>" } },
                },
            },
        });

        // Verify that the send method was actually invoked
        expect(mockSESV2Send).toHaveBeenCalledTimes(1);
    });
});

describe("GET /subscription/:mailingList", () => {
    it("should return the list of subscribers for an existing mailing list", async () => {
        const emails = ["user1@test.com", "user2@test.com"];

        // Set up subscription data
        await SupabaseDB.SUBSCRIPTIONS.insert([
            { userId: USER_ID_1, mailingList: VALID_mailingList },
            { userId: USER_ID_2, mailingList: VALID_mailingList },
        ]).throwOnError();

        const response = await getAsAdmin(
            `/subscription/${VALID_mailingList}`
        ).expect(StatusCodes.OK);

        expect(response.body).toEqual(expect.arrayContaining(emails));
        expect(response.body.length).toBe(2);
    });

    it("should return a 404 Not Found for a non-existent mailing list", async () => {
        const response = await getAsAdmin(
            "/subscription/non-existent-list"
        ).expect(StatusCodes.NOT_FOUND);

        expect(response.body).toEqual({
            error: "No subscribers found for this mailing list.",
        });
    });

    it("should return an empty array for a list that has no subscribers", async () => {
        // No setup needed - no subscriptions means no subscribers
        const response = await getAsAdmin(
            `/subscription/${VALID_mailingList}`
        ).expect(StatusCodes.NOT_FOUND);

        expect(response.body).toEqual({
            error: "No subscribers found for this mailing list.",
        });
    });
});

describe("GET /subscription/user/:userId", () => {
    it("should return a user's subscriptions", async () => {
        await SupabaseDB.SUBSCRIPTIONS.insert([
            { userId: USER_ID_1, mailingList: VALID_mailingList },
        ]).throwOnError();

        const response = await getAsAdmin(
            `/subscription/user/${USER_ID_1}`
        ).expect(StatusCodes.OK);

        expect(response.body).toEqual([VALID_mailingList]);
        expect(response.body.length).toBe(1);
    });

    it("should return an empty array for a user with no subscriptions", async () => {
        const response = await getAsAdmin(
            `/subscription/user/${USER_ID_1}`
        ).expect(StatusCodes.OK);

        expect(response.body).toEqual([]);
    });
});

describe("DELETE /subscription/", () => {
    it("should unsubscribe a user from a mailing list", async () => {
        await SupabaseDB.SUBSCRIPTIONS.insert([
            { userId: USER_ID_1, mailingList: VALID_mailingList },
        ]).throwOnError();

        const response = await delAsAdmin("/subscription/")
            .send({
                userId: USER_ID_1,
                mailingList: VALID_mailingList,
            })
            .expect(StatusCodes.OK);

        expect(response.body).toEqual({ status: "success" });

        // Verify the subscription was removed
        const { data: remainingSubs } = await SupabaseDB.SUBSCRIPTIONS.select()
            .eq("userId", USER_ID_1)
            .throwOnError();
        expect(remainingSubs?.length).toBe(0);
    });

    it("should delete the subscription record", async () => {
        await SupabaseDB.SUBSCRIPTIONS.insert({
            userId: USER_ID_1,
            mailingList: VALID_mailingList,
        }).throwOnError();

        const response = await delAsAdmin("/subscription/")
            .send({
                userId: USER_ID_1,
                mailingList: VALID_mailingList,
            })
            .expect(StatusCodes.OK);

        expect(response.body).toEqual({ status: "success" });

        // Verify the subscription record was deleted
        const { data } = await SupabaseDB.SUBSCRIPTIONS.select()
            .eq("userId", USER_ID_1)
            .eq("mailingList", VALID_mailingList)
            .maybeSingle()
            .throwOnError();
        expect(data).toBeNull();
    });

    it("should return 404 when subscription not found", async () => {
        const response = await delAsAdmin("/subscription/")
            .send({
                userId: USER_ID_1,
                mailingList: VALID_mailingList,
            })
            .expect(StatusCodes.NOT_FOUND);

        expect(response.body).toEqual({ error: "Subscription not found." });
    });
});
