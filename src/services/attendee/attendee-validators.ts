import { z } from "zod";
import { IconColorType } from "../../database";

// Zod schema for attendee
export const AttendeeCreateValidator = z.object({
    userId: z.string(),
    tags: z.array(z.string()),
});

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

export const AttendeeIconUpdateValidator = z.object({
    icon: z.enum(IconColorEnumValues),
});

export const AttendeeTagsUpdateValidator = z.object({
    tags: z.array(z.string()),
});
