import { Schema } from "mongoose";
import { z } from "zod";

export const TemplateValidator = z.object({
    templateId: z.string().regex(/^\S*$/, {
        message: "Spaces Not Allowed",
    }),
    subject: z.string(),
    content: z.string(),
    substitutions: z.string().array().default([]),
});

export const TemplateSchema = new Schema({
    templateId: {
        type: String,
        required: true,
        unique: true,
    },
    subject: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    substitutions: {
        type: [String],
        required: true,
    },
});
