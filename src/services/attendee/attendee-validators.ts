import { z } from "zod";

export type AttendeeType = z.infer<typeof AttendeeCreateValidator>;

// Zod schema for attendee
export const AttendeeCreateValidator = z.object({
    user_id: z.string(),
    // name: z.string(),
    // email: z.string().email(),
    // dietaryRestrictions: z.string().array(),
    // allergies: z.string().array(),
});

export const EventIdValidator = z.object({
    event_id: z.string().uuid(),
});
