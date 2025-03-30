import { Schema } from "mongoose";

import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export const CommitteeNames = z.enum([
    "CONTENT",
    "CORPORATE",
    "DESIGN",
    "DEV",
    "MARKETING",
    "OPERATIONS",
]);

export const meetingView = z.object({
    meetingId: z.coerce.string().default(() => uuidv4()),
    committeeType: CommitteeNames,
    startTime: z.coerce.date(),
});

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

export const meetingValidator = z.object({
    meetingId: z.string().uuid(), 
    committeeType: CommitteeNames, 
    startTime: z.coerce.date(),
});
