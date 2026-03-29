import { z } from "zod";
import { IconColorType } from "../../database";
import { Tiers } from "./attendee-schema";
import { registry } from "../../middleware/openapi-registry";

// Zod schema for attendee
export const AttendeeCreateValidator = z.object({
    userId: z.string(),
    tags: z.array(z.string()),
});

export const AttendeeRedeemMerchValidator = registry.register(
    "AttendeeRedeemMerchValidator",
    z
        .object({
            userId: z.string(),
            tier: Tiers,
        })
        .openapi("AttendeeRedeemMerchValidator", {
            example: { userId: "abc123", tier: "TIER1" },
        })
);

export const EventIdValidator = z.object({
    eventId: z.string().uuid(),
});

const IconColorEnumValues: [IconColorType, ...IconColorType[]] = [
    "BLUE",
    "RED",
    "GREEN",
    "PINK",
    "PURPLE",
    "ORANGE",
];

export const AttendeeIconUpdateValidator = registry.register(
    "AttendeeIconUpdateValidator",
    z
        .object({
            icon: z.enum(IconColorEnumValues),
        })
        .openapi("AttendeeIconUpdateValidator", {
            example: { icon: "BLUE" },
        })
);

export const AttendeeTagsUpdateValidator = registry.register(
    "AttendeeTagsUpdateValidator",
    z
        .object({
            tags: z.array(z.string()),
        })
        .openapi("AttendeeTagsUpdateValidator", {
            example: { tags: ["AI", "Systems"] },
        })
);

export const AttendeePointsUpdateValidator = registry.register(
    "AttendeePointsUpdateValidator",
    z
        .object({
            userId: z.string(),
            pointsToAdd: z.number().int().min(1),
        })
        .openapi("AttendeePointsUpdateValidator", {
            example: { userId: "abc123", pointsToAdd: 10 },
        })
);

// Response schemas

export const AttendeeFavoritesView = registry.register(
    "AttendeeFavoritesView",
    z
        .object({
            userId: z.string(),
            favoriteEvents: z.array(z.string()),
        })
        .openapi("AttendeeFavoritesView", {
            example: {
                userId: "abc123",
                favoriteEvents: ["3a72d491-c2f9-4baf-af5a-55713621d978"],
            },
        })
);

export const AttendeeFavoritesUpdateResponse = registry.register(
    "AttendeeFavoritesUpdateResponse",
    z
        .object({
            favorites: z.array(z.string()),
        })
        .openapi("AttendeeFavoritesUpdateResponse", {
            example: { favorites: ["3a72d491-c2f9-4baf-af5a-55713621d978"] },
        })
);

export const AttendeeQrResponse = registry.register(
    "AttendeeQrResponse",
    z
        .object({
            qrCode: z.string(),
        })
        .openapi("AttendeeQrResponse", {
            example: { qrCode: "abc123:1711483200" },
        })
);

export const AttendeePointsResponse = registry.register(
    "AttendeePointsResponse",
    z
        .object({
            points: z.number(),
        })
        .openapi("AttendeePointsResponse", { example: { points: 42 } })
);

export const AttendeeFoodwaveResponse = registry.register(
    "AttendeeFoodwaveResponse",
    z
        .object({
            foodwave: z.number().int().min(1).max(2),
        })
        .openapi("AttendeeFoodwaveResponse", { example: { foodwave: 1 } })
);

export const AttendeeEmailEntry = registry.register(
    "AttendeeEmailEntry",
    z
        .object({
            email: z.string(),
            userId: z.string(),
            name: z.string(),
        })
        .openapi("AttendeeEmailEntry", {
            example: {
                email: "jane@example.com",
                userId: "abc123",
                name: "Jane Doe",
            },
        })
);

export const AttendeeRedeemableView = registry.register(
    "AttendeeRedeemableView",
    z
        .object({
            userId: z.string(),
            currentTier: Tiers,
            redeemedTiers: z.array(Tiers),
            redeemableTiers: z.array(Tiers),
        })
        .openapi("AttendeeRedeemableView", {
            example: {
                userId: "abc123",
                currentTier: "TIER2",
                redeemedTiers: ["TIER1"],
                redeemableTiers: ["TIER2"],
            },
        })
);

export const AttendeeRedeemResponse = registry.register(
    "AttendeeRedeemResponse",
    z
        .object({
            message: z.string(),
            userId: z.string(),
            tier: Tiers,
        })
        .openapi("AttendeeRedeemResponse", {
            example: {
                message: "Tier redeemed successfully!",
                userId: "abc123",
                tier: "TIER1",
            },
        })
);

export const AttendeeIconResponse = registry.register(
    "AttendeeIconResponse",
    z
        .object({
            icon: z.enum(IconColorEnumValues),
        })
        .openapi("AttendeeIconResponse", { example: { icon: "BLUE" } })
);

export const AttendeeTagsResponse = registry.register(
    "AttendeeTagsResponse",
    z
        .object({
            tags: z.array(z.string()),
        })
        .openapi("AttendeeTagsResponse", {
            example: { tags: ["AI", "Systems"] },
        })
);
