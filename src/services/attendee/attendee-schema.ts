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
    hasResume: z.boolean(),
    hasPriority: z
        .object({
            Mon: z.boolean().default(false),
            Tue: z.boolean().default(false),
            Wed: z.boolean().default(false),
            Thu: z.boolean().default(false),
            Fri: z.boolean().default(false),
            Sat: z.boolean().default(false),
            Sun: z.boolean().default(false),
        })
        .default({
            Mon: false,
            Tue: false,
            Wed: false,
            Thu: false,
            Fri: false,
            Sat: false,
            Sun: false,
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
    hasResume: { type: Boolean, default: false },
    hasPriority: {
        type: new Schema(
            {
                Mon: { type: Boolean, default: false },
                Tue: { type: Boolean, default: false },
                Wed: { type: Boolean, default: false },
                Thu: { type: Boolean, default: false },
                Fri: { type: Boolean, default: false },
                Sat: { type: Boolean, default: false },
                Sun: { type: Boolean, default: false },
            },
            { _id: false }
        ),
        default: {
            Mon: false,
            Tue: false,
            Wed: false,
            Thu: false,
            Fri: false,
            Sat: false,
            Sun: false,
        },
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
export const PartialAttendeeValidator = AttendeeValidator.partial();

export const AttendeeFilterValidator = z.object({
    in: PartialAttendeeValidator,
    out: z.map(PartialAttendeeValidator.keyof(), z.number().min(0).max(1))
});
