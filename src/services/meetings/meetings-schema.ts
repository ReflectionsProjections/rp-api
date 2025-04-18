import { Schema } from "mongoose";

import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export const CommitteeNames = z.enum([
    "CONTENT",
    "CORPORATE",
    "DESIGN",
    "DEV",
    "FULL TEAM",
    "MARKETING",
    "OPERATIONS",
]);

export const meetingView = z.object({
    meetingId: z.coerce.string().default(() => uuidv4()),
    committeeType: CommitteeNames,
    startTime: z.coerce.date(),
});
export type Meeting = z.infer<typeof meetingView>;

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

export const createMeetingValidator = z.object({
    committeeType: CommitteeNames,
    startTime: z.coerce.date(),
});

export const updateMeetingValidator = createMeetingValidator.partial();
