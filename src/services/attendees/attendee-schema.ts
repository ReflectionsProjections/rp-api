import mongoose from "mongoose";
import { z } from "zod";

// Zod schema for attendee
const AttendeeValidator = z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    events: z.array(z.string()).default([]),
    dietaryRestrictions: z.string().array(),
    allergies: z.string().array(),
    hasCheckedIn: z.boolean().default(false),
    points: z.number().min(0).default(0),
    foodWave: z.number().int().min(0).default(0),
    hasPriority: z.object({
        dayOne: z.boolean().default(false),
        dayTwo: z.boolean().default(false),
        dayThree: z.boolean().default(false),
        dayFour: z.boolean().default(false),
        dayFive: z.boolean().default(false),
    }).default({
        dayOne: false,
        dayTwo: false,
        dayThree: false,
        dayFour: false,
        dayFive: false,
    })
});

// Mongoose schema for attendee
const AttendeeSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    dietaryRestrictions: { type: [String], required: true },
    allergies: { type: [String], required: true },
    hasCheckedIn: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
    foodWave: { type: Number, default: 0 },
    hasPriority: {
        type: new mongoose.Schema(
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

export { AttendeeSchema, AttendeeValidator };
