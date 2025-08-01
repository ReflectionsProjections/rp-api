import { z } from "zod";

export type AttendeeType = z.infer<typeof AttendeeCreateValidator>;

// Zod schema for attendee
export const AttendeeCreateValidator = z.object({
    userId: z.string(),
});

export const EventIdValidator = z.object({
    eventId: z.string().uuid(),
});
