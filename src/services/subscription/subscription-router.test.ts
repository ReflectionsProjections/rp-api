import { beforeEach, describe, expect, it } from "@jest/globals";
import { post } from "../../../testing/testingTools";
import { StatusCodes } from "http-status-codes";
import { SupabaseDB } from "../../supabase";
import { IncomingSubscription } from "./subscription-schema";

const EMAIL_1 = "testuser@example.com";
const EMAIL_2 = "otheruser@example.com";
const INVALID_EMAIL = "not-an-email";
const VALID_MAILING_LIST = "rp_interest";
const INVALID_MAILING_LIST = "invalid_list";

const SUBSCRIPTION_1 = {
    email: EMAIL_1,
    mailing_list: VALID_MAILING_LIST,
} satisfies IncomingSubscription;
const SUBSCRIPTION_2 = {
    email: EMAIL_2,
    mailing_list: VALID_MAILING_LIST,
} satisfies IncomingSubscription;
const SUBSCRIPTION_INVALID_EMAIL = {
    email: INVALID_EMAIL,
    mailing_list: VALID_MAILING_LIST,
};
const SUBSCRIPTION_INVALID_LIST = {
    email: EMAIL_1,
    mailing_list: INVALID_MAILING_LIST,
};

beforeEach(async () => {
    await SupabaseDB.SUBSCRIPTIONS.delete().neq('mailing_list', 'a_value_that_will_never_exist');
});

describe("POST /subscription/", () => {
    it("should create a new subscription for a new mailing list", async () => {
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_1)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_1);
        const {data} = await SupabaseDB.SUBSCRIPTIONS.select().eq("mailing_list", VALID_MAILING_LIST);
        const dbEntry = data?.[0];
        expect(dbEntry).toMatchObject({
            mailing_list: VALID_MAILING_LIST,
            subscriptions: [EMAIL_1],
        });
    }, 50000);

    it("should add a new email to an existing mailing list", async () => {
        await SupabaseDB.SUBSCRIPTIONS.insert([{mailing_list: VALID_MAILING_LIST,
            subscriptions: [EMAIL_1],}]);
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_2)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_2);
        const {data} = await SupabaseDB.SUBSCRIPTIONS.select().eq("mailing_list", VALID_MAILING_LIST);
        const dbEntry = data?.[0];
        expect(dbEntry).toMatchObject({
            mailing_list: VALID_MAILING_LIST,
            subscriptions: expect.arrayContaining([EMAIL_1, EMAIL_2]),
        });
        expect(dbEntry?.subscriptions.length).toBe(2);
    });

    it("should not add duplicate emails to the same mailing list", async () => {
         await SupabaseDB.SUBSCRIPTIONS.insert([{mailing_list: VALID_MAILING_LIST,
            subscriptions: [EMAIL_1],}])
        const response = await post("/subscription/")
            .send(SUBSCRIPTION_1)
            .expect(StatusCodes.CREATED);
        expect(response.body).toEqual(SUBSCRIPTION_1);
        const {data} = await SupabaseDB.SUBSCRIPTIONS.select().eq("mailing_list", VALID_MAILING_LIST);
        const dbEntry = data?.[0];
        expect(dbEntry?.subscriptions).toEqual([EMAIL_1]);
    });

    it.each([
        {
            description: "missing email",
            payload: { mailing_list: VALID_MAILING_LIST },
        },
        {
            description: "missing mailing_list",
            payload: { email: EMAIL_1 },
        },
        {
            description: "invalid email",
            payload: SUBSCRIPTION_INVALID_EMAIL,
        },
        {
            description: "invalid mailing_list",
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
        const {data} = await SupabaseDB.SUBSCRIPTIONS.select().eq("mailing_list", VALID_MAILING_LIST);
        const dbEntry = data?.[0];
        expect(dbEntry?.subscriptions).toEqual([EMAIL_1]);

    });

    it("should treat emails with different cases as the same subscription", async () => {
        await post("/subscription/").send({
            email: "test@example.com",
            mailing_list: VALID_MAILING_LIST,
        });

        await post("/subscription/").send({
            email: "TEST@example.com",
            mailing_list: VALID_MAILING_LIST,
        });
       
        const {data} = await SupabaseDB.SUBSCRIPTIONS.select().eq("mailing_list", VALID_MAILING_LIST);
        const dbEntry = data?.[0];

        expect(dbEntry?.subscriptions).toEqual(["test@example.com"]);
    });
});
