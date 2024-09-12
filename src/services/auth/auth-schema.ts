import { Schema } from "mongoose";
import { z } from "zod";
import { Role } from "./auth-models";

export const RoleValidator = z.object({
    userId: z.coerce.string().regex(/user[0-9]*/),
    displayName: z.coerce.string(),
    email: z.coerce.string().email(),
    roles: z.array(Role).default([]),
});

export const AuthRoleChangeRequest = z.object({
    email: z.string().email(),
    role: z.string(),
});

export const RoleSchema = new Schema(
    {
        userId: {
            type: String,
        },
        displayName: {
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
