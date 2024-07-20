import { Schema } from "mongoose";
import { z } from "zod";

// Zod schema
export const CorporateValidator = z.object({
    email: z.string(),
});

// Mongoose schema
export const CorporateSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
});
