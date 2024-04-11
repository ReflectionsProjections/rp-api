import { Schema } from "mongoose";
import { z } from "zod";
import { Role } from "./auth-models";


export const RoleValidator = z.object({
    userId: z.coerce.string().regex(/user[0-9]*/),
    name: z.coerce.string(),
    email: z.coerce.string().email(),
    roles: z.array(Role),
});

export const RoleSchema = new Schema(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        roles: {
            type: [String],
            enum: Role.Values,
            default: [],
            required: true,
        },
    },
    { timestamps: { createdAt: "createdAt" } }
);
