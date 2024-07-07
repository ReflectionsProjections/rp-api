import { Schema } from "mongoose";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export const publicMerchValidator = z.object({
    merchId: z.coerce.string().default(() => uuidv4()),
    name: z.string(),
    points: z.number().min(0),
    description: z.string(),
    limit: z.number().min(1),
});

export const privateMerchValidator = publicMerchValidator.extend({
    amount_left: z.number(),
    isVisible: z.boolean(),
});

export const MerchSchema = new Schema({
    merchId: {
        type: String,
        required: true,
        unique: true,
        default: () => uuidv4(),
    },
    name: {
        type: String,
        required: true,
    },
    points: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    isVisible: {
        type: Boolean,
        default: false,
    },
    amount_left: {
        type: Number,
        required: false,
        default: 0,
    },
    limit: {
        type: Number,
        required: false,
        default: 1,
    },
});

export const AttendeeMerchSchema = new Schema({
    userId: {
        type: String,
        ref: "Attendee",
        required: true,
    },
    redeemed_items: [
        {
            type: String,
            ref: "Merch",
            required: true,
        },
    ],
});

// export const AttendeeMerchValidator = z.object({
//     userId: z.string(),
//     redeemed_items: z.array(z.string()),
// });
