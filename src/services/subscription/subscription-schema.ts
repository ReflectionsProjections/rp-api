import mongoose from "mongoose";
import { z } from "zod";
import { MailingListName } from "../../config";

// Zod schema for subscription
const SubscriptionValidator = z.object({
    email: z.string().email(),
    mailingList: MailingListName,
});

// Mongoose schema for subscription
const SubscriptionSchema = new mongoose.Schema({
    email: { type: String, required: true },
    mailingList: { type: String, required: true },
});

export { SubscriptionValidator, SubscriptionSchema };
