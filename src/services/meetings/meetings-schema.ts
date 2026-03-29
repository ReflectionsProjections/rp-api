import { Schema } from "mongoose";
import { Database } from "../../database.types";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { registry } from "../../middleware/openapi-registry";

export const CommitteeNames = registry.register(
    "CommitteeNames",
    z
        .enum([
            "CONTENT",
            "CORPORATE",
            "DESIGN",
            "DEV",
            "FULL TEAM",
            "MARKETING",
            "OPERATIONS",
        ])
        .openapi("CommitteeNames", { description: "R|P committee name" })
); // would it be better to import the committee names from Supabase itself (similar to RoleTypes)

export const meetingView = registry.register(
    "MeetingView",
    z
        .object({
            meetingId: z.coerce.string().default(() => uuidv4()),
            committeeType: CommitteeNames,
            startTime: z.coerce.date().openapi({ format: "date-time" }),
        })
        .openapi("MeetingView", {
            example: {
                meetingId: "3a72d491-c2f9-4baf-af5a-55713621d978",
                committeeType: "DEV",
                startTime: new Date("2025-04-01T18:00:00Z"),
            },
        })
);
export type Meeting = z.infer<typeof meetingView>;

// TODO: phase out meeting schema
export const MeetingSchema = new Schema({
    meetingId: {
        type: String,
        required: true,
        unique: true,
        default: () => uuidv4(),
    },
    committeeType: {
        type: String,
        required: true,
        enum: CommitteeNames.Values,
    },
    startTime: {
        type: Date,
        required: true,
    },
});

export type MeetingType = Database["public"]["Tables"]["meetings"]["Row"];

export const createMeetingValidator = registry.register(
    "CreateMeetingValidator",
    z
        .object({
            committeeType: CommitteeNames,
            startTime: z.coerce.date().openapi({ format: "date-time" }),
        })
        .openapi("CreateMeetingValidator", {
            example: {
                committeeType: "DEV",
                startTime: new Date("2025-04-01T18:00:00Z"),
            },
        })
);

export const updateMeetingValidator = registry.register(
    "UpdateMeetingValidator",
    createMeetingValidator
        .partial()
        .openapi("UpdateMeetingValidator", {
            example: { startTime: new Date("2025-04-02T18:00:00Z") },
        })
);
