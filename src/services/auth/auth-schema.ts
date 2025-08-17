import { Schema } from "mongoose";
import { z } from "zod";
import { Platform, Role } from "./auth-models";
import { Database } from "../../supabase.types";

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
        platform: z.literal(Platform.WEB),
    }),
    // iOS/Android - codeVerifier is required
    z.object({
        code: z.string(),
        redirectUri: z.string(),
        codeVerifier: z.string(),
        platform: z.union([
            z.literal(Platform.IOS),
            z.literal(Platform.ANDROID),
        ]),
    }),
]);

export const AuthRoleChangeRequest = z.object({
    userId: z.string(),
    role: Role,
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
export type AuthInfo = Database["public"]["Tables"]["authInfo"]["Row"];
export type AuthRole = Database["public"]["Tables"]["authRoles"]["Row"];
