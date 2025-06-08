import { describe, expect, it } from "@jest/globals";
import { post } from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { Database } from "../../database";
import { IncomingSubscription } from "./subscription-schema";

const EMAIL_1 = "testuser@example.com";
const EMAIL_2 = "otheruser@example.com";
const INVALID_EMAIL = "not-an-email";
const VALID_MAILING_LIST = "rp_interest";
const INVALID_MAILING_LIST = "invalid_list";

const SUBSCRIPTION_1 = { email: EMAIL_1, mailingList: VALID_MAILING_LIST } satisfies IncomingSubscription;
const SUBSCRIPTION_2 = { email: EMAIL_2, mailingList: VALID_MAILING_LIST } satisfies IncomingSubscription;
const SUBSCRIPTION_INVALID_EMAIL = { email: INVALID_EMAIL, mailingList: VALID_MAILING_LIST };
const SUBSCRIPTION_INVALID_LIST = { email: EMAIL_1, mailingList: INVALID_MAILING_LIST };

describe("POST /subscription/", () => {
    it("should create a new subscription for a new mailing list", async () => {
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_1)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_1);
        const dbEntry = await Database.SUBSCRIPTIONS.findOne({ mailingList: VALID_MAILING_LIST });
        expect(dbEntry?.toObject()).toMatchObject({
            mailingList: VALID_MAILING_LIST,
            subscriptions: [EMAIL_1],
        });
    });

    it("should add a new email to an existing mailing list", async () => {
        await Database.SUBSCRIPTIONS.create({
            mailingList: VALID_MAILING_LIST,
            subscriptions: [EMAIL_1],
        });
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_2)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_2);
        const dbEntry = await Database.SUBSCRIPTIONS.findOne({ mailingList: VALID_MAILING_LIST });
        expect(dbEntry?.toObject()).toMatchObject({
            mailingList: VALID_MAILING_LIST,
            subscriptions: expect.arrayContaining([EMAIL_1, EMAIL_2]),
        });
        expect(dbEntry?.subscriptions.length).toBe(2);
    });

    it("should not add duplicate emails to the same mailing list", async () => {
        await Database.SUBSCRIPTIONS.create({
            mailingList: VALID_MAILING_LIST,
            subscriptions: [EMAIL_1],
        });
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_1)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_1);
        const dbEntry = await Database.SUBSCRIPTIONS.findOne({ mailingList: VALID_MAILING_LIST });
        expect(dbEntry?.subscriptions).toEqual([EMAIL_1]);
    });

    const invalidPayloads = [
        {
            description: "missing email",
            payload: { mailingList: VALID_MAILING_LIST },
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
    ];

    it.each(invalidPayloads)(
        "should return BAD_REQUEST when $description",
        async ({ payload }) => {
            await post("/subscription/")
                .send(payload)
                .expect(StatusCodes.BAD_REQUEST);
        }
    );

    const SUBSCRIPTION_EXTRA = { ...SUBSCRIPTION_1, extraField: "should be ignored" };

    it("should ignore extra fields in the payload", async () => {
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_EXTRA)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_1);
        const dbEntry = await Database.SUBSCRIPTIONS.findOne({ mailingList: VALID_MAILING_LIST });
        expect(dbEntry?.subscriptions).toEqual([EMAIL_1]);
    });

    it("should treat emails with different cases as separate subscriptions", async () => {
        await post("/subscription/").send({ email: "test@example.com", mailingList: VALID_MAILING_LIST });
    
        await post("/subscription/").send({ email: "TEST@example.com", mailingList: VALID_MAILING_LIST });
    
        const dbEntry = await Database.SUBSCRIPTIONS.findOne({ mailingList: VALID_MAILING_LIST });
        expect(dbEntry?.subscriptions.length).toBe(1);
        expect(dbEntry?.subscriptions).toContain("test@example.com");
        expect(dbEntry?.subscriptions).not.toContain("TEST@example.com");
    });
});
