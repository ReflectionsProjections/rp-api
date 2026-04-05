import { Schema } from "mongoose";
import { z } from "zod";
import { Platform, Role } from "./auth-models";
import { Database } from "../../database.types";
import { registry } from "../../middleware/openapi-registry";

export const RoleValidator = registry.register(
    "RoleValidator",
    z
        .object({
            userId: z.coerce.string(),
            displayName: z.coerce.string(),
            email: z.coerce.string().email(),
            roles: z.array(Role).default([]),
        })
        .openapi("RoleValidator", {
            example: {
                userId: "abc123",
                displayName: "Jane Doe",
                email: "jane@example.com",
                roles: ["USER"],
            },
        })
);

export const AuthLoginValidator = registry.register(
    "AuthLoginValidator",
    z
        .union([
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
        ])
        .openapi("AuthLoginValidator", {
            description:
                "Login request body. Web omits codeVerifier; iOS/Android require it.",
            example: {
                code: "4/0AfJohXk...",
                redirectUri: "https://app.example.com/auth/callback",
                platform: Platform.WEB,
            },
        })
);

export const AuthRoleChangeRequest = registry.register(
    "AuthRoleChangeRequest",
    z
        .object({
            userId: z.string(),
            role: Role,
        })
        .openapi("AuthRoleChangeRequest", {
            example: { userId: "abc123", role: "STAFF" },
        })
);

// Response schemas
export const AuthJwtResponse = registry.register(
    "AuthJwtResponse",
    z.object({ token: z.string() }).openapi("AuthJwtResponse", {
        example: { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
    })
);

export const AuthRoleView = registry.register(
    "AuthRoleView",
    z
        .object({
            userId: z.string(),
            role: Role,
        })
        .openapi("AuthRoleView", {
            example: { userId: "abc123", role: "STAFF" },
        })
);

export const UserIdsResponse = registry.register(
    "UserIdsResponse",
    z.array(z.string()).openapi("UserIdsResponse", {
        description: "List of user IDs",
        example: ["abc123", "def456"],
    })
);

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
