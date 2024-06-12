import mongoose from "mongoose";
import { z } from "zod";

// Zod schema for attendee
const AttendeeValidator = z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    events: z.array(z.string()),
    dietaryRestrictions: z.string().array(),
    allergies: z.string().array(),
    hasCheckedIn: z.boolean().default(false),
    points: z.number().min(0).default(0),
    foodWave: z.number().int().min(0).default(0),
    hasPriority: z.object({
        dayOne: z.boolean(),
        dayTwo: z.boolean(),
        dayThree: z.boolean(),
        dayFour: z.boolean(),
        dayFive: z.boolean(),
    }),
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
