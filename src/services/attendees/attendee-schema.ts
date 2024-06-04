import { Schema } from "mongoose";
import { z } from "zod";

// Zod schema for attendee
export const AttendeeValidator = z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    dietary_restrictions: z.string(),
    priority_expiry: z.date().nullable().optional(),
    points: z.number().min(0).default(0),
});

// Mongoose schema for attendee
export const AttendeeSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    dietary_restrictions: { type: String, required: true },
    priority_expiry: { type: Date, default: null },
    points: { type: Number, default: 0 },
});

export const AttendeesAttendanceSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "Attendee",
        required: true,
    },
    eventsAttended: [
        { type: Schema.Types.ObjectId, ref: "Event", required: true },
    ],
});

export const AttendeesAttendanceValidator = z.object({
    userId: z.string(),
    eventsAttended: z.array(z.string()),
});
