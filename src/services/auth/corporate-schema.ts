import { Schema } from "mongoose";
import { z } from "zod";

// Zod schema
export const CorporateValidator = z.object({
    name: z.string(),
    email: z.string(),
});

// Zod schema
export const CorporateDeleteRequest = z.object({
    email: z.string(),
});

// Mongoose schema
export const CorporateSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
});
