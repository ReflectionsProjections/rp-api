import { Schema } from "mongoose";
import { z } from "zod";

// Zod schema for attendee
export const AttendeeValidator = z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    events: z.array(z.string()).default([]),
    dietaryRestrictions: z.string().array(),
    allergies: z.string().array(),
    hasCheckedIn: z.boolean().default(false),
    points: z.number().min(0).default(0),
    foodWave: z.number().int().min(0).default(0),
    hasPriority: z
        .object({
            dayOne: z.boolean().default(false),
            dayTwo: z.boolean().default(false),
            dayThree: z.boolean().default(false),
            dayFour: z.boolean().default(false),
            dayFive: z.boolean().default(false),
        })
        .default({
            dayOne: false,
            dayTwo: false,
            dayThree: false,
            dayFour: false,
            dayFive: false,
        }),
});

// Mongoose schema for attendee
export const AttendeeSchema = new Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    events: [{ type: String, ref: "Event", default: [] }],
    dietaryRestrictions: { type: [String], required: true },
    allergies: { type: [String], required: true },
    hasCheckedIn: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
    foodWave: { type: Number, default: 0 },
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
    favorites: [{ type: String }],
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

export const EventIdValidator = z.object({
    eventId: z.string().uuid(),
});

// Partial schema for attendee filter
export const PartialAttendeeFilter = AttendeeValidator.partial();
