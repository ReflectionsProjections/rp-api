import { InferSchemaType, Schema } from "mongoose";
import { z } from "zod";
import { Role, Platform } from "./auth-models";

export const RoleValidator = z.object({
    userId: z.coerce.string(),
    displayName: z.coerce.string(),
    email: z.coerce.string().email(),
    roles: z.array(Role).default([]),
});

export const AuthLoginValidator = z.union([
    // Web platform - no codeVerifier needed
    z.object({
        code: z.string(),
        redirectUri: z.string(),
        platform: z.literal(Platform.Enum.WEB),
    }),
    // iOS/Android - codeVerifier is required
    z.object({
        code: z.string(),
        redirectUri: z.string(),
        codeVerifier: z.string(),
        platform: z.literal(Platform.Enum.IOS), // TODO: add ANDROID
    }),
]);

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
export type Roles = InferSchemaType<typeof RoleSchema>;
