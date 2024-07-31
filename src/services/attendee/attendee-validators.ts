import { z } from "zod";

// Zod schema for attendee
export const AttendeeCreateValidator = z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    dietaryRestrictions: z.string().array(),
    allergies: z.string().array(),
});

export const EventIdValidator = z.object({
    eventId: z.string().uuid(),
});
