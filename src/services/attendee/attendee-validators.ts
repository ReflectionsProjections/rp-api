import { z } from "zod";
import { Tiers } from "./attendee-schema";

// Zod schema for attendee
export const AttendeeCreateValidator = z.object({
    userId: z.string(),
    tags: z.array(z.string()),
});

export const AttendeeRedeemMerchValidator = z.object({
    userId: z.string(),
    tier: Tiers,
});

export const EventIdValidator = z.object({
    eventId: z.string().uuid(),
});
