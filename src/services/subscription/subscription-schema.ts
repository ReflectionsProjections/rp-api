import mongoose from "mongoose";
import { z } from "zod";
import { MailingListName } from "../../config";

export type IncomingSubscription = z.infer<typeof SubscriptionValidator>;

// Zod schema for incoming user subscriptions
const SubscriptionValidator = z.object({
    email: z.string().email(),
    mailing_list: MailingListName,
});

// Zod schema for validating subscription lists
const SubscriptionSchemaValidator = z.object({
    mailing_list: MailingListName,
    subscriptions: z.array(z.string().email()),
});

// Mongoose schema for subscription
const SubscriptionSchema = new mongoose.Schema({
    mailing_list: { type: String, required: true },
    subscriptions: [{ type: String, required: true }],
});

export {
    SubscriptionValidator,
    SubscriptionSchemaValidator,
    SubscriptionSchema,
};
