import mongoose from "mongoose";
import { z } from "zod";
import { MailingListName } from "../../config";

export type IncomingSubscription = z.infer<typeof SubscriptionValidator>;

// Zod schema for incoming user subscriptions
const SubscriptionValidator = z.object({
    userId: z.string(),
    mailingList: MailingListName,
});

// Zod schema for validating subscription lists
const SubscriptionSchemaValidator = z.object({
    userId: z.string(),
    mailingList: MailingListName,
});

// Mongoose schema for subscription
const SubscriptionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    mailingList: { type: String, required: true },
});

export {
    SubscriptionValidator,
    SubscriptionSchemaValidator,
    SubscriptionSchema,
};
