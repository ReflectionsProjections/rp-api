import { beforeEach, describe, expect, it } from "@jest/globals";
import { post } from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../database";
import { IncomingSubscription } from "./subscription-schema";

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
