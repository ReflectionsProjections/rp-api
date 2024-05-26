import { Schema } from "mongoose";
import { z } from "zod";

export const TemplateValidator = z.object({
    templateId: z.coerce.string(),
    subject: z.coerce.string(),
    content: z.coerce.string().email(),
    substitutions: z.string().array(),
    usages: z.number().min(0).default(0),
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
    usages: {
        type: Number,
        default: 0,
    },
});
