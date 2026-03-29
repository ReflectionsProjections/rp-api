import { z } from "zod";
import { registry } from "../../middleware/openapi-registry";

export const StatsCountResponse = registry.register(
    "StatsCountResponse",
    z
        .object({ count: z.number().int().min(0) })
        .openapi("StatsCountResponse", { example: { count: 42 } })
);

export const StatsAttendanceCountsResponse = registry.register(
    "StatsAttendanceCountsResponse",
    z
        .object({ attendanceCounts: z.array(z.number().int().min(0)) })
        .openapi("StatsAttendanceCountsResponse", {
            example: { attendanceCounts: [120, 95, 110] },
        })
);

export const StatsDietaryRestrictionsResponse = registry.register(
    "StatsDietaryRestrictionsResponse",
    z
        .object({
            none: z.number().int().min(0),
            dietaryRestrictions: z.number().int().min(0),
            allergies: z.number().int().min(0),
            both: z.number().int().min(0),
            allergyCounts: z.record(z.number().int().min(0)),
            dietaryRestrictionCounts: z.record(z.number().int().min(0)),
        })
        .openapi("StatsDietaryRestrictionsResponse", {
            example: {
                none: 200,
                dietaryRestrictions: 30,
                allergies: 15,
                both: 5,
                allergyCounts: { Peanuts: 10, Shellfish: 5 },
                dietaryRestrictionCounts: { Vegetarian: 20, Vegan: 10 },
            },
        })
);

export const StatsTierCountsResponse = registry.register(
    "StatsTierCountsResponse",
    z
        .object({
            TIER1: z.number().int().min(0),
            TIER2: z.number().int().min(0),
            TIER3: z.number().int().min(0),
            TIER4: z.number().int().min(0),
        })
        .openapi("StatsTierCountsResponse", {
            example: { TIER1: 150, TIER2: 80, TIER3: 30, TIER4: 5 },
        })
);

export const StatsTagCountsResponse = registry.register(
    "StatsTagCountsResponse",
    z
        .record(z.number().int().min(0))
        .openapi("StatsTagCountsResponse", {
            description:
                "Map of tag name to the number of attendees who selected it.",
            example: { AI: 85, Cybersecurity: 40, Networking: 60 },
        })
);

export const StatsEventAttendanceResponse = registry.register(
    "StatsEventAttendanceResponse",
    z
        .object({ attendanceCount: z.number().int().min(0) })
        .openapi("StatsEventAttendanceResponse", {
            example: { attendanceCount: 73 },
        })
);
