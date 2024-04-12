import mongoose from "mongoose";
import { z } from "zod";
import { MailingListName } from "../../config";

// Zod schema for incoming user subscriptions
const SubscriptionValidator = z.object({
    email: z.string().email(),
    mailingList: MailingListName,
});

// Zod schema for validating subscription lists
const SubscriptionSchemaValidator = z.object({
    mailingList: MailingListName,
    subscriptions: z.array(z.string().email()),
});

// Mongoose schema for subscription
const SubscriptionSchema = new mongoose.Schema({
    mailingList: { type: String, required: true },
    subscriptions: [{ type: String, required: true }],
});

export {
    SubscriptionValidator,
    SubscriptionSchemaValidator,
    SubscriptionSchema,
};
