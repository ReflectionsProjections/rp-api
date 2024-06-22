import { Schema } from "mongoose";
import { z } from "zod";

// Zod schema for attendee
export const AttendeeValidator = z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    events: z.array(z.string()),
    dietaryRestrictions: z.string().array(),
    allergies: z.string().array(),
    hasCheckedIn: z.boolean().default(false),
    points: z.number().min(0).default(0),
    hasPriority: z.object({
        dayOne: z.boolean(),
        dayTwo: z.boolean(),
        dayThree: z.boolean(),
        dayFour: z.boolean(),
        dayFive: z.boolean(),
    }),
});

// Mongoose schema for attendee
export const AttendeeSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    events: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    dietaryRestrictions: { type: [String], required: true },
    allergies: { type: [String], required: true },
    hasCheckedIn: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
    hasPriority: {
        type: new Schema(
            {
                dayOne: { type: Boolean, default: false },
                dayTwo: { type: Boolean, default: false },
                dayThree: { type: Boolean, default: false },
                dayFour: { type: Boolean, default: false },
                dayFive: { type: Boolean, default: false },
            },
            { _id: false }
        ),
        default: () => ({}),
    },
});

export const AttendeeAttendanceSchema = new Schema({
    userId: {
        type: String,
        ref: "Attendee",
        required: true,
    },
    eventsAttended: [{ type: String, ref: "Event", required: true }],
});

export const AttendeeAttendanceValidator = z.object({
    userId: z.string(),
    eventsAttended: z.array(z.string()),
});
