import { InferSchemaType, Schema } from "mongoose";
import { z } from "zod";
import { registry } from "../../middleware/openapi-registry";

// Zod schema
export const CorporateValidator = registry.register(
    "CorporateValidator",
    z
        .object({
            name: z.string(),
            email: z.string(),
        })
        .openapi("CorporateValidator", {
            example: { name: "Acme Corp", email: "sponsor@acme.com" },
        })
);

// Zod schema
export const CorporateDeleteRequest = registry.register(
    "CorporateDeleteRequest",
    z
        .object({
            email: z.string(),
        })
        .openapi("CorporateDeleteRequest", {
            example: { email: "sponsor@acme.com" },
        })
);

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
export type Corporate = InferSchemaType<typeof CorporateSchema>;
