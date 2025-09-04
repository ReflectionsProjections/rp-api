import { z } from "zod";
import { IconColorTypes } from "../../database";

// Zod schema for attendee
export const AttendeeCreateValidator = z.object({
    userId: z.string(),
    tags: z.array(z.string()),
});

export const EventIdValidator = z.object({
    eventId: z.string().uuid(),
});

export const AttendeeIconUpdateValidator = z.object({
    icon: z.enum(Object.values(IconColorTypes) as [string, ...string[]]),
});

export const AttendeeTagsUpdateValidator = z.object({
    tags: z.array(z.string()),
});
