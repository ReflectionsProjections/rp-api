import { Schema } from "mongoose";
import { z } from "zod";

// Zod schema for attendee
export const AttendeeValidator = z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    dietaryRestrictions: z.string().array(),
    points: z.number().min(0).default(0),
});

// Mongoose schema for attendee
export const AttendeeSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    dietaryRestrictions: [{ type: String, required: true }],
    points: { type: Number, default: 0 },
});

export const AttendeesAttendanceSchema = new Schema({
    userId: {
        type: String,
        ref: "Attendee",
        required: true,
    },
    eventsAttended: [{ type: String, ref: "Event", required: true }],
});

export const AttendeesAttendanceValidator = z.object({
    userId: z.string(),
    eventsAttended: z.array(z.string()),
});
