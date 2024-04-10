import mongoose from "mongoose";
import { z } from "zod";
import { MailingListName } from "../../config";

// Zod schema for subscription
const SubscriptionValidator = z.object({
    email: z.string().email(),
    mailing_list_name: MailingListName,
});

// Mongoose schema for subscription
const SubscriptionSchema = new mongoose.Schema({
    email: { type: String, required: true },
    mailing_list_name: { type: String, required: true },
});

export { SubscriptionValidator, SubscriptionSchema };
