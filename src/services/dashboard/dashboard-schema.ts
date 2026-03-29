import { z } from "zod";
import { registry } from "../../middleware/openapi-registry";

export const DisplayMetadataSchema = registry.register(
    "DisplayMetadataSchema",
    z
        .object({
            screenWidth: z.number(),
            screenHeight: z.number(),
            devicePixelRatio: z.number(),
            userAgent: z.string(),
            platform: z.string(),
            unixTime: z.number(),
        })
        .openapi("DisplayMetadataSchema", {
            example: {
                screenWidth: 1920,
                screenHeight: 1080,
                devicePixelRatio: 2,
                userAgent: "Mozilla/5.0...",
                platform: "MacIntel",
                unixTime: 1711483200000,
            },
        })
);
export type DisplayMetadata = z.infer<typeof DisplayMetadataSchema>;

export const DisplayId = z.coerce.number();

export const DisplaySchema = registry.register(
    "DisplaySchema",
    z
        .object({
            id: DisplayId,
            metadata: DisplayMetadataSchema.optional(),
            lastUpdate: z.number(),
        })
        .openapi("DisplaySchema", {
            example: {
                id: 0,
                lastUpdate: 1711483200000,
                metadata: {
                    screenWidth: 1920,
                    screenHeight: 1080,
                    devicePixelRatio: 2,
                    userAgent: "Mozilla/5.0...",
                    platform: "MacIntel",
                    unixTime: 1711483200000,
                },
            },
        })
);
export type Display = z.infer<typeof DisplaySchema>;

export const DashboardMessageValidator = registry.register(
    "DashboardMessageValidator",
    z
        .union([
            z.object({
                message: z.string(),
            }),
            z.object({
                url: z.string(),
                fullscreen: z.boolean().optional(),
                iframe: z.boolean().optional(),
            }),
        ])
        .openapi("DashboardMessageValidator", {
            description:
                "Either a text message or a URL to display on the dashboard.",
            example: { message: "Welcome to R|P 2025!" },
        })
);
export type DashboardMessage = z.infer<typeof DashboardMessageValidator>;

export const DashboardSentToResponse = registry.register(
    "DashboardSentToResponse",
    z
        .object({
            sentTo: z.array(z.number()),
        })
        .openapi("DashboardSentToResponse", {
            example: { sentTo: [0, 1, 2] },
        })
);
