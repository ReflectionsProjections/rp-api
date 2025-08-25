import { z } from "zod";

// Zod schema for attendee
export const AttendeeCreateValidator = z.object({
    userId: z.string(),
    tags: z.array(z.string()),
});

export const EventIdValidator = z.object({
    eventId: z.string().uuid(),
});
