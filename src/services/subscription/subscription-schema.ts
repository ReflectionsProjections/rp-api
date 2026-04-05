import mongoose from "mongoose";
import { z } from "zod";
import { MailingListName } from "../../config";
import { registry } from "../../middleware/openapi-registry";

export type IncomingSubscription = z.infer<typeof SubscriptionValidator>;

// Zod schema for incoming user subscriptions
const SubscriptionValidator = registry.register(
    "SubscriptionValidator",
    z
        .object({
            userId: z.string(),
            mailingList: MailingListName,
        })
        .openapi("SubscriptionValidator", {
            example: { userId: "user_abc123", mailingList: "rp_interest" },
        })
);

// Zod schema for validating subscription lists
const SubscriptionSchemaValidator = z.object({
    userId: z.string(),
    mailingList: MailingListName,
});

export const SendEmailValidator = registry.register(
    "SendEmailValidator",
    z
        .object({
            mailingList: z.string(),
            subject: z.string(),
            htmlBody: z.string(),
        })
        .openapi("SendEmailValidator", {
            example: {
                mailingList: "rp_interest",
                subject: "R|P 2025 is here!",
                htmlBody: "<h1>Welcome to R|P 2025</h1>",
            },
        })
);

export const SendEmailSingleValidator = registry.register(
    "SendEmailSingleValidator",
    z
        .object({
            email: z.string().email(),
            subject: z.string(),
            htmlBody: z.string(),
        })
        .openapi("SendEmailSingleValidator", {
            example: {
                email: "hacker@example.com",
                subject: "Your R|P registration",
                htmlBody: "<p>Thanks for registering!</p>",
            },
        })
);

export const UnsubscribeValidator = registry.register(
    "UnsubscribeValidator",
    z
        .object({
            userId: z.string(),
            mailingList: z.string(),
        })
        .openapi("UnsubscribeValidator", {
            example: { userId: "user_abc123", mailingList: "rp_interest" },
        })
);

export const SubscriptionSuccessResponse = registry.register(
    "SubscriptionSuccessResponse",
    z
        .object({ status: z.literal("success") })
        .openapi("SubscriptionSuccessResponse", {
            example: { status: "success" },
        })
);

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
