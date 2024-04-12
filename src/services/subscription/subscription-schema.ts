import mongoose from "mongoose";
import { z } from "zod";
import { MailingListName } from "../../config";

// Zod schema for incoming user subscriptions
const SubscriptionValidator = z.object({
    email: z.string().email(),
    mailingList: MailingListName,
});

const SubscriptionSchemaValidator = z.object({
    mailingList: MailingListName,
    emailList: z.array(z.string().email()),
});

// Mongoose schema for subscription
const SubscriptionSchema = new mongoose.Schema({
    mailingList: { type: String, required: true },
    emailList: [{ type: String, required: true }],
});

export { 
    SubscriptionValidator,
    SubscriptionSchemaValidator,
    SubscriptionSchema 
};
