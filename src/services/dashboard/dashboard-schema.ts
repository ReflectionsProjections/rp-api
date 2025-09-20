import { z } from "zod";

export const DisplayMetadataSchema = z.object({
    screenWidth: z.number(),
    screenHeight: z.number(),
    devicePixelRatio: z.number(),
    userAgent: z.string(),
    platform: z.string(),
    unixTime: z.number(),
});
export type DisplayMetadata = z.infer<typeof DisplayMetadataSchema>;

export const DisplayId = z.coerce.number();

export const DisplaySchema = z.object({
    id: DisplayId,
    metadata: DisplayMetadataSchema.optional(),
    lastUpdate: z.number(),
});
export type Display = z.infer<typeof DisplaySchema>;

export const DashboardMessageValidator = z.union([
    z.object({
        message: z.string(),
    }),
    z.object({
        url: z.string(),
        fullscreen: z.boolean().optional(),
        iframe: z.boolean().optional(),
    }),
]);
export type DashboardMessage = z.infer<typeof DashboardMessageValidator>;
